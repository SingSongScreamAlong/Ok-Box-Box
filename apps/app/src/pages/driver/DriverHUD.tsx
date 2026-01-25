import { useState } from 'react';
import { 
  Monitor,
  Wrench,
  Eye,
  BarChart3,
  CheckCircle2,
  Circle,
  Info
} from 'lucide-react';

interface HUDWidget {
  id: string;
  name: string;
  description: string;
  crewMember: 'engineer' | 'spotter' | 'analyst';
  enabled: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export function DriverHUD() {
  const [widgets, setWidgets] = useState<HUDWidget[]>([
    {
      id: 'fuel-calc',
      name: 'Fuel Calculator',
      description: 'Your engineer displays fuel remaining, consumption rate, and laps until empty',
      crewMember: 'engineer',
      enabled: true,
      position: 'top-right',
    },
    {
      id: 'delta',
      name: 'Delta Timer',
      description: 'Real-time comparison to your best lap, updated every sector',
      crewMember: 'analyst',
      enabled: true,
      position: 'top-center',
    },
    {
      id: 'relative',
      name: 'Relative Display',
      description: 'Your spotter shows cars ahead and behind with closing rates',
      crewMember: 'spotter',
      enabled: true,
      position: 'bottom-left',
    },
    {
      id: 'inputs',
      name: 'Input Trace',
      description: 'Throttle, brake, and steering visualization for post-session review',
      crewMember: 'analyst',
      enabled: false,
      position: 'bottom-right',
    },
    {
      id: 'standings',
      name: 'Live Standings',
      description: 'Current race positions with gap to leader and interval',
      crewMember: 'spotter',
      enabled: true,
      position: 'top-left',
    },
    {
      id: 'pit-window',
      name: 'Pit Window',
      description: 'Your engineer calculates optimal pit timing based on fuel and strategy',
      crewMember: 'engineer',
      enabled: false,
      position: 'bottom-center',
    },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const getCrewIcon = (crewMember: HUDWidget['crewMember']) => {
    switch (crewMember) {
      case 'engineer': return <Wrench className="w-4 h-4 text-[#f97316]" />;
      case 'spotter': return <Eye className="w-4 h-4 text-[#3b82f6]" />;
      case 'analyst': return <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />;
    }
  };

  const getCrewColor = (crewMember: HUDWidget['crewMember']) => {
    switch (crewMember) {
      case 'engineer': return '#f97316';
      case 'spotter': return '#3b82f6';
      case 'analyst': return '#8b5cf6';
    }
  };

  const enabledWidgets = widgets.filter(w => w.enabled);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 
          className="text-2xl font-bold uppercase tracking-wider"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          HUD Overlay
        </h1>
        <p className="text-white/50 mt-2">
          Choose what information your crew displays on screen during sessions
        </p>
      </div>

      {/* Preview */}
      <div className="bg-black/60 border border-white/10 aspect-video relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Monitor className="w-12 h-12 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30 uppercase tracking-wider">HUD Preview</p>
          </div>
        </div>

        {/* Widget Positions */}
        {enabledWidgets.map((widget) => {
          const positionClasses: Record<string, string> = {
            'top-left': 'top-4 left-4',
            'top-center': 'top-4 left-1/2 -translate-x-1/2',
            'top-right': 'top-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
            'bottom-right': 'bottom-4 right-4',
          };

          return (
            <div
              key={widget.id}
              className={`absolute ${positionClasses[widget.position]} bg-black/80 border px-3 py-2`}
              style={{ borderColor: `${getCrewColor(widget.crewMember)}50` }}
            >
              <div className="flex items-center gap-2">
                {getCrewIcon(widget.crewMember)}
                <span className="text-[10px] uppercase tracking-wider text-white/60">
                  {widget.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Widgets by Crew Member */}
      <div className="space-y-6">
        {/* Engineer Widgets */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Wrench className="w-5 h-5 text-[#f97316]" />
            <h2 className="text-sm uppercase tracking-wider text-white/60">Engineer Displays</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {widgets.filter(w => w.crewMember === 'engineer').map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`p-4 border text-left transition-colors ${
                  widget.enabled 
                    ? 'border-[#f97316]/50 bg-[#f97316]/10' 
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {widget.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/30" />
                      )}
                      <span className="text-sm font-semibold">{widget.name}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-2 ml-6">{widget.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Spotter Widgets */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Eye className="w-5 h-5 text-[#3b82f6]" />
            <h2 className="text-sm uppercase tracking-wider text-white/60">Spotter Displays</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {widgets.filter(w => w.crewMember === 'spotter').map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`p-4 border text-left transition-colors ${
                  widget.enabled 
                    ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10' 
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {widget.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/30" />
                      )}
                      <span className="text-sm font-semibold">{widget.name}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-2 ml-6">{widget.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Analyst Widgets */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
            <h2 className="text-sm uppercase tracking-wider text-white/60">Analyst Displays</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {widgets.filter(w => w.crewMember === 'analyst').map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`p-4 border text-left transition-colors ${
                  widget.enabled 
                    ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10' 
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {widget.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/30" />
                      )}
                      <span className="text-sm font-semibold">{widget.name}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-2 ml-6">{widget.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-white/5 border border-white/10 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-white/60">
            The HUD overlay requires the Ok, Box Box Relay running on your racing PC. 
            Widgets will appear as an overlay on top of iRacing during sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
