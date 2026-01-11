/**
 * Video Streaming Service
 * Handles WebRTC video streaming between driver and team dashboard
 */

export interface StreamConfig {
  videoEnabled: boolean;
  audioEnabled: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  frameRate: number;
}

export interface StreamStats {
  bitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
  latency: number;
  packetsLost: number;
  jitter: number;
}

export interface PeerConnection {
  id: string;
  name: string;
  type: 'driver' | 'team';
  connected: boolean;
  stream?: MediaStream;
}

type StreamEventType = 
  | 'stream_started'
  | 'stream_stopped'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'stats_update'
  | 'error';

type StreamEventCallback = (event: StreamEventType, data?: unknown) => void;

const QUALITY_PRESETS: Record<StreamConfig['quality'], MediaTrackConstraints> = {
  low: { width: 640, height: 360, frameRate: 15 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  high: { width: 1920, height: 1080, frameRate: 30 },
  ultra: { width: 1920, height: 1080, frameRate: 60 },
};

class VideoStreamService {
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private listeners: Set<StreamEventCallback> = new Set();
  private config: StreamConfig = {
    videoEnabled: true,
    audioEnabled: false, // Audio handled by VoiceComms
    quality: 'high',
    frameRate: 30,
  };
  private stats: StreamStats = {
    bitrate: 0,
    frameRate: 0,
    resolution: { width: 0, height: 0 },
    latency: 0,
    packetsLost: 0,
    jitter: 0,
  };
  private statsInterval: number | null = null;
  private isStreaming = false;

  // ICE servers for NAT traversal
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  configure(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setQuality(quality: StreamConfig['quality']): void {
    this.config.quality = quality;
    if (this.localStream) {
      this.applyQualityConstraints();
    }
  }

  setIceServers(servers: RTCIceServer[]): void {
    this.iceServers = servers;
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: StreamEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: StreamEventType, data?: unknown): void {
    this.listeners.forEach(cb => cb(event, data));
  }

  // ============================================================================
  // LOCAL STREAM (Driver Side)
  // ============================================================================

  async startLocalStream(): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: this.config.videoEnabled ? {
          ...QUALITY_PRESETS[this.config.quality],
          facingMode: 'user',
        } : false,
        audio: this.config.audioEnabled,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isStreaming = true;
      this.startStatsCollection();
      this.emit('stream_started', { stream: this.localStream });

      return this.localStream;
    } catch (error) {
      console.error('[VideoStream] Failed to start local stream:', error);
      this.emit('error', { type: 'media', message: 'Failed to access camera' });
      throw error;
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: QUALITY_PRESETS[this.config.quality].width,
          height: QUALITY_PRESETS[this.config.quality].height,
          frameRate: QUALITY_PRESETS[this.config.quality].frameRate,
        },
        audio: false,
      });

      // If we already have a local stream, replace video track
      if (this.localStream) {
        const videoTrack = stream.getVideoTracks()[0];
        const oldTrack = this.localStream.getVideoTracks()[0];
        
        // Replace track in all peer connections
        this.peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Stop old track and update local stream
        oldTrack?.stop();
        this.localStream.removeTrack(oldTrack);
        this.localStream.addTrack(videoTrack);

        // Handle screen share stop
        videoTrack.onended = () => {
          this.switchToCamera();
        };
      } else {
        this.localStream = stream;
      }

      this.emit('stream_started', { stream: this.localStream, type: 'screen' });
      return this.localStream!;
    } catch (error) {
      console.error('[VideoStream] Failed to start screen share:', error);
      this.emit('error', { type: 'screen', message: 'Failed to share screen' });
      throw error;
    }
  }

  async switchToCamera(): Promise<void> {
    if (!this.localStream) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: QUALITY_PRESETS[this.config.quality],
      });

      const newTrack = newStream.getVideoTracks()[0];
      const oldTrack = this.localStream.getVideoTracks()[0];

      // Replace in peer connections
      this.peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      });

      oldTrack?.stop();
      this.localStream.removeTrack(oldTrack);
      this.localStream.addTrack(newTrack);

      this.emit('stream_started', { stream: this.localStream, type: 'camera' });
    } catch (error) {
      console.error('[VideoStream] Failed to switch to camera:', error);
    }
  }

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.isStreaming = false;
    this.stopStatsCollection();
    this.emit('stream_stopped');
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ============================================================================
  // REMOTE STREAMS (Team Side)
  // ============================================================================

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  // ============================================================================
  // WEBRTC PEER CONNECTIONS
  // ============================================================================

  async createPeerConnection(peerId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(peerId, remoteStream);
      this.emit('peer_connected', { peerId, stream: remoteStream });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to signaling server
        this.sendSignalingMessage(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handlePeerDisconnect(peerId);
      }
    };

    this.peerConnections.set(peerId, pc);

    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignalingMessage(peerId, {
        type: 'offer',
        sdp: offer,
      });
    }

    return pc;
  }

  async handleSignalingMessage(peerId: string, message: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }): Promise<void> {
    let pc = this.peerConnections.get(peerId);

    if (message.type === 'offer') {
      if (!pc) {
        pc = await this.createPeerConnection(peerId, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignalingMessage(peerId, {
        type: 'answer',
        sdp: answer,
      });
    } else if (message.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp!));
      }
    } else if (message.type === 'ice-candidate') {
      if (pc && message.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    }
  }

  private sendSignalingMessage(peerId: string, message: unknown): void {
    // This would send via WebSocket to signaling server
    // For now, emit an event that can be handled by the app
    this.emit('signaling' as StreamEventType, { peerId, message });
  }

  private handlePeerDisconnect(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.emit('peer_disconnected', { peerId });
  }

  closePeerConnection(peerId: string): void {
    this.handlePeerDisconnect(peerId);
  }

  // ============================================================================
  // QUALITY & STATS
  // ============================================================================

  private async applyQualityConstraints(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints(QUALITY_PRESETS[this.config.quality]);
      } catch (error) {
        console.warn('[VideoStream] Failed to apply quality constraints:', error);
      }
    }
  }

  private startStatsCollection(): void {
    this.statsInterval = window.setInterval(async () => {
      await this.collectStats();
    }, 1000);
  }

  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async collectStats(): Promise<void> {
    for (const [peerId, pc] of this.peerConnections) {
      try {
        const stats = await pc.getStats();
        stats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            this.stats.bitrate = (report.bytesSent * 8) / 1000; // kbps
            this.stats.frameRate = report.framesPerSecond || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            this.stats.latency = report.currentRoundTripTime * 1000 || 0;
          }
        });
        this.emit('stats_update', { peerId, stats: this.stats });
      } catch (error) {
        // Stats collection failed, ignore
      }
    }
  }

  getStats(): StreamStats {
    return { ...this.stats };
  }

  // ============================================================================
  // STATE
  // ============================================================================

  isStreamingActive(): boolean {
    return this.isStreaming;
  }

  getConfig(): StreamConfig {
    return { ...this.config };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.stopLocalStream();
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.listeners.clear();
  }
}

export const VideoStream = new VideoStreamService();
export default VideoStream;
