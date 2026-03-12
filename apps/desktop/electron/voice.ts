/**
 * Voice System for Desktop App
 * Handles PTT (Push-to-Talk), audio recording, transcription, and TTS playback
 */

import { BrowserWindow } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import HID from 'node-hid';
import Store from 'electron-store';

// We'll use the Web Audio API via the renderer process for recording
// node-hid for background joystick input (works without window focus)
// uiohook-napi for global keyboard detection

interface VoiceConfig {
  pttType: 'disabled' | 'keyboard' | 'joystick';
  pttKey: string;
  joystickId: number;
  joystickButton: number;
  crewRole: 'engineer' | 'spotter';
  serverUrl: string;
}

function normalizePttType(value: unknown): 'disabled' | 'keyboard' | 'joystick' {
  if (value === 'joystick') return 'joystick';
  if (value === 'keyboard') return 'keyboard';
  return 'disabled';
}

function normalizeLiveCrewRole(value: unknown): 'engineer' | 'spotter' {
  return value === 'spotter' ? 'spotter' : 'engineer';
}

interface VoiceMessage {
  text: string;
  type: 'sent' | 'received';
}

export type VoiceStatusState = 'starting' | 'ready' | 'fallback' | 'listening' | 'processing' | 'error';

export class VoiceSystem {
  private config: VoiceConfig;
  private mainWindow: BrowserWindow | null = null;
  private recording = false;
  private audioChunks: Buffer[] = [];
  private pttPressed = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private joystick: any = null;
  private hidDevice: HID.HID | null = null;
  private hidButtonState = false;
  private uiohookStarted = false;
  private hidCalibrationStore = new Store({ name: 'okboxbox-hid-calibration' });
  private socket: any = null;
  private sessionId: string | null = null;
  private telemetryContext: any = {};
  private iracingConnected = false;
  private keyboardKeyDownHandler: ((event: { keycode: number }) => void) | null = null;
  private keyboardKeyUpHandler: ((event: { keycode: number }) => void) | null = null;
  private statusState: VoiceStatusState = 'starting';
  private statusDetail = 'Starting';

  private readonly hidCalibrationVersion = 2;

  getStatus() {
    return {
      state: this.statusState,
      detail: this.statusDetail,
    };
  }

  private setStatus(state: VoiceStatusState, detail: string) {
    this.statusState = state;
    this.statusDetail = detail;
    this.mainWindow?.webContents.send('voice:status', { state, detail });
  }

  private setPttFallbackMode(enabled: boolean) {
    this.mainWindow?.webContents.send('voice:pttFallbackMode', enabled);
    this.setStatus(enabled ? 'fallback' : 'ready', enabled ? 'Focused window fallback' : 'Voice ready');
  }

  private readonly handleVoiceResponse = (data: { success: boolean; role?: string; query?: string; response?: string; audioBase64?: string; error?: string }) => {
    if (!data.success) {
      console.error('Voice response error:', data.error);
      this.setStatus('error', data.error || 'Voice error');
      this.sendToRenderer({ text: `Error: ${data.error || 'Unknown error'}`, type: 'received' });
      return;
    }

    this.setStatus(this.statusState === 'fallback' ? 'fallback' : 'ready', data.audioBase64 ? 'Response received with audio' : 'Response received');

    if (data.response) {
      const roleLabel = data.role && data.role !== 'engineer'
        ? `[${data.role}] `
        : '';
      this.sendToRenderer({ text: `${roleLabel}${data.response}`, type: 'received' });
    }

    if (data.audioBase64) {
      this.playAudioBase64(data.audioBase64);
    }
  };

