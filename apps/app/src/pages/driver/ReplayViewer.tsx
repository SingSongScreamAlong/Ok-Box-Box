import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  MessageSquare, AlertTriangle, Flag, Plus, Download, Share2, Maximize2,
  Fuel, Thermometer, Target, Loader2
} from 'lucide-react';
import {
  fetchSessionDetail,
  createReplayMarker,
  type SessionData,
  type LapData,
  type ReplayMarker
} from '../../lib/telemetryService';

// Types
interface TelemetryPoint {
  timestamp: number; // seconds into replay
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  rpm: number;
  fuel: number;
  tireTemp: { fl: number; fr: number; rl: number; rr: number };
  lapTime?: string;
  sector?: number;
  position?: number;
}

interface Marker {
  id: string;
  timestamp: number;
  type: 'incident' | 'coaching' | 'highlight' | 'note';
  title: string;
  description: string;
  author?: string;
  telemetrySnapshot?: TelemetryPoint;
}

interface ReplaySession {
  id: string;
  title: string;
  track: string;
  series: string;
  date: string;
  duration: number; // total seconds
  laps: number;
  bestLap: string;
  position: { start: number; finish: number };
  incidents: number;
  markers: Marker[];
}

// Mock replay data
const mockSession: ReplaySession = {
  id: 'replay_001',
  title: 'Daytona 24H Practice',
  track: 'Daytona International Speedway',
  series: 'IMSA Pilot Challenge',
  date: '2026-01-25',
  duration: 3600, // 1 hour
  laps: 42,
  bestLap: '1:47.234',
  position: { start: 8, finish: 5 },
  incidents: 3,
  markers: [
    {
      id: 'm1',
      timestamp: 245,
      type: 'incident',
      title: 'Contact at Bus Stop',
      description: 'Light contact with #42 entering the bus stop chicane. You were slightly ahead but left the door open.',
      author: 'AI Coach',
      telemetrySnapshot: {
        timestamp: 245,
        speed: 142,
        throttle: 0,
        brake: 85,
        steering: -12,
        gear: 3,
        rpm: 6200,
        fuel: 42.5,
        tireTemp: { fl: 92, fr: 94, rl: 88, rr: 90 },
        position: 7
      }
    },
    {
      id: 'm2',
      timestamp: 512,
      type: 'coaching',
      title: 'Trail Brake Opportunity',
      description: 'You released the brake 15m before the apex here. Try trailing the brake deeper to rotate the car better. This could save 0.1s per lap.',
      author: 'AI Coach',
      telemetrySnapshot: {
        timestamp: 512,
        speed: 98,
        throttle: 0,
        brake: 45,
        steering: 22,
        gear: 2,
        rpm: 5800,
        fuel: 41.2,
        tireTemp: { fl: 94, fr: 96, rl: 89, rr: 91 },
        sector: 2
      }
    },
    {
      id: 'm3',
      timestamp: 890,
      type: 'highlight',
      title: 'Great Overtake!',
      description: 'Clean pass on the outside of Turn 1. Perfect execution - you carried more speed and used the banking.',
      author: 'AI Coach'
    },
    {
      id: 'm4',
      timestamp: 1245,
      type: 'incident',
      title: 'Spin in International Horseshoe',
      description: 'Rear stepped out on throttle application. You were 0.3s up on your best lap - likely pushing too hard. Tire temps were at limit.',
      author: 'AI Coach',
      telemetrySnapshot: {
        timestamp: 1245,
        speed: 78,
        throttle: 92,
        brake: 0,
        steering: 8,
        gear: 2,
        rpm: 7100,
        fuel: 38.8,
        tireTemp: { fl: 98, fr: 99, rl: 96, rr: 98 },
        lapTime: '1:48.102'
      }
    },
    {
      id: 'm5',
      timestamp: 1890,
      type: 'coaching',
      title: 'Fuel Saving Opportunity',
      description: 'You can lift earlier on the back straight approach to save fuel without losing time. The draft will pull you back.',
      author: 'AI Coach'
    },
    {
      id: 'm6',
      timestamp: 2456,
      type: 'note',
      title: 'Setup Note',
      description: 'Car feels loose on entry. Consider adding front ARB or reducing rear wing.',
      author: 'You'
    }
  ]
};

