import React, { useState, useEffect, useRef } from 'react';
import { PerformanceMonitor } from '../../utils/PerformanceMonitor';

interface PerformanceMonitorDisplayProps {
  visible?: boolean;
}

const PerformanceMonitorDisplay: React.FC<PerformanceMonitorDisplayProps> = React.memo(({ visible = true }) => {
  const [fps, setFps] = useState<number>(0);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number | undefined>(undefined);
  const monitorRef = useRef<PerformanceMonitor | null>(null);

  useEffect(() => {
    // Create performance monitor instance
    const monitor = new PerformanceMonitor(100, (metrics) => {
      setFps(metrics.fps);
      setRenderTime(metrics.renderTime);
      setMemoryUsage(metrics.memoryUsage);
    });
    
    monitorRef.current = monitor;
    monitor.start();
    
    // Clean up on unmount
    return () => {
      monitor.stop();
    };
  }, []);

  if (!visible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: fps >= 55 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336' }}>
          FPS: {fps.toFixed(1)}
        </span>
      </div>
      <div style={{ marginBottom: '4px' }}>
        Frame Time: {renderTime.toFixed(2)}ms
      </div>
      {memoryUsage !== undefined && (
        <div>Memory: {memoryUsage.toFixed(1)} MB</div>
      )}
    </div>
  );
});

export default PerformanceMonitorDisplay;
