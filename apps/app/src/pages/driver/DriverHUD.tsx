import { useState } from 'react';
import { useRelay } from '../../hooks/useRelay';
import { 
  Monitor, 
  Layout, 
  Eye, 
  EyeOff,
  Settings,
  Maximize,
  Minimize,
  RotateCcw,
  Save
} from 'lucide-react';

interface HUDWidget {
  id: string;
  name: string;
  enabled: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export function DriverHUD() {
  const { status } = useRelay();
  const [hudEnabled, setHudEnabled] = useState(true);
  const [widgets, setWidgets] = useState<HUDWidget[]>([
    { id: 'delta', name: 'Delta Timer', enabled: true, position: 'top-center' },
    { id: 'fuel', name: 'Fuel Calculator', enabled: true, position: 'top-right' },
    { id: 'position', name: 'Position', enabled: true, position: 'top-left' },
    { id: 'laptime', name: 'Lap Times', enabled: true, position: 'bottom-center' },
    { id: 'inputs', name: 'Pedal Inputs', enabled: false, position: 'bottom-left' },
    { id: 'relative', name: 'Relative', enabled: false, position: 'bottom-right' },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const positions = [
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ] as const;

  const getWidgetAtPosition = (pos: string) => {
    return widgets.find(w => w.position === pos && w.enabled);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            HUD Configuration
          </h1>
          <p className="text-sm text-white/50 mt-1">Customize your in-game overlay</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setHudEnabled(!hudEnabled)}
            className={`flex items-center gap-2 px-4 py-2 border transition-colors ${
              hudEnabled 
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}
          >
            {hudEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-xs uppercase tracking-wider">
              HUD {hudEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </button>
        </div>
      </div>

      {/* Connection Warning */}
      {status === 'disconnected' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3">
          <Monitor className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-yellow-400">
            Connect the Relay to preview HUD with live data. Configuration changes will be saved.
          </p>
        </div>
      )}

      {/* HUD Preview */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#3b82f6]" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-[#3b82f6]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Layout Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Minimize className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Grid */}
        <div className="relative bg-black/60 border border-white/5 aspect-video">
          {/* Simulated game view */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/10 text-sm uppercase tracking-wider">Game View</span>
          </div>

          {/* HUD Positions */}
          {hudEnabled && (
            <>
              {/* Top Row */}
              <div className="absolute top-4 left-4 right-4 flex justify-between">
                <div className="w-32">
                  {getWidgetAtPosition('top-left') && (
                    <div className="bg-black/80 border border-white/20 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('top-left')?.name}
                      </div>
                      <div className="text-sm font-mono">P1</div>
                    </div>
                  )}
                </div>
                <div className="w-40">
                  {getWidgetAtPosition('top-center') && (
                    <div className="bg-black/80 border border-green-500/30 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('top-center')?.name}
                      </div>
                      <div className="text-lg font-mono text-green-500">-0.234</div>
                    </div>
                  )}
                </div>
                <div className="w-32">
                  {getWidgetAtPosition('top-right') && (
                    <div className="bg-black/80 border border-white/20 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('top-right')?.name}
                      </div>
                      <div className="text-sm font-mono">12.4L</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <div className="w-32">
                  {getWidgetAtPosition('bottom-left') && (
                    <div className="bg-black/80 border border-white/20 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('bottom-left')?.name}
                      </div>
                      <div className="text-xs font-mono">T:85% B:0%</div>
                    </div>
                  )}
                </div>
                <div className="w-40">
                  {getWidgetAtPosition('bottom-center') && (
                    <div className="bg-black/80 border border-white/20 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('bottom-center')?.name}
                      </div>
                      <div className="text-sm font-mono">1:23.456</div>
                    </div>
                  )}
                </div>
                <div className="w-32">
                  {getWidgetAtPosition('bottom-right') && (
                    <div className="bg-black/80 border border-white/20 p-2 text-center">
                      <div className="text-[8px] uppercase text-white/40">
                        {getWidgetAtPosition('bottom-right')?.name}
                      </div>
                      <div className="text-xs font-mono">+0.5 / -1.2</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!hudEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white/30 text-sm uppercase tracking-wider">HUD Disabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Widget Configuration */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-white/60" />
            <span 
              className="text-xs uppercase tracking-[0.15em] text-white/60"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Widgets
            </span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <RotateCcw className="w-3 h-3" />
            Reset to Default
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map(widget => (
            <div 
              key={widget.id}
              className={`border p-4 transition-colors ${
                widget.enabled 
                  ? 'bg-white/5 border-white/20' 
                  : 'bg-black/20 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{widget.name}</span>
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    widget.enabled ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <div 
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      widget.enabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-white/40">Position:</span>
                <select 
                  className="bg-black/40 border border-white/10 text-xs px-2 py-1 text-white/60"
                  value={widget.position}
                  onChange={(e) => {
                    setWidgets(widgets.map(w => 
                      w.id === widget.id 
                        ? { ...w, position: e.target.value as HUDWidget['position'] } 
                        : w
                    ));
                  }}
                  disabled={!widget.enabled}
                >
                  {positions.map(pos => (
                    <option key={pos} value={pos}>
                      {pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white text-sm uppercase tracking-wider font-semibold transition-colors">
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
}
