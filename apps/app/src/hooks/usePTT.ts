/**
 * usePTT — Push-to-Talk binding
 *
 * Supports:
 *   - Keyboard keys (any key, e.g. Space, F5, ShiftLeft)
 *   - Gamepad / steering wheel buttons (Gamepad API, polled via rAF)
 *
 * Binding is persisted to localStorage.
 * "Detect" mode captures the next key or button press as the new binding.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyPTTBinding {
  type: 'key';
  key: string;   // KeyboardEvent.code, e.g. 'Space', 'KeyF', 'ShiftLeft'
  label: string; // Human-readable, e.g. 'Space', 'F', 'Left Shift'
}

export interface GamepadPTTBinding {
  type: 'gamepad';
  gamepadIndex: number;
  buttonIndex: number;
  label: string; // e.g. 'Button 7 (Controller 1)'
}

export type PTTBinding = KeyPTTBinding | GamepadPTTBinding;

const PTT_STORAGE_KEY = 'okboxbox_ptt_binding';

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadBinding(): PTTBinding | null {
  try {
    const raw = localStorage.getItem(PTT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PTTBinding) : null;
  } catch {
    return null;
  }
}

function saveBinding(binding: PTTBinding | null): void {
  try {
    if (binding) {
      localStorage.setItem(PTT_STORAGE_KEY, JSON.stringify(binding));
    } else {
      localStorage.removeItem(PTT_STORAGE_KEY);
    }
  } catch {}
}

// ─── Key label helper ─────────────────────────────────────────────────────────

function keyLabel(code: string): string {
  const map: Record<string, string> = {
    Space: 'Space', Enter: 'Enter', Escape: 'Esc',
    ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt', AltRight: 'Right Alt',
    CapsLock: 'Caps Lock', Tab: 'Tab', Backspace: 'Backspace',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
    F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePTTOptions {
  onPress: () => void;
  onRelease: () => void;
  enabled?: boolean;
}

interface UsePTTReturn {
  binding: PTTBinding | null;
  isPressed: boolean;
  isDetecting: boolean;
  startDetect: () => void;
  cancelDetect: () => void;
  clearBinding: () => void;
}

export function usePTT({ onPress, onRelease, enabled = true }: UsePTTOptions): UsePTTReturn {
  const [binding, setBinding] = useState<PTTBinding | null>(loadBinding);
  const [isPressed, setIsPressed] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const isPressedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onPressRef = useRef(onPress);
  const onReleaseRef = useRef(onRelease);
  const bindingRef = useRef(binding);
  const isDetectingRef = useRef(isDetecting);
  const rafRef = useRef<number | null>(null);
  const gamepadPrevRef = useRef<Record<string, boolean>>({});

  // Keep refs fresh so rAF callbacks don't close over stale values
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);
  useEffect(() => { onReleaseRef.current = onRelease; }, [onRelease]);
  useEffect(() => { bindingRef.current = binding; }, [binding]);
  useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);

  // ── Keyboard listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect mode: capture next key as binding
      if (isDetectingRef.current) {
        if (e.code === 'Escape') {
          setIsDetecting(false);
          return;
        }
        // Ignore pure modifier keys as standalone binding
        if (['Meta', 'Alt', 'Control'].includes(e.key)) return;
        const newBinding: KeyPTTBinding = {
          type: 'key',
          key: e.code,
          label: keyLabel(e.code),
        };
        setBinding(newBinding);
        saveBinding(newBinding);
        setIsDetecting(false);
        e.preventDefault();
        return;
      }

      if (!enabledRef.current) return;
      const b = bindingRef.current;
      if (!b || b.type !== 'key' || b.key !== e.code) return;
      if (isPressedRef.current) return; // already held
      isPressedRef.current = true;
      setIsPressed(true);
      onPressRef.current();
      e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const b = bindingRef.current;
      if (!b || b.type !== 'key' || b.key !== e.code) return;
      if (!isPressedRef.current) return;
      isPressedRef.current = false;
      setIsPressed(false);
      onReleaseRef.current();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally using refs

  // ── Gamepad polling via rAF ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator.getGamepads !== 'function') return;

    const poll = () => {
      const gamepads = navigator.getGamepads();

      for (const gp of gamepads) {
        if (!gp) continue;
        const gpKey = `${gp.index}`;

        for (let bi = 0; bi < gp.buttons.length; bi++) {
          const pressed = gp.buttons[bi].pressed;
          const prevKey = `${gpKey}-${bi}`;
          const wasPrev = gamepadPrevRef.current[prevKey] ?? false;

          // Detect mode: any newly pressed button becomes the binding
          if (isDetectingRef.current && pressed && !wasPrev) {
            const newBinding: GamepadPTTBinding = {
              type: 'gamepad',
              gamepadIndex: gp.index,
              buttonIndex: bi,
              label: `Button ${bi} (${gp.id.split('(')[0].trim() || `Controller ${gp.index + 1}`})`,
            };
            setBinding(newBinding);
            saveBinding(newBinding);
            setIsDetecting(false);
            gamepadPrevRef.current[prevKey] = pressed;
            continue;
          }

          if (!enabledRef.current) {
            gamepadPrevRef.current[prevKey] = pressed;
            continue;
          }

          const b = bindingRef.current;
          if (!b || b.type !== 'gamepad' || b.gamepadIndex !== gp.index || b.buttonIndex !== bi) {
            gamepadPrevRef.current[prevKey] = pressed;
            continue;
          }

          if (pressed && !wasPrev) {
            isPressedRef.current = true;
            setIsPressed(true);
            onPressRef.current();
          } else if (!pressed && wasPrev) {
            isPressedRef.current = false;
            setIsPressed(false);
            onReleaseRef.current();
          }

          gamepadPrevRef.current[prevKey] = pressed;
        }
      }

      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Detect controls ─────────────────────────────────────────────────────────
  const startDetect = useCallback(() => {
    setIsDetecting(true);
  }, []);

  const cancelDetect = useCallback(() => {
    setIsDetecting(false);
  }, []);

  const clearBinding = useCallback(() => {
    setBinding(null);
    saveBinding(null);
  }, []);

  return { binding, isPressed, isDetecting, startDetect, cancelDetect, clearBinding };
}