// Generate mock telemetry for timeline
function generateTelemetry(timestamp: number): TelemetryPoint {
  const lapProgress = (timestamp % 107) / 107; // ~107s per lap
  const inCorner = lapProgress > 0.15 && lapProgress < 0.25;
  const onStraight = lapProgress > 0.6 && lapProgress < 0.8;
  
  return {
    timestamp,
    speed: onStraight ? 175 + Math.random() * 10 : inCorner ? 85 + Math.random() * 15 : 120 + Math.random() * 30,
    throttle: onStraight ? 100 : inCorner ? 30 + Math.random() * 40 : 70 + Math.random() * 30,
    brake: inCorner ? 60 + Math.random() * 30 : 0,
    steering: inCorner ? -15 + Math.random() * 30 : Math.random() * 5 - 2.5,
    gear: onStraight ? 6 : inCorner ? 2 : 4,
    rpm: onStraight ? 7800 : inCorner ? 5500 : 6500,
    fuel: 45 - (timestamp / 3600) * 20,
    tireTemp: {
      fl: 90 + Math.random() * 8,
      fr: 91 + Math.random() * 8,
      rl: 87 + Math.random() * 6,
      rr: 88 + Math.random() * 6
    }
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getMarkerIcon(type: Marker['type']) {
  switch (type) {
    case 'incident': return <AlertTriangle className="w-3 h-3" />;
    case 'coaching': return <Target className="w-3 h-3" />;
    case 'highlight': return <Flag className="w-3 h-3" />;
    case 'note': return <MessageSquare className="w-3 h-3" />;
  }
}

function getMarkerColor(type: Marker['type']) {
  switch (type) {
    case 'incident': return 'bg-red-500 border-red-400';
    case 'coaching': return 'bg-blue-500 border-blue-400';
    case 'highlight': return 'bg-emerald-500 border-emerald-400';
    case 'note': return 'bg-amber-500 border-amber-400';
  }
}

export function ReplayViewer() {
  const { user } = useAuth();
  const [session] = useState<ReplaySession>(mockSession);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [showAddMarker, setShowAddMarker] = useState(false);
  const [newMarkerType, setNewMarkerType] = useState<Marker['type']>('note');
  const [newMarkerTitle, setNewMarkerTitle] = useState('');
  const [newMarkerDesc, setNewMarkerDesc] = useState('');
  const [telemetry, setTelemetry] = useState<TelemetryPoint>(generateTelemetry(0));
  const [filterType, setFilterType] = useState<Marker['type'] | 'all'>('all');
    const timelineRef = useRef<HTMLDivElement>(null);

  // Playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (0.1 * playbackSpeed);
        if (next >= session.duration) {
          setIsPlaying(false);
          return session.duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, session.duration]);

  // Update telemetry based on current time
  useEffect(() => {
    setTelemetry(generateTelemetry(currentTime));
  }, [currentTime]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    setCurrentTime(percentage * session.duration);
  };

  const jumpToMarker = (marker: Marker) => {
    setCurrentTime(marker.timestamp);
    setSelectedMarker(marker);
    setIsPlaying(false);
  };

  const skipTime = (seconds: number) => {
    setCurrentTime(prev => Math.max(0, Math.min(session.duration, prev + seconds)));
  };

  const filteredMarkers = session.markers.filter(m => 
    filterType === 'all' || m.type === filterType
  );

  const nearbyMarkers = session.markers.filter(m => 
    Math.abs(m.timestamp - currentTime) < 5
  );

  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0e0e0e]">
        <div className="flex items-center gap-4">
          <Link to="/driver/sessions" className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {session.title}
            </h1>
            <p className="text-[10px] text-white/40">{session.track} • {session.series}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video/Replay Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player Placeholder */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
            
            {/* Placeholder for actual replay */}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center">
                <Play className="w-10 h-10 text-white/30" />
              </div>
              <p className="text-white/30 text-sm">Replay Video</p>
              <p className="text-white/20 text-xs mt-1">Lap {Math.floor(currentTime / 107) + 1} of {session.laps}</p>
            </div>

            {/* Telemetry Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/[0.10]">
              <div className="grid grid-cols-3 gap-3 text-[10px]">
                <div>
                  <p className="text-white/40 uppercase">Speed</p>
                  <p className="text-lg font-mono text-white">{Math.round(telemetry.speed)}</p>
                  <p className="text-white/30">mph</p>
                </div>
                <div>
                  <p className="text-white/40 uppercase">Gear</p>
                  <p className="text-lg font-mono text-white">{telemetry.gear}</p>
                </div>
                <div>
                  <p className="text-white/40 uppercase">RPM</p>
                  <p className="text-lg font-mono text-white">{telemetry.rpm}</p>
                </div>
              </div>
            </div>

            {/* Pedal Inputs */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/[0.10]">
              <div className="flex gap-2">
                <div className="w-6">
                  <p className="text-[8px] text-white/40 text-center mb-1">THR</p>
                  <div className="h-16 bg-white/[0.05] rounded relative">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-b transition-all"
                      style={{ height: `${telemetry.throttle}%` }}
                    />
                  </div>
                </div>
                <div className="w-6">
                  <p className="text-[8px] text-white/40 text-center mb-1">BRK</p>
                  <div className="h-16 bg-white/[0.05] rounded relative">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-red-500 rounded-b transition-all"
                      style={{ height: `${telemetry.brake}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fuel & Temps */}
            <div className="absolute bottom-20 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-white/[0.10]">
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-amber-400" />
                  <span className="text-white font-mono">{telemetry.fuel.toFixed(1)}L</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-red-400" />
                  <span className="text-white font-mono">{Math.round(telemetry.tireTemp.fr)}°</span>
                </div>
              </div>
            </div>

            {/* Nearby Marker Alert */}
            {nearbyMarkers.length > 0 && (
              <div className="absolute bottom-20 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/[0.10] max-w-xs">
                {nearbyMarkers.map(marker => (
                  <div key={marker.id} className="flex items-start gap-2">
                    <div className={`p-1 rounded ${getMarkerColor(marker.type)}`}>
                      {getMarkerIcon(marker.type)}
                    </div>
                    <div>
                      <p className="text-xs text-white font-medium">{marker.title}</p>
                      <p className="text-[10px] text-white/50 line-clamp-2">{marker.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline & Controls */}
          <div className="bg-[#0e0e0e] border-t border-white/[0.06] p-3">
            {/* Timeline */}
            <div 
              ref={timelineRef}
              className="relative h-8 bg-white/[0.03] rounded cursor-pointer mb-3"
              onClick={handleTimelineClick}
            >
              {/* Progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-[#3b82f6]/30 rounded-l"
                style={{ width: `${(currentTime / session.duration) * 100}%` }}
              />
              
              {/* Markers on timeline */}
              {session.markers.map(marker => (
                <button
                  key={marker.id}
                  className={`absolute top-1 w-2 h-6 rounded-sm border ${getMarkerColor(marker.type)} hover:scale-110 transition-transform`}
                  style={{ left: `${(marker.timestamp / session.duration) * 100}%` }}
                  onClick={(e) => { e.stopPropagation(); jumpToMarker(marker); }}
                  title={marker.title}
                />
              ))}

              {/* Playhead */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-white"
                style={{ left: `${(currentTime / session.duration) * 100}%` }}
              />

              {/* Time labels */}
              <div className="absolute -bottom-5 left-0 text-[9px] text-white/30">{formatTime(0)}</div>
              <div className="absolute -bottom-5 right-0 text-[9px] text-white/30">{formatTime(session.duration)}</div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => skipTime(-10)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-[#3b82f6] hover:bg-[#3b82f6]/80 rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                </button>
                <button 
                  onClick={() => skipTime(10)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <span className="text-sm font-mono text-white ml-2">
                  {formatTime(currentTime)} / {formatTime(session.duration)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Playback Speed */}
                <div className="flex items-center gap-1">
                  {[0.5, 1, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        playbackSpeed === speed 
                          ? 'bg-[#3b82f6] text-white' 
                          : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1 text-white/50 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 h-1 bg-white/[0.10] rounded-full appearance-none cursor-pointer"
                  />
                </div>

                {/* Add Marker */}
                <button
                  onClick={() => setShowAddMarker(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] rounded text-xs text-white/70 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Marker
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Markers Sidebar */}
        <div className="w-80 border-l border-white/[0.06] bg-[#0e0e0e] flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Markers & Notes
              </h2>
              <span className="text-[10px] text-white/40">{filteredMarkers.length} items</span>
            </div>
            
            {/* Filter */}
            <div className="flex gap-1">
              {(['all', 'incident', 'coaching', 'highlight', 'note'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 text-[9px] uppercase rounded transition-colors ${
                    filterType === type
                      ? 'bg-white/[0.10] text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Markers List */}
          <div className="flex-1 overflow-y-auto">
            {filteredMarkers.map(marker => (
              <button
                key={marker.id}
                onClick={() => jumpToMarker(marker)}
                className={`w-full p-3 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                  selectedMarker?.id === marker.id ? 'bg-white/[0.05]' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded ${getMarkerColor(marker.type)}`}>
                    {getMarkerIcon(marker.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white font-medium truncate">{marker.title}</p>
                      <span className="text-[9px] text-white/30 font-mono ml-2">
                        {formatTime(marker.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 line-clamp-2">{marker.description}</p>
                    {marker.author && (
                      <p className="text-[9px] text-white/30 mt-1">— {marker.author}</p>
                    )}
                  </div>
                </div>

                {/* Telemetry snapshot */}
                {marker.telemetrySnapshot && selectedMarker?.id === marker.id && (
                  <div className="mt-3 p-2 bg-white/[0.03] rounded border border-white/[0.06]">
                    <p className="text-[9px] text-white/40 uppercase mb-2">Telemetry at moment</p>
                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      <div>
                        <p className="text-white/30">Speed</p>
                        <p className="text-white font-mono">{marker.telemetrySnapshot.speed}</p>
                      </div>
                      <div>
                        <p className="text-white/30">Throttle</p>
                        <p className="text-emerald-400 font-mono">{marker.telemetrySnapshot.throttle}%</p>
                      </div>
                      <div>
                        <p className="text-white/30">Brake</p>
                        <p className="text-red-400 font-mono">{marker.telemetrySnapshot.brake}%</p>
                      </div>
                      <div>
                        <p className="text-white/30">Gear</p>
                        <p className="text-white font-mono">{marker.telemetrySnapshot.gear}</p>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Session Stats */}
          <div className="p-3 border-t border-white/[0.06] bg-white/[0.02]">
            <p className="text-[9px] text-white/40 uppercase mb-2">Session Summary</p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p className="text-white/30">Best Lap</p>
                <p className="text-white font-mono">{session.bestLap}</p>
              </div>
              <div>
                <p className="text-white/30">Position</p>
                <p className="text-white font-mono">P{session.position.start} → P{session.position.finish}</p>
              </div>
              <div>
                <p className="text-white/30">Incidents</p>
                <p className="text-red-400 font-mono">{session.incidents}x</p>
              </div>
              <div>
                <p className="text-white/30">Laps</p>
                <p className="text-white font-mono">{session.laps}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Marker Modal */}
      {showAddMarker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-white/[0.10] rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Add Marker at {formatTime(currentTime)}
            </h3>

            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Type</label>
                <div className="flex gap-2 mt-2">
                  {(['note', 'coaching', 'highlight', 'incident'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewMarkerType(type)}
                      className={`flex items-center gap-1 px-3 py-2 rounded border transition-colors ${
                        newMarkerType === type
                          ? `${getMarkerColor(type)} text-white`
                          : 'border-white/[0.10] text-white/50 hover:border-white/[0.20]'
                      }`}
                    >
                      {getMarkerIcon(type)}
                      <span className="text-xs capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={newMarkerTitle}
                  onChange={(e) => setNewMarkerTitle(e.target.value)}
                  placeholder="Brief title..."
                  className="w-full mt-2 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Description</label>
                <textarea
                  value={newMarkerDesc}
                  onChange={(e) => setNewMarkerDesc(e.target.value)}
                  placeholder="Detailed notes..."
                  rows={3}
                  className="w-full mt-2 px-3 py-2 bg-white/[0.03] border border-white/[0.10] rounded text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#3b82f6] resize-none"
                />
              </div>

              {/* Current Telemetry */}
              <div className="p-3 bg-white/[0.03] rounded border border-white/[0.06]">
                <p className="text-[9px] text-white/40 uppercase mb-2">Current Telemetry (will be saved)</p>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <p className="text-white/30">Speed</p>
                    <p className="text-white font-mono">{Math.round(telemetry.speed)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Throttle</p>
                    <p className="text-emerald-400 font-mono">{Math.round(telemetry.throttle)}%</p>
                  </div>
                  <div>
                    <p className="text-white/30">Brake</p>
                    <p className="text-red-400 font-mono">{Math.round(telemetry.brake)}%</p>
                  </div>
                  <div>
                    <p className="text-white/30">Gear</p>
                    <p className="text-white font-mono">{telemetry.gear}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddMarker(false);
                  setNewMarkerTitle('');
                  setNewMarkerDesc('');
                }}
                className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Would save marker here
                  setShowAddMarker(false);
                  setNewMarkerTitle('');
                  setNewMarkerDesc('');
                }}
                className="px-4 py-2 bg-[#3b82f6] hover:bg-[#3b82f6]/80 text-white text-sm rounded transition-colors"
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
