import React, { useState, useEffect, useRef } from 'react';
import WebSocketService from '../../services/WebSocketService';

interface VideoPanelProps {
  driverCamActive?: boolean;
  spotterCamActive?: boolean;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  driverCamActive = true,
  spotterCamActive = true
}) => {
  const [activeSpotterCam, setActiveSpotterCam] = useState<string>('CHASE');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const [fps, setFps] = useState(0);

  useEffect(() => {
    // Subscribe to video frames
    const handleVideoFrame = (base64Image: string) => {
      // Simple FPS counter
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      // Update image source
      setVideoSrc(`data:image/jpeg;base64,${base64Image}`);
    };

    // Use the onVideoData method from the service
    const subscription = WebSocketService.onVideoData(handleVideoFrame);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cameraOptions = [
    'CHASE', 'WHEEL', 'TRACKSIDE', 'OVERHEAD',
    'ONBOARD', 'TV POD', 'REPLAY', 'HELICOPTER'
  ];

  return (
    <div className="video-panel">
      {/* Driver Camera Feed */}
      <div className="panel">
        <div className="panel-header">DRIVER CAM - COCKPIT VIEW (FIXED)</div>
        <div className="video-container">
          <div className="video-feed">
            {videoSrc ? (
              <img
                src={videoSrc}
                alt="Driver Cam"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏎️</div>
                <div>{driverCamActive ? 'WAITING FOR SIGNAL...' : 'DRIVER CAM OFFLINE'}</div>
                <div style={{ fontSize: '12px', color: '#7d8590', marginTop: '4px' }}>
                  COCKPIT VIEW • 1920x1080 • --fps
                </div>
              </div>
            )}

            <div className="video-overlay"></div>
            <div className="video-info">
              <div className="video-status">
                {driverCamActive && <div className="live-indicator"></div>}
                <span>DRIVER CAM</span>
              </div>
              <div className="video-quality">1080p {fps > 0 ? fps : '--'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spotter Camera Feed */}
      <div className="panel">
        <div className="panel-header">SPOTTER CAM - {activeSpotterCam} VIEW (SWITCHABLE)</div>
        <div className="video-container">
          <div className="video-feed">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📹</div>
              <div>{spotterCamActive ? 'SPOTTER CAM ACTIVE' : 'SPOTTER CAM OFFLINE'}</div>
              <div style={{ fontSize: '12px', color: '#7d8590', marginTop: '4px' }}>
                {activeSpotterCam} VIEW • 1920x1080 • 60fps
              </div>
            </div>
            <div className="video-overlay"></div>
            <div className="video-info">
              <div className="video-status">
                {spotterCamActive && <div className="live-indicator"></div>}
                <span>SPOTTER CAM</span>
              </div>
              <div className="video-quality">1080p60</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spotter Camera Controls */}
      <div className="panel">
        <div className="panel-header">SPOTTER CAM CONTROLS</div>
        <div className="panel-content">
          <div style={{ marginBottom: '12px' }}>
            <div className="section-title">DRIVER CAM</div>
            <div style={{
              padding: '8px',
              background: '#0d1117',
              borderRadius: '4px',
              borderLeft: '3px solid #30363d',
              fontSize: '11px',
              color: '#7d8590'
            }}>
              COCKPIT VIEW (FIXED)
            </div>
          </div>
          <div>
            <div className="section-title">SPOTTER CAM</div>
            <div className="controls-grid">
              {cameraOptions.map(camera => (
                <button
                  key={camera}
                  className={`camera-button ${activeSpotterCam === camera ? 'active' : ''}`}
                  onClick={() => setActiveSpotterCam(camera)}
                >
                  {camera}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;
