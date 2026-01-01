import React, { useEffect, useCallback } from 'react';
import { DashboardMode } from '../components/Header/Header';

interface KeyboardShortcutsConfig {
  onModeChange: (mode: DashboardMode) => void;
  onToggleChat: () => void;
  onToggleSettings: () => void;
  onExport: () => void;
  onToggleMultiDriver: () => void;
  enabled?: boolean;
}

interface ShortcutInfo {
  key: string;
  description: string;
  category: string;
}

export const SHORTCUTS: ShortcutInfo[] = [
  // Mode switching
  { key: '1', description: 'Switch to RACE mode', category: 'Navigation' },
  { key: '2', description: 'Switch to TRACK mode', category: 'Navigation' },
  { key: '3', description: 'Switch to STRATEGY mode', category: 'Navigation' },
  { key: '4', description: 'Switch to ANALYSIS mode', category: 'Navigation' },
  
  // Panels
  { key: 'C', description: 'Toggle Team Chat', category: 'Panels' },
  { key: 'S', description: 'Open Settings', category: 'Panels' },
  { key: 'M', description: 'Toggle Multi-Driver Panel', category: 'Panels' },
  
  // Actions
  { key: 'E', description: 'Export Session Data', category: 'Actions' },
  { key: '?', description: 'Show Keyboard Shortcuts', category: 'Help' },
  { key: 'Escape', description: 'Close active panel', category: 'General' },
];

export const useKeyboardShortcuts = ({
  onModeChange,
  onToggleChat,
  onToggleSettings,
  onExport,
  onToggleMultiDriver,
  enabled = true,
}: KeyboardShortcutsConfig) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Don't trigger if modifier keys are pressed (except for ?)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      // Mode switching with number keys
      case '1':
        event.preventDefault();
        onModeChange('RACE');
        break;
      case '2':
        event.preventDefault();
        onModeChange('TRACK');
        break;
      case '3':
        event.preventDefault();
        onModeChange('STRATEGY');
        break;
      case '4':
        event.preventDefault();
        onModeChange('ANALYSIS');
        break;
      
      // Panel toggles
      case 'c':
        event.preventDefault();
        onToggleChat();
        break;
      case 's':
        event.preventDefault();
        onToggleSettings();
        break;
      case 'm':
        event.preventDefault();
        onToggleMultiDriver();
        break;
      
      // Actions
      case 'e':
        event.preventDefault();
        onExport();
        break;
      
      default:
        break;
    }
  }, [onModeChange, onToggleChat, onToggleSettings, onExport, onToggleMultiDriver]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
};

// Component to display shortcuts help
export const ShortcutsHelp: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutInfo[]>);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>×</button>
        </div>
        <div className="shortcuts-content">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="shortcuts-category">
              <h3>{category}</h3>
              <div className="shortcuts-list">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="shortcut-item">
                    <kbd>{shortcut.key}</kbd>
                    <span>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default useKeyboardShortcuts;
