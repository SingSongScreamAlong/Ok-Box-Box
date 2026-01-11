import { useState } from 'react';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppSettings {
  voice: {
    pttKey: string;
    inputDevice: string;
    outputDevice: string;
    volume: number;
    noiseGate: number;
  };
  display: {
    theme: 'dark' | 'light';
    fontSize: 'small' | 'medium' | 'large';
    showTelemetry: boolean;
    showCoaching: boolean;
    showCompetitors: boolean;
  };
  coaching: {
    enableInsights: boolean;
    insightFrequency: 'low' | 'medium' | 'high';
    focusAreas: string[];
  };
  connection: {
    apiUrl: string;
    autoReconnect: boolean;
    reconnectDelay: number;
  };
}

const defaultSettings: AppSettings = {
  voice: {
    pttKey: 'KeyT',
    inputDevice: 'default',
    outputDevice: 'default',
    volume: 100,
    noiseGate: 10,
  },
  display: {
    theme: 'dark',
    fontSize: 'medium',
    showTelemetry: true,
    showCoaching: true,
    showCompetitors: true,
  },
  coaching: {
    enableInsights: true,
    insightFrequency: 'medium',
    focusAreas: ['braking', 'throttle', 'racing_line'],
  },
  connection: {
    apiUrl: 'http://localhost:4000',
    autoReconnect: true,
    reconnectDelay: 1000,
  },
};

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'voice' | 'display' | 'coaching' | 'connection'>('voice');
  const [isBindingKey, setIsBindingKey] = useState(false);

  const handleKeyBind = () => {
    setIsBindingKey(true);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setSettings(prev => ({
        ...prev,
        voice: { ...prev.voice, pttKey: e.code }
      }));
      setIsBindingKey(false);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler, { once: true });
  };

  const formatKeyName = (keyCode: string): string => {
    const keyMap: Record<string, string> = {
      'KeyT': 'T', 'KeyV': 'V', 'KeyB': 'B', 'Space': 'Space',
      'ControlLeft': 'Left Ctrl', 'ControlRight': 'Right Ctrl',
      'ShiftLeft': 'Left Shift', 'ShiftRight': 'Right Shift',
      'AltLeft': 'Left Alt', 'AltRight': 'Right Alt',
    };
    if (keyMap[keyCode]) return keyMap[keyCode];
    if (keyCode.startsWith('Key')) return keyCode.slice(3);
    return keyCode;
  };

  const handleSave = () => {
    localStorage.setItem('blackbox_settings', JSON.stringify(settings));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button 
            className={`tab ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            🎙️ Voice
          </button>
          <button 
            className={`tab ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            🖥️ Display
          </button>
          <button 
            className={`tab ${activeTab === 'coaching' ? 'active' : ''}`}
            onClick={() => setActiveTab('coaching')}
          >
            💡 Coaching
          </button>
          <button 
            className={`tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            🔌 Connection
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'voice' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Push-to-Talk Key</label>
                <button 
                  className={`key-bind-btn ${isBindingKey ? 'binding' : ''}`}
                  onClick={handleKeyBind}
                >
                  {isBindingKey ? 'Press any key...' : formatKeyName(settings.voice.pttKey)}
                </button>
              </div>

              <div className="setting-group">
                <label>Microphone Volume</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.voice.volume}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      voice: { ...prev.voice, volume: parseInt(e.target.value) }
                    }))}
                  />
                  <span className="slider-value">{settings.voice.volume}%</span>
                </div>
              </div>

              <div className="setting-group">
                <label>Noise Gate</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={settings.voice.noiseGate}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      voice: { ...prev.voice, noiseGate: parseInt(e.target.value) }
                    }))}
                  />
                  <span className="slider-value">{settings.voice.noiseGate}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Theme</label>
                <select
                  value={settings.display.theme}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    display: { ...prev.display, theme: e.target.value as 'dark' | 'light' }
                  }))}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Font Size</label>
                <select
                  value={settings.display.fontSize}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    display: { ...prev.display, fontSize: e.target.value as 'small' | 'medium' | 'large' }
                  }))}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Show Panels</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.display.showTelemetry}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, showTelemetry: e.target.checked }
                      }))}
                    />
                    Telemetry
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.display.showCoaching}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, showCoaching: e.target.checked }
                      }))}
                    />
                    AI Coaching
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.display.showCompetitors}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        display: { ...prev.display, showCompetitors: e.target.checked }
                      }))}
                    />
                    Competitors
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coaching' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Enable AI Insights</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.coaching.enableInsights}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      coaching: { ...prev.coaching, enableInsights: e.target.checked }
                    }))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-group">
                <label>Insight Frequency</label>
                <select
                  value={settings.coaching.insightFrequency}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    coaching: { ...prev.coaching, insightFrequency: e.target.value as 'low' | 'medium' | 'high' }
                  }))}
                >
                  <option value="low">Low (fewer interruptions)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (more feedback)</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Focus Areas</label>
                <div className="checkbox-group">
                  {['braking', 'throttle', 'racing_line', 'tire_management', 'fuel_saving'].map(area => (
                    <label key={area} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.coaching.focusAreas.includes(area)}
                        onChange={e => {
                          const newAreas = e.target.checked
                            ? [...settings.coaching.focusAreas, area]
                            : settings.coaching.focusAreas.filter(a => a !== area);
                          setSettings(prev => ({
                            ...prev,
                            coaching: { ...prev.coaching, focusAreas: newAreas }
                          }));
                        }}
                      />
                      {area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>API URL</label>
                <input
                  type="text"
                  value={settings.connection.apiUrl}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    connection: { ...prev.connection, apiUrl: e.target.value }
                  }))}
                />
              </div>

              <div className="setting-group">
                <label>Auto Reconnect</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.connection.autoReconnect}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      connection: { ...prev.connection, autoReconnect: e.target.checked }
                    }))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-group">
                <label>Reconnect Delay (ms)</label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="500"
                  value={settings.connection.reconnectDelay}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    connection: { ...prev.connection, reconnectDelay: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
