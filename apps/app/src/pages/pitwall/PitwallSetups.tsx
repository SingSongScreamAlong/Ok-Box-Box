import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Download, Upload, Star } from 'lucide-react';

interface Setup {
  id: string;
  name: string;
  car: string;
  track: string;
  author: string;
  created_at: string;
  is_baseline: boolean;
  notes?: string;
}

const mockSetups: Setup[] = [
  {
    id: 's1',
    name: 'Daytona Baseline v3',
    car: 'Porsche 963 GTP',
    track: 'Daytona International Speedway',
    author: 'Alex Rivera',
    created_at: '2026-01-15T10:00:00Z',
    is_baseline: true,
    notes: 'Stable in traffic, good tire life'
  },
  {
    id: 's2',
    name: 'Daytona Quali',
    car: 'Porsche 963 GTP',
    track: 'Daytona International Speedway',
    author: 'Jordan Chen',
    created_at: '2026-01-16T14:00:00Z',
    is_baseline: false,
    notes: 'Low fuel, aggressive camber'
  },
  {
    id: 's3',
    name: 'Spa Wet',
    car: 'Porsche 963 GTP',
    track: 'Circuit de Spa-Francorchamps',
    author: 'Sam Williams',
    created_at: '2026-01-10T09:00:00Z',
    is_baseline: false,
    notes: 'Wet weather setup'
  }
];

export function PitwallSetups() {
  const { teamId } = useParams<{ teamId: string }>();
  const [setups, setSetups] = useState<Setup[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setSetups(mockSetups);
      setLoading(false);
    }, 300);
  }, [teamId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-white/50">Loading setups...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="text-xl font-bold tracking-wide text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Setups
          </h1>
          <p className="text-sm mt-1 text-white/50">Team setup library</p>
        </div>
        <button className="flex items-center gap-2 bg-[#0a0a0a] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#111] transition-colors">
          <Upload size={14} />
          Upload Setup
        </button>
      </div>

      <div className="grid gap-3">
        {setups.map((setup) => (
          <div 
            key={setup.id}
            className="bg-[#0a0a0a] p-4 hover:bg-[#111] transition-colors"
            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center">
                  <Settings size={16} className="text-white/50" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{setup.name}</span>
                    {setup.is_baseline && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30">
                        <Star size={10} />
                        Baseline
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{setup.car} • {setup.track}</div>
                  {setup.notes && (
                    <div className="text-xs text-white/30 mt-1 italic">{setup.notes}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-white/40 hover:text-white transition-colors" title="Download">
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/30">
              <span>By {setup.author}</span>
              <span>{new Date(setup.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
