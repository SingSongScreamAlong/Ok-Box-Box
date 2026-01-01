import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

export interface UserSettings {
  // Display
  theme: 'dark' | 'light' | 'auto';
  units: 'metric' | 'imperial';
  temperatureUnit: 'celsius' | 'fahrenheit';
  
  // Notifications
  notificationsEnabled: boolean;
  pitWindowAlerts: boolean;
  weatherAlerts: boolean;
  incidentAlerts: boolean;
  positionAlerts: boolean;
  fuelWarnings: boolean;
  tireWarnings: boolean;
  
  // Data
  dataRefreshRate: number; // ms
  telemetryHistory: number; // seconds to keep
  
  // Audio
  audioEnabled: boolean;
  voiceAlerts: boolean;
  alertVolume: number; // 0-100
  
  // Display preferences
  showMiniMap: boolean;
  showDeltaBar: boolean;
  compactMode: boolean;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  units: 'metric',
  temperatureUnit: 'celsius',
  notificationsEnabled: true,
  pitWindowAlerts: true,
  weatherAlerts: true,
  incidentAlerts: true,
  positionAlerts: true,
  fuelWarnings: true,
  tireWarnings: true,
  dataRefreshRate: 100,
  telemetryHistory: 60,
  audioEnabled: true,
  voiceAlerts: false,
  alertVolume: 70,
  showMiniMap: true,
  showDeltaBar: true,
  compactMode: false,
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'notifications' | 'data' | 'audio'>('display');
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button 
            className={activeTab === 'display' ? 'active' : ''} 
            onClick={() => setActiveTab('display')}
          >
            🖥️ Display
          </button>
          <button 
            className={activeTab === 'notifications' ? 'active' : ''} 
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notifications
          </button>
          <button 
            className={activeTab === 'data' ? 'active' : ''} 
            onClick={() => setActiveTab('data')}
          >
            📊 Data
          </button>
          <button 
            className={activeTab === 'audio' ? 'active' : ''} 
            onClick={() => setActiveTab('audio')}
          >
            🔊 Audio
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'display' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Theme</label>
                <div className="button-group">
                  {(['dark', 'light', 'auto'] as const).map(theme => (
                    <button
                      key={theme}
                      className={localSettings.theme === theme ? 'active' : ''}
                      onClick={() => handleChange('theme', theme)}
                    >
                      {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'} {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label>Units</label>
                <div className="button-group">
                  <button
                    className={localSettings.units === 'metric' ? 'active' : ''}
                    onClick={() => handleChange('units', 'metric')}
                  >
                    Metric (km/h)
                  </button>
                  <button
                    className={localSettings.units === 'imperial' ? 'active' : ''}
                    onClick={() => handleChange('units', 'imperial')}
                  >
                    Imperial (mph)
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>Temperature</label>
                <div className="button-group">
                  <button
                    className={localSettings.temperatureUnit === 'celsius' ? 'active' : ''}
                    onClick={() => handleChange('temperatureUnit', 'celsius')}
                  >
                    °C Celsius
                  </button>
                  <button
                    className={localSettings.temperatureUnit === 'fahrenheit' ? 'active' : ''}
                    onClick={() => handleChange('temperatureUnit', 'fahrenheit')}
                  >
                    °F Fahrenheit
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>Display Options</label>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <span>Show Mini Map</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showMiniMap}
                      onChange={(e) => handleChange('showMiniMap', e.target.checked)}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>Show Delta Bar</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showDeltaBar}
                      onChange={(e) => handleChange('showDeltaBar', e.target.checked)}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>Compact Mode</span>
                    <input
                      type="checkbox"
                      checked={localSettings.compactMode}
                      onChange={(e) => handleChange('compactMode', e.target.checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="setting-group">
                <div className="toggle-item main-toggle">
                  <span>Enable Notifications</span>
                  <input
                    type="checkbox"
                    checked={localSettings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>Alert Types</label>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <span>🏁 Pit Window Alerts</span>
                    <input
                      type="checkbox"
                      checked={localSettings.pitWindowAlerts}
                      onChange={(e) => handleChange('pitWindowAlerts', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>🌧️ Weather Alerts</span>
                    <input
                      type="checkbox"
                      checked={localSettings.weatherAlerts}
                      onChange={(e) => handleChange('weatherAlerts', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>⚠️ Incident Alerts</span>
                    <input
                      type="checkbox"
                      checked={localSettings.incidentAlerts}
                      onChange={(e) => handleChange('incidentAlerts', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>🔼 Position Change Alerts</span>
                    <input
                      type="checkbox"
                      checked={localSettings.positionAlerts}
                      onChange={(e) => handleChange('positionAlerts', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>⛽ Fuel Warnings</span>
                    <input
                      type="checkbox"
                      checked={localSettings.fuelWarnings}
                      onChange={(e) => handleChange('fuelWarnings', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                  <div className="toggle-item">
                    <span>🛞 Tire Warnings</span>
                    <input
                      type="checkbox"
                      checked={localSettings.tireWarnings}
                      onChange={(e) => handleChange('tireWarnings', e.target.checked)}
                      disabled={!localSettings.notificationsEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="settings-section">
              <div className="setting-group">
                <label>Data Refresh Rate</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="50"
                    value={localSettings.dataRefreshRate}
                    onChange={(e) => handleChange('dataRefreshRate', parseInt(e.target.value))}
                  />
                  <span className="slider-value">{localSettings.dataRefreshRate}ms</span>
                </div>
                <span className="setting-hint">Lower = more responsive, higher CPU usage</span>
              </div>

              <div className="setting-group">
                <label>Telemetry History</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="30"
                    value={localSettings.telemetryHistory}
                    onChange={(e) => handleChange('telemetryHistory', parseInt(e.target.value))}
                  />
                  <span className="slider-value">{localSettings.telemetryHistory}s</span>
                </div>
                <span className="setting-hint">How much telemetry data to keep for graphs</span>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="settings-section">
              <div className="setting-group">
                <div className="toggle-item main-toggle">
                  <span>Enable Audio</span>
                  <input
                    type="checkbox"
                    checked={localSettings.audioEnabled}
                    onChange={(e) => handleChange('audioEnabled', e.target.checked)}
                  />
                </div>
              </div>

              <div className="setting-group">
                <div className="toggle-item">
                  <span>Voice Alerts (Race Engineer)</span>
                  <input
                    type="checkbox"
                    checked={localSettings.voiceAlerts}
                    onChange={(e) => handleChange('voiceAlerts', e.target.checked)}
                    disabled={!localSettings.audioEnabled}
                  />
                </div>
              </div>

              <div className="setting-group">
                <label>Alert Volume</label>
                <div className="slider-group">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={localSettings.alertVolume}
                    onChange={(e) => handleChange('alertVolume', parseInt(e.target.value))}
                    disabled={!localSettings.audioEnabled}
                  />
                  <span className="slider-value">{localSettings.alertVolume}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="reset-button" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for persisting settings
export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('pitbox-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pitbox-settings', JSON.stringify(newSettings));
  };

  return { settings, updateSettings };
};

export { defaultSettings };
export default SettingsPanel;
