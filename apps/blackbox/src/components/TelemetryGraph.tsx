import { useState, useRef, useEffect } from 'react';
import './TelemetryGraph.css';

interface DataPoint {
  timestamp: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  steeringAngle: number;
}

interface TelemetryGraphProps {
  data: DataPoint[];
  maxPoints?: number;
}

type Channel = 'speed' | 'throttle' | 'brake' | 'gear' | 'rpm' | 'steering';

const channelConfig: Record<Channel, { color: string; label: string; unit: string; max: number }> = {
  speed: { color: '#3B82F6', label: 'Speed', unit: 'km/h', max: 350 },
  throttle: { color: '#10B981', label: 'Throttle', unit: '%', max: 100 },
  brake: { color: '#EF4444', label: 'Brake', unit: '%', max: 100 },
  gear: { color: '#F59E0B', label: 'Gear', unit: '', max: 8 },
  rpm: { color: '#8B5CF6', label: 'RPM', unit: '', max: 15000 },
  steering: { color: '#EC4899', label: 'Steering', unit: '°', max: 180 },
};

export default function TelemetryGraph({ data, maxPoints = 200 }: TelemetryGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeChannels, setActiveChannels] = useState<Channel[]>(['speed', 'throttle', 'brake']);
  const [isPaused, setIsPaused] = useState(false);

  const toggleChannel = (channel: Channel) => {
    setActiveChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isPaused) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 10, right: 10, bottom: 30, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Draw data
    const displayData = data.slice(-maxPoints);
    if (displayData.length < 2) return;

    activeChannels.forEach(channel => {
      const config = channelConfig[channel];
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      displayData.forEach((point, i) => {
        let value: number;
        switch (channel) {
          case 'speed': value = point.speed; break;
          case 'throttle': value = point.throttle; break;
          case 'brake': value = point.brake; break;
          case 'gear': value = point.gear; break;
          case 'rpm': value = point.rpm; break;
          case 'steering': value = Math.abs(point.steeringAngle); break;
          default: value = 0;
        }

        const x = padding.left + (i / (maxPoints - 1)) * graphWidth;
        const y = padding.top + graphHeight - (value / config.max) * graphHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    
    if (activeChannels.length === 1) {
      const config = channelConfig[activeChannels[0]];
      for (let i = 0; i <= 4; i++) {
        const value = config.max - (config.max / 4) * i;
        const y = padding.top + (graphHeight / 4) * i + 4;
        ctx.fillText(`${Math.round(value)}`, padding.left - 5, y);
      }
    }

    // Draw time axis
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Time →', width / 2, height - 5);

  }, [data, activeChannels, isPaused, maxPoints]);

  const latestData = data[data.length - 1];

  return (
    <div className="panel telemetry-graph">
      <div className="panel-header">
        TELEMETRY TRACE
        <div className="graph-controls">
          <button 
            className={`control-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
      <div className="panel-content">
        <div className="channel-selector">
          {(Object.keys(channelConfig) as Channel[]).map(channel => (
            <button
              key={channel}
              className={`channel-btn ${activeChannels.includes(channel) ? 'active' : ''}`}
              style={{ 
                borderColor: activeChannels.includes(channel) ? channelConfig[channel].color : undefined,
                color: activeChannels.includes(channel) ? channelConfig[channel].color : undefined,
              }}
              onClick={() => toggleChannel(channel)}
            >
              <span 
                className="channel-dot" 
                style={{ background: channelConfig[channel].color }}
              />
              {channelConfig[channel].label}
            </button>
          ))}
        </div>

        <div className="graph-container">
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={200}
            className="telemetry-canvas"
          />
        </div>

        {latestData && (
          <div className="current-values">
            {activeChannels.map(channel => {
              const config = channelConfig[channel];
              let value: number;
              switch (channel) {
                case 'speed': value = latestData.speed; break;
                case 'throttle': value = latestData.throttle; break;
                case 'brake': value = latestData.brake; break;
                case 'gear': value = latestData.gear; break;
                case 'rpm': value = latestData.rpm; break;
                case 'steering': value = latestData.steeringAngle; break;
                default: value = 0;
              }
              return (
                <div key={channel} className="current-value" style={{ borderColor: config.color }}>
                  <span className="value-label">{config.label}</span>
                  <span className="value-num" style={{ color: config.color }}>
                    {channel === 'rpm' ? Math.round(value) : value.toFixed(1)}
                    <span className="value-unit">{config.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
