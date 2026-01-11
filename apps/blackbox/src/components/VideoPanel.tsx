import { useState, useEffect, useRef } from 'react';
import webSocketService from '../services/WebSocketService';
import './VideoPanel.css';

interface VideoStats {
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  latency: number;
}

interface VideoPanelProps {
  sessionActive: boolean;
  driverName?: string;
}

export default function VideoPanel({ sessionActive, driverName }: VideoPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasVideoFeed, setHasVideoFeed] = useState(false);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const socket = webSocketService.getSocket();
    if (!socket) return;

    // Video available notification from relay
    const handleVideoAvailable = (data: { width: number; height: number; fps: number }) => {
      console.log('[VideoPanel] Video available:', data);
      setStats({
        width: data.width,
        height: data.height,
        fps: data.fps,
        frameCount: 0,
        latency: 0,
      });
    };

    // Video frame received from relay (iRacing window capture)
    const handleVideoFrame = (data: { 
      data: string; 
      width: number; 
      height: number; 
      timestamp: number;
      frameNumber: number;
    }) => {
      setHasVideoFeed(true);
      setLastFrameTime(Date.now());
      
      // Calculate latency (timestamp is in seconds from Python)
      const latency = Date.now() - (data.timestamp * 1000);
      
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        width: data.width,
        height: data.height,
        frameCount: data.frameNumber,
        latency: Math.max(0, Math.min(latency, 5000)), // Cap at 5s
      } : {
        width: data.width,
        height: data.height,
        fps: 15,
        frameCount: data.frameNumber,
        latency: Math.max(0, latency),
      });

      // Render frame to canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create image from base64 data
      if (!imageRef.current) {
        imageRef.current = new Image();
        imageRef.current.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx && imageRef.current) {
            // Set canvas size to match video
            if (canvas.width !== data.width || canvas.height !== data.height) {
              canvas.width = data.width;
              canvas.height = data.height;
            }
            ctx.drawImage(imageRef.current, 0, 0);
          }
        };
      }
      
      imageRef.current.src = `data:image/jpeg;base64,${data.data}`;
    };

    // Video stopped
    const handleVideoStopped = () => {
      console.log('[VideoPanel] Video stopped');
      setHasVideoFeed(false);
    };

    socket.on('video:available', handleVideoAvailable);
    socket.on('video:frame', handleVideoFrame);
    socket.on('video:stopped', handleVideoStopped);

    return () => {
      socket.off('video:available', handleVideoAvailable);
      socket.off('video:frame', handleVideoFrame);
      socket.off('video:stopped', handleVideoStopped);
    };
  }, []);

  // Check for stale video (no frames for 3 seconds)
  useEffect(() => {
    if (!hasVideoFeed) return;

    const interval = setInterval(() => {
      if (Date.now() - lastFrameTime > 3000) {
        setHasVideoFeed(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasVideoFeed, lastFrameTime]);

  const getResolutionLabel = () => {
    if (!stats) return '—';
    const { height } = stats;
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return `${stats.width}x${height}`;
  };

  // Team Dashboard - shows iRacing window feed from driver's relay
  return (
    <div className="panel video-panel team-mode">
      <div className="panel-header">
        <span>🎮 iRACING FEED</span>
        <div className="video-controls">
          {hasVideoFeed && (
            <span className="live-indicator">● LIVE</span>
          )}
          <button 
            className={`btn-record ${isRecording ? 'recording' : ''}`}
            onClick={() => setIsRecording(!isRecording)}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? '⏹' : '⏺'}
          </button>
        </div>
      </div>
      <div className="panel-content">
        <div className="video-container">
          <canvas
            ref={canvasRef}
            className={`video-canvas ${hasVideoFeed ? 'active' : ''}`}
          />
          {!hasVideoFeed && (
            sessionActive ? (
              <div className="video-waiting">
                <div className="waiting-spinner"></div>
                <div className="waiting-text">Waiting for {driverName || 'driver'}'s iRacing feed...</div>
                <div className="waiting-hint">Relay will auto-detect iRacing window</div>
              </div>
            ) : (
              <div className="video-offline">
                <div className="offline-icon">🎮</div>
                <div className="offline-text">No iRacing Feed</div>
                <div className="offline-hint">Feed will appear when relay detects iRacing</div>
              </div>
            )
          )}
          {hasVideoFeed && (
            <div className="video-overlay">
              <span className="driver-name">{driverName || 'Driver'}</span>
            </div>
          )}
        </div>

        <div className="video-stats">
          <div className="stat">
            <span className="stat-label">Resolution</span>
            <span className="stat-value">{getResolutionLabel()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Target FPS</span>
            <span className="stat-value">{stats?.fps || 60}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Latency</span>
            <span className="stat-value" style={{ color: stats && stats.latency > 100 ? '#ff6b6b' : stats && stats.latency > 50 ? '#ffd93d' : '#6bcb77' }}>
              {stats ? `${stats.latency.toFixed(0)}ms` : '—'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Frames</span>
            <span className="stat-value">{stats?.frameCount.toLocaleString() || 0}</span>
          </div>
        </div>

        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot"></span>
            <span>Recording</span>
          </div>
        )}
      </div>
    </div>
  );
}