  private readonly handleVoiceProactive = (data: { text: string; audio?: string; role: string }) => {
    if (!this.iracingConnected || !this.sessionId) {
      return;
    }

    this.sendToRenderer({ text: `[${data.role}] ${data.text}`, type: 'received' });

    if (data.audio) {
      this.playAudioBase64(data.audio);
    }
  };

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      pttType: normalizePttType(config.pttType),
      pttKey: config.pttKey || 'Space',
      joystickId: config.joystickId || 0,
      joystickButton: config.joystickButton || 0,
      crewRole: normalizeLiveCrewRole(config.crewRole),
      serverUrl: config.serverUrl || 'https://app.okboxbox.com',
    };
  }

  setWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  setSocket(socket: any) {
    if (this.socket) {
      this.socket.off('voice:response', this.handleVoiceResponse);
      this.socket.off('voice:proactive', this.handleVoiceProactive);
    }
    this.socket = socket;
    this.setupSocketListeners();
  }

  setSessionId(id: string) {
    this.sessionId = id;
  }

  setIRacingConnected(connected: boolean) {
    this.iracingConnected = connected;
    if (!connected) {
      this.sessionId = null;
      this.stopAudioPlayback();
    }
  }

  updateTelemetry(data: any) {
    this.telemetryContext = data;
  }

  updateConfig(settings: Partial<VoiceConfig>) {
    const oldConfig = { ...this.config };
    
    if (settings.pttType !== undefined) this.config.pttType = normalizePttType(settings.pttType);
    if (settings.pttKey) this.config.pttKey = settings.pttKey;
    if (settings.joystickId !== undefined) this.config.joystickId = settings.joystickId;
    if (settings.joystickButton !== undefined) this.config.joystickButton = settings.joystickButton;
    if (settings.crewRole) this.config.crewRole = normalizeLiveCrewRole(settings.crewRole);
    console.log('🎙️ Voice config updated:', this.config);
    
    const shouldReinitializePtt =
      this.config.pttType !== oldConfig.pttType ||
      this.config.pttKey !== oldConfig.pttKey ||
      this.config.joystickId !== oldConfig.joystickId ||
      this.config.joystickButton !== oldConfig.joystickButton;

    if (shouldReinitializePtt) {
      this.teardownPTT();

      if (this.config.pttType === 'keyboard') {
        this.initKeyboardPTT();
      } else if (this.config.pttType === 'joystick') {
        void this.initJoystick();
      } else {
        this.setStatus('ready', 'Voice ready (PTT disabled)');
      }
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.off('voice:response', this.handleVoiceResponse);
    this.socket.off('voice:proactive', this.handleVoiceProactive);
    this.socket.on('voice:response', this.handleVoiceResponse);
    this.socket.on('voice:proactive', this.handleVoiceProactive);
  }

  async start() {
    console.log('🎙️ Voice system starting...');
    this.setStatus('starting', 'Initializing voice');
    this.setPttFallbackMode(false);
    
    // Initialize PTT based on type
    if (this.config.pttType === 'keyboard') {
      this.initKeyboardPTT();
    } else if (this.config.pttType === 'joystick') {
      await this.initJoystick();
    } else {
      this.setStatus('ready', 'Voice ready (PTT disabled)');
    }

    if (this.statusState === 'starting') {
      this.setStatus('ready', 'Voice ready');
    }
    console.log(`✅ Voice system ready (PTT: ${this.config.pttType})`);
  }

  stop() {
    this.teardownPTT();
    console.log('🎙️ Voice system stopped');
  }

  private teardownPTT() {
    this.setPttFallbackMode(false);
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.hidDevice) {
      try {
        this.hidDevice.close();
      } catch (e) { /* ignore */ }
      this.hidDevice = null;
    }
    if (this.keyboardKeyDownHandler) {
      uIOhook.off('keydown', this.keyboardKeyDownHandler);
      this.keyboardKeyDownHandler = null;
    }
    if (this.keyboardKeyUpHandler) {
      uIOhook.off('keyup', this.keyboardKeyUpHandler);
      this.keyboardKeyUpHandler = null;
    }
    if (this.uiohookStarted) {
      uIOhook.stop();
      this.uiohookStarted = false;
    }
  }

  private async initJoystick() {
    // Use node-hid for background joystick detection (works without window focus)
    console.log(`🎮 Initializing HID joystick PTT: Device ${this.config.joystickId}, Button ${this.config.joystickButton}`);
    this.setPttFallbackMode(false);
    
    try {
      const devices = HID.devices();
      
      // Find gaming devices - look for joysticks, gamepads, and wheels
      // UsagePage 1 = Generic Desktop, Usage 4 = Joystick, Usage 5 = Gamepad
      const gamepads = devices.filter(d => 
        d.usagePage === 1 && (d.usage === 4 || d.usage === 5 || d.usage === 8)
      );
      
      // Also look for SIMAGIC specifically by vendor ID
      const simagicDevices = devices.filter(d => 
        d.vendorId === 1155 || // SIMAGIC vendor ID
        (d.product && d.product.toLowerCase().includes('simagic'))
      );
      
      const allGamepads = [...new Map([...gamepads, ...simagicDevices].map(d => [d.path, d])).values()];
      
      console.log(`🎮 Found ${allGamepads.length} HID gamepad(s):`);
      allGamepads.forEach((gp, i) => {
        console.log(`   ${i}: ${gp.product || 'Unknown'} (VID:${gp.vendorId} PID:${gp.productId} Usage:${gp.usage})`);
      });
      
      if (allGamepads.length > this.config.joystickId) {
        const target = allGamepads[this.config.joystickId];
        console.log(`🎮 Opening HID device: ${target.product}`);
        
        try {
          this.hidDevice = new HID.HID(target.path!);
          this.startHIDButtonDetection({ vendorId: target.vendorId, productId: target.productId });
        } catch (openErr) {
          console.error(`🎮 Failed to open HID device: ${openErr}`);
          console.log('🎮 Falling back to renderer Gamepad API (requires window focus)');
          this.setPttFallbackMode(true);
          this.sendToRenderer({ text: 'Wheel PTT fallback enabled — keep the app focused while using the button.', type: 'received' });
        }
      } else {
        console.log('🎮 No HID gamepad found, using renderer Gamepad API (requires window focus)');
        this.setPttFallbackMode(true);
        this.sendToRenderer({ text: 'No HID wheel detected. Using focused window fallback for wheel PTT.', type: 'received' });
      }
    } catch (err) {
      console.error('🎮 HID enumeration error:', err);
      this.setPttFallbackMode(true);
      this.sendToRenderer({ text: 'Wheel HID detection failed. Using focused window fallback for wheel PTT.', type: 'received' });
    }
  }

  private startHIDButtonDetection(deviceInfo: { vendorId: number; productId: number }) {
    if (!this.hidDevice) return;

    // ══════════════════════════════════════════════════════════════
    // Sustained-hold calibration — the correct approach.
    //
    // WHY the old approach failed:
    //   Raw HID reports mix axes + buttons in the same bytes.
    //   SIMAGIC FFB noise flips axis bits hundreds of times/sec.
    //   Watching for "transitions" picks up axis noise as buttons.
    //
    // WHY this works (and how iRacing / Discord do it):
    //   A real button bit is STABLE — consistently 0 when idle,
    //   consistently 1 when held. FFB/axis bits fluctuate in
    //   BOTH states. We find bits that are stable in each state
    //   and flipped between states — those are buttons.
    // ══════════════════════════════════════════════════════════════

    const calKey = `hid-cal-${deviceInfo.vendorId}-${deviceInfo.productId}`;
    const saved = this.hidCalibrationStore.get(calKey) as
      { byteIndex: number; bitMask: number; version: number } | undefined;

    // ── State ───────────────────────────────────────────────────
    let calibrated = false;
    let buttonByteIndex = -1;
    let buttonBitMask   = 0;

    // Detection state (Phase 3)
    const MIN_HOLD_MS      = 200;  // require 200ms sustained press before triggering
    const RELEASE_DELAY_MS = 100;  // require 100ms sustained release before triggering
    let pressStartTime      = 0;   // when the bit first went to 1
    let releaseStartTime    = 0;   // when the bit first went to 0
    let lastRawForHold      = false;

    // Continuous noise watchdog (Phase 3)
    let watchdogFlips       = 0;
    let watchdogWindowStart = Date.now();
    let watchdogLastRaw     = false;
    const WATCHDOG_MAX_FLIPS = 6;   // max 6 flips/sec; real button = max 4 (2 press-release cycles)

    // Calibration phases
    type Phase = 'validate_saved' | 'idle_baseline' | 'wait_for_hold' | 'hold_sampling' | 'active';
    let phase: Phase = saved && saved.version === this.hidCalibrationVersion ? 'validate_saved' : 'idle_baseline';
    let phaseReportCount = 0;
    const PHASE_REPORTS = 200;       // ~2-4 s of data per phase
    const STABILITY_THRESHOLD = 0.97; // 97% consistency = "stable"

    // Per-bit accumulators: count how many reports each bit was 1
    let bitOnCounts: number[] = [];   // flat array: byteIdx*8 + bit → count
    let reportLen = 0;

    if (saved && saved.version === this.hidCalibrationVersion) {
      buttonByteIndex = saved.byteIndex;
      buttonBitMask = saved.bitMask;
      console.log(`🎮 Loaded saved calibration (v2): byte ${saved.byteIndex}, mask 0x${saved.bitMask.toString(16)}`);
      console.log('🎮 Validating saved calibration...');
    } else {
      if (saved) {
        console.log('🎮 Discarding old calibration (pre-v2), will recalibrate');
        this.hidCalibrationStore.delete(calKey);
      }
      console.log(`🎮 Calibrating PTT for VID:${deviceInfo.vendorId} PID:${deviceInfo.productId}`);
      console.log('🎮 Phase 1: DO NOT touch the PTT button — sampling idle baseline...');
      this.sendToRenderer({ text: 'PTT calibration: do NOT press the button yet...', type: 'received' });
    }

    // Hold-detection confirmation (Phase 2a)
    let holdConfirmSet: Set<number> | null = null;  // which stable bits are currently flipped
    let holdConfirmCount = 0;                        // consecutive reports with same bits flipped
    const HOLD_CONFIRM_REPORTS = 30;                 // require 30 consecutive matching reports

    // Stable-bit snapshots from idle phase
    let idleStableBits = new Map<number, boolean>(); // flatIdx → stable value (true=1, false=0)

    const initAccumulators = (len: number) => {
      reportLen = len;
      bitOnCounts = new Array(len * 8).fill(0);
      phaseReportCount = 0;
    };

    const recordReport = (data: Buffer) => {
      for (let i = 0; i < data.length; i++) {
        for (let bit = 0; bit < 8; bit++) {
          if (data[i] & (1 << bit)) {
            bitOnCounts[i * 8 + bit]++;
          }
        }
      }
      phaseReportCount++;
    };

    const getStableBits = (): Map<number, boolean> => {
      const result = new Map<number, boolean>();
      const hiThresh = PHASE_REPORTS * STABILITY_THRESHOLD;
      const loThresh = PHASE_REPORTS * (1 - STABILITY_THRESHOLD);
      for (let idx = 0; idx < bitOnCounts.length; idx++) {
        if (bitOnCounts[idx] >= hiThresh) {
          result.set(idx, true);  // stably 1
        } else if (bitOnCounts[idx] <= loThresh) {
          result.set(idx, false); // stably 0
        }
        // else: unstable (FFB/axis noise) — excluded
      }
      return result;
    };

    const flatIdx = (byteIdx: number, bit: number) => byteIdx * 8 + bit;
    const fromFlatIdx = (idx: number) => ({ byteIdx: Math.floor(idx / 8), bit: idx % 8 });

    const activateButton = (byteIdx: number, mask: number) => {
      buttonByteIndex = byteIdx;
      buttonBitMask = mask;
      calibrated = true;
      phase = 'active';
      this.setPttFallbackMode(false);
      lastRawForHold = false;
      pressStartTime = 0;
      releaseStartTime = 0;
      this.hidButtonState = false;
      this.hidCalibrationStore.set(calKey, { byteIndex: byteIdx, bitMask: mask, version: this.hidCalibrationVersion });
      console.log(`🎮 ✅ PTT ACTIVE — byte ${byteIdx}, mask 0x${mask.toString(16)}`);
      this.sendToRenderer({ text: 'Wheel PTT ready!', type: 'received' });
    };

    const startRecalibration = (reason: string) => {
      console.log(`🎮 ${reason} — restarting calibration`);
      calibrated = false;
      buttonByteIndex = -1;
      buttonBitMask = 0;
      this.hidButtonState = false;
      phase = 'idle_baseline';
      phaseReportCount = 0;
      idleStableBits.clear();
      console.log('🎮 Phase 1: DO NOT touch the PTT button — sampling idle baseline...');
      this.sendToRenderer({ text: 'PTT recalibrating: do NOT press the button yet...', type: 'received' });
    };

    // ── Data handler ─────────────────────────────────────────────
    this.hidDevice.on('data', (data: Buffer) => {

      // ── Validate saved calibration ────────────────────────────
      if (phase === 'validate_saved') {
        if (phaseReportCount === 0) initAccumulators(data.length);
        recordReport(data);

        if (phaseReportCount >= PHASE_REPORTS) {
          // Check if the saved bit is stable during idle
          const hiThresh = PHASE_REPORTS * STABILITY_THRESHOLD;
          const loThresh = PHASE_REPORTS * (1 - STABILITY_THRESHOLD);
          const byteIdx = buttonByteIndex;
          const bitNum = Math.log2(buttonBitMask);
          const count = bitOnCounts[flatIdx(byteIdx, bitNum)];

          if (count <= loThresh) {
            // Bit is stably 0 during idle — good, this is a real button
            console.log(`🎮 Saved calibration validated: bit is stable-0 during idle (${count}/${PHASE_REPORTS} on)`);
            activateButton(byteIdx, buttonBitMask);
          } else if (count >= hiThresh) {
            // Bit is stably 1 during idle — could be inverted button logic, still valid
            console.log(`🎮 Saved calibration validated: bit is stable-1 during idle (${count}/${PHASE_REPORTS} on)`);
            activateButton(byteIdx, buttonBitMask);
          } else {
            // Bit is unstable — this is FFB noise, not a button
            console.warn(`🎮 Saved calibration INVALID: bit is unstable (${count}/${PHASE_REPORTS} on = ${(count / PHASE_REPORTS * 100).toFixed(0)}%) — recalibrating`);
            this.hidCalibrationStore.delete(calKey);
            startRecalibration('Saved calibration failed validation');
          }
        }
        return;
      }

      // ── Phase 1: idle baseline ────────────────────────────────
      if (phase === 'idle_baseline') {
        if (phaseReportCount === 0) initAccumulators(data.length);
        recordReport(data);

        if (phaseReportCount >= PHASE_REPORTS) {
          idleStableBits = getStableBits();
          const totalBits = bitOnCounts.length;
          const stableCount = idleStableBits.size;
          const unstableCount = totalBits - stableCount;
          console.log(`🎮 Idle baseline done: ${stableCount} stable bits, ${unstableCount} noisy/axis bits (of ${totalBits} total)`);

          phase = 'wait_for_hold';
          console.log('🎮 Phase 2: NOW HOLD the PTT button firmly...');
          this.sendToRenderer({ text: 'Now HOLD the PTT button firmly and keep holding...', type: 'received' });
        }
        return;
      }

      // ── Phase 2a: wait for user to start holding ──────────────
      if (phase === 'wait_for_hold') {
        // Find which stable bits are currently different from idle
        const currentlyChanged = new Set<number>();
        for (const [idx, idleVal] of idleStableBits) {
          const { byteIdx, bit } = fromFlatIdx(idx);
          if (byteIdx >= data.length) continue;
          const currentVal = (data[byteIdx] & (1 << bit)) !== 0;
          if (currentVal !== idleVal) currentlyChanged.add(idx);
        }

        if (currentlyChanged.size >= 1) {
          // Check if the SAME bit(s) have been consistently changed
          if (holdConfirmSet === null) {
            holdConfirmSet = currentlyChanged;
            holdConfirmCount = 1;
          } else {
            // Verify same bits are still changed
            let match = holdConfirmSet.size > 0;
            for (const idx of holdConfirmSet) {
              if (!currentlyChanged.has(idx)) { match = false; break; }
            }
            if (match) {
              holdConfirmCount++;
            } else {
              // Different bits changed — reset
              holdConfirmSet = currentlyChanged;
              holdConfirmCount = 1;
            }
          }
        } else {
          // No bits changed — reset confirmation
          holdConfirmSet = null;
          holdConfirmCount = 0;
        }

        // Require 30 consecutive reports with the same bit(s) changed
        if (holdConfirmCount >= HOLD_CONFIRM_REPORTS && holdConfirmSet) {
          console.log(`🎮 Detected ${holdConfirmSet.size} stable bit(s) consistently changed for ${holdConfirmCount} reports — sampling hold state...`);
          holdConfirmSet = null;
          holdConfirmCount = 0;
          phase = 'hold_sampling';
          initAccumulators(data.length);
          recordReport(data);
        }
        return;
      }

      // ── Phase 2b: sample while user holds the button ──────────
      if (phase === 'hold_sampling') {
        recordReport(data);

        if (phaseReportCount >= PHASE_REPORTS) {
          const holdStableBits = getStableBits();
          console.log(`🎮 Hold sampling done: ${holdStableBits.size} stable bits in hold state`);

          // Find bits that: were stable in idle AND stable in hold AND flipped value
          const candidates: { byteIdx: number; bit: number; mask: number; idleVal: boolean }[] = [];

          for (const [idx, idleVal] of idleStableBits) {
            const holdVal = holdStableBits.get(idx);
            if (holdVal !== undefined && holdVal !== idleVal) {
              const { byteIdx, bit } = fromFlatIdx(idx);
              candidates.push({ byteIdx, bit, mask: 1 << bit, idleVal });
            }
          }

          console.log(`🎮 Found ${candidates.length} button candidate(s):`);
          candidates.forEach(c => {
            console.log(`   byte ${c.byteIdx}, bit ${c.bit} (mask 0x${c.mask.toString(16)}): idle=${c.idleVal ? 1 : 0} → hold=${c.idleVal ? 0 : 1}`);
          });

          if (candidates.length === 0) {
            console.warn('🎮 No button candidates found. Make sure you held the button the entire time.');
            this.sendToRenderer({ text: 'No button detected. Let\'s try again — don\'t touch the button yet...', type: 'received' });
            startRecalibration('No candidates found');
          } else if (candidates.length === 1) {
            // Perfect — exactly one bit flipped
            const c = candidates[0];
            console.log(`🎮 Single button found: byte ${c.byteIdx}, mask 0x${c.mask.toString(16)}`);
            activateButton(c.byteIdx, c.mask);
          } else {
            // Multiple candidates — pick the one most likely to be a button
            // Prefer bits that went 0→1 (standard button convention)
            const zeroToOne = candidates.filter(c => !c.idleVal);
            if (zeroToOne.length === 1) {
              const c = zeroToOne[0];
              console.log(`🎮 Picked 0→1 button: byte ${c.byteIdx}, mask 0x${c.mask.toString(16)}`);
              activateButton(c.byteIdx, c.mask);
            } else {
              // Just use the first candidate
              const c = candidates[0];
              console.log(`🎮 Multiple candidates, using first: byte ${c.byteIdx}, mask 0x${c.mask.toString(16)}`);
              activateButton(c.byteIdx, c.mask);
            }
          }
        }
        return;
      }

      // ── Phase 3: active — read button directly ────────────────
      if (phase === 'active' && calibrated) {
        const rawPressed = (data[buttonByteIndex] & buttonBitMask) !== 0;
        const now = Date.now();

        // Continuous noise watchdog: track flip rate
        if (rawPressed !== watchdogLastRaw) {
          watchdogFlips++;
          watchdogLastRaw = rawPressed;
        }
        if (now - watchdogWindowStart >= 1000) {
          if (watchdogFlips > WATCHDOG_MAX_FLIPS) {
            console.warn(`🎮 Noise detected on calibrated bit: ${watchdogFlips} flips/s — recalibrating`);
            this.hidCalibrationStore.delete(calKey);
            if (this.hidButtonState) {
              this.hidButtonState = false;
              this.onPTTStateChange(false);
            }
            startRecalibration('Calibrated bit became noisy during use');
            return;
          }
          watchdogFlips = 0;
          watchdogWindowStart = now;
        }

        // Sustained-hold detection: require continuous pressed/released state
        if (rawPressed) {
          releaseStartTime = 0;  // reset release timer
          if (!lastRawForHold) {
            pressStartTime = now; // bit just went 1
            lastRawForHold = true;
          }
          // Trigger PRESS only after sustained hold
          if (!this.hidButtonState && pressStartTime > 0 && (now - pressStartTime) >= MIN_HOLD_MS) {
            this.hidButtonState = true;
            console.log(`🎮 HID PTT: PRESSED (held ${now - pressStartTime}ms)`);
            this.onPTTStateChange(true);
          }
        } else {
          pressStartTime = 0;  // reset press timer
          if (lastRawForHold) {
            releaseStartTime = now; // bit just went 0
            lastRawForHold = false;
          }
          // Trigger RELEASE only after sustained release
          if (this.hidButtonState && releaseStartTime > 0 && (now - releaseStartTime) >= RELEASE_DELAY_MS) {
            this.hidButtonState = false;
            console.log(`🎮 HID PTT: RELEASED (released ${now - releaseStartTime}ms)`);
            this.onPTTStateChange(false);
          }
        }
      }
    });

    this.hidDevice.on('error', (err: Error) => {
      console.error('🎮 HID error:', err);
      this.setPttFallbackMode(true);
      this.sendToRenderer({ text: 'Wheel HID error. Using focused window fallback for wheel PTT.', type: 'received' });
    });
  }

  private initKeyboardPTT() {
    // Use uiohook for global keyboard detection (works without window focus)
    const keyMap: Record<string, number> = {
      'Space': UiohookKey.Space,
      'F1': UiohookKey.F1,
      'F2': UiohookKey.F2,
      'F3': UiohookKey.F3,
      'F4': UiohookKey.F4,
      'F5': UiohookKey.F5,
      'CapsLock': UiohookKey.CapsLock,
      'Tab': UiohookKey.Tab,
      'Backquote': UiohookKey.Backquote,
    };

    const targetKey = keyMap[this.config.pttKey] || UiohookKey.Space;
    console.log(`🎤 Keyboard PTT: ${this.config.pttKey} (global, works without focus)`);

    this.keyboardKeyDownHandler = (e) => {
      if (e.keycode === targetKey && !this.pttPressed) {
        console.log(`🎤 PTT Key DOWN: ${this.config.pttKey}`);
        this.onPTTStateChange(true);
      }
    };

    this.keyboardKeyUpHandler = (e) => {
      if (e.keycode === targetKey && this.pttPressed) {
        console.log(`🎤 PTT Key UP: ${this.config.pttKey}`);
        this.onPTTStateChange(false);
      }
    };

    uIOhook.on('keydown', this.keyboardKeyDownHandler);
    uIOhook.on('keyup', this.keyboardKeyUpHandler);

    uIOhook.start();
    this.uiohookStarted = true;
    console.log('🎤 Global keyboard hook started');
  }

  private pollPTT() {
    // HID polling is event-driven via startHIDPolling()
    // Renderer gamepad API is backup for when HID doesn't work
  }

  // Called from renderer when PTT state changes
  onPTTStateChange(pressed: boolean) {
    if (pressed && !this.pttPressed) {
      this.stopAudioPlayback();
      if (!this.socket?.connected) {
        return;
      }
      // PTT pressed - start recording
      this.pttPressed = true;
      this.startRecording();
    } else if (!pressed && this.pttPressed) {
      // PTT released - stop recording and process
      this.pttPressed = false;
      this.stopRecording();
    }
  }

  private startRecording() {
    if (this.recording) return;
    this.recording = true;
    console.log('🎤 Recording started...');
    this.setStatus('listening', 'Listening');
    
    // Tell renderer to start capturing audio
    this.mainWindow?.webContents.send('voice:startRecording');
  }

  private stopRecording() {
    if (!this.recording) return;
    this.recording = false;
    console.log('🎤 Recording stopped, processing...');
    this.setStatus('processing', 'Processing voice');
    
    // Tell renderer to stop and send audio
    this.mainWindow?.webContents.send('voice:stopRecording');
  }

  private stopAudioPlayback() {
    this.mainWindow?.webContents.send('voice:stopAudio');
  }

  // Called from renderer with recorded audio
  async processAudio(audioBuffer: Buffer, mimeType: string = 'audio/webm') {
    if (audioBuffer.length < 1000) {
      console.log('Recording too short, ignored');
      return;
    }

    if (!this.socket?.connected) {
      console.error('Not connected to server');
      return;
    }

    try {
      console.log(`🎤 Sending ${audioBuffer.length} bytes to server for processing...`);
      const normalizedMimeType = mimeType.toLowerCase();
      const format = normalizedMimeType.includes('wav')
        ? 'wav'
        : normalizedMimeType.includes('ogg') || normalizedMimeType.includes('oga')
          ? 'ogg'
          : 'webm';

      // Send raw audio to server — server handles STT (Whisper) + AI + TTS (ElevenLabs)
      this.socket.emit('voice:query', {
        audio: audioBuffer.toString('base64'),
        format,
        sessionId: this.sessionId,
        role: this.config.crewRole,
      });

    } catch (err) {
      console.error('Voice processing error:', err);
      this.setStatus('error', err instanceof Error ? err.message : 'Voice processing error');
    }
  }

  private async playAudioBase64(base64Audio: string) {
    // Send to renderer for playback
    this.mainWindow?.webContents.send('voice:playAudio', base64Audio);
  }

  private sendToRenderer(message: VoiceMessage) {
    this.mainWindow?.webContents.send('message', message);
  }
}
