import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { EngineerDataPanel } from '../../../components/EngineerDataPanel';
import { fetchUpcomingRaces, UpcomingRace } from '../../../lib/driverService';
import { 
  Wrench, Send, ArrowLeft, Calendar, Flag,
  Settings2, Clock, ChevronRight, Loader2,
  Car, Gauge, ThermometerSun, MapPin
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'engineer';
  content: string;
  timestamp: Date;
}

const getEngineerResponse = (userMessage: string, race?: UpcomingRace): string => {
  const msg = userMessage.toLowerCase();
  if (msg.includes('fuel') || msg.includes('pit')) {
    return `For ${race?.track || 'this track'}, I'm calculating fuel consumption based on your recent laps. At your current pace, you'll need approximately 2.8 gallons per stint. I recommend planning for a pit window around lap ${Math.floor((race?.laps || 30) / 2)} if we're running a two-stop strategy.`;
  }
  if (msg.includes('setup') || msg.includes('car')) {
    return `I've been analyzing your telemetry from practice. Your corner entry is strong, but I'm seeing some understeer on exit at the high-speed sections. I'd suggest softening the rear ARB by 2 clicks and adding a bit more rear wing.`;
  }
  if (msg.includes('strategy') || msg.includes('plan')) {
    return `Looking at the ${race?.laps || 30}-lap race at ${race?.track || 'the track'}:\n\n **Qualifying**: Push for a top-5 grid position\n **Start**: Conservative launch, protect position through T1\n **Pit Window**: Lap ${Math.floor((race?.laps || 30) / 2)}  2 laps depending on traffic`;
  }
  if (msg.includes('hello') || msg.includes('hi')) {
    return `Hey driver! Good to have you in the briefing room. What would you like to discuss? Strategy, setup, fuel, or tire management?`;
  }
  return `Based on your driving data for ${race?.track || 'the upcoming race'}, I'd recommend focusing on consistency over raw pace in the early laps. What specific aspect would you like me to analyze?`;
};

export function EngineerChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [upcomingRaces, setUpcomingRaces] = useState<UpcomingRace[]>([]);
  const [selectedRace, setSelectedRace] = useState<UpcomingRace | null>(null);
  const [showTrackData, setShowTrackData] = useState(true);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  // Fetch upcoming races on mount
  useEffect(() => {
    fetchUpcomingRaces().then(races => {
      setUpcomingRaces(races);
      if (races.length > 0) {
        setSelectedRace(races[0]);
      }
      setLoading(false);
    });
  }, []);

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'engineer',
      content: `Good to see you, ${driverName}. I've been reviewing your recent sessions and preparing for your upcoming races. Select a race from the sidebar to see your track data, or switch to Chat View to discuss strategy.`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [driverName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    const engineerResponse: Message = { id: (Date.now() + 1).toString(), role: 'engineer', content: getEngineerResponse(input, selectedRace || undefined), timestamp: new Date() };
    setIsTyping(false);
    setMessages(prev => [...prev, engineerResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: 'Race Strategy', prompt: 'What\'s the race strategy?' },
    { label: 'Fuel Plan', prompt: 'Calculate fuel strategy' },
    { label: 'Setup Tips', prompt: 'Setup recommendations?' },
    { label: 'Tire Management', prompt: 'How should I manage tires?' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex relative">
      {/* Background video - more visible */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-70"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        {/* Lighter gradient overlay - let video show through */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
      </div>

      {/* Sidebar - cleaner with subtle layering */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Race Engineer</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Strategy & Setup</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Upcoming Races
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingRaces.map(race => (
                <button 
                  key={race.id} 
                  onClick={() => setSelectedRace(race)} 
                  className={`
                    w-full text-left p-3 rounded border transition-all duration-200
                    ${selectedRace?.id === race.id 
                      ? 'border-white/20 bg-white/[0.06]' 
                      : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03] bg-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/90">{race.track}</span>
                    <span className="text-[10px] text-white/40">{race.date}</span>
                  </div>
                  <div className="text-[10px] text-white/50">{race.series}</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                    <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{race.laps} laps</span>
                    {race.weather && <span className="flex items-center gap-1"><ThermometerSun className="w-3 h-3" />{race.weather}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Race Details</h3>
            <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Clock className="w-3 h-3" />Start Time</span><span className="text-white/80 font-medium">{selectedRace.time}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Flag className="w-3 h-3" />Race Length</span><span className="text-white/80 font-medium">{selectedRace.laps} laps</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Gauge className="w-3 h-3" />Est. Duration</span><span className="text-white/80 font-medium">~{Math.round(selectedRace.laps * 1.8)} min</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-sm text-white/70">{selectedRace ? `${selectedRace.track} - ${selectedRace.series}` : 'Select a race'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowTrackData(true)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded ${showTrackData ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
            >
              <MapPin className="w-3 h-3 inline mr-1.5" />Track Data
            </button>
            <button 
              onClick={() => setShowTrackData(false)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded ${!showTrackData ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
            >
              Chat
            </button>
            <button className="p-2 hover:bg-white/[0.06] text-white/30 hover:text-white/60 rounded transition-colors ml-2"><Settings2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showTrackData && selectedRace ? (
            <EngineerDataPanel track={selectedRace} />
          ) : (
            <div className="p-4 space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[70%] p-4 rounded
                    ${message.role === 'user' 
                      ? 'bg-white/[0.06] border border-white/[0.08]' 
                      : 'bg-white/[0.03] border border-white/[0.06]'
                    }
                  `}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'engineer' ? <Wrench className="w-3.5 h-3.5 text-white/50" /> : <Car className="w-3.5 h-3.5 text-white/40" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{message.role === 'engineer' ? 'Race Engineer' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-white/50" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      <span className="text-xs text-white/40">Engineer is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.04] bg-[#0e0e0e]/40">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {quickActions.map(action => (
              <button 
                key={action.label} 
                onClick={() => { setInput(action.prompt); setShowTrackData(false); inputRef.current?.focus(); }} 
                className="flex-shrink-0 px-3 py-1.5 text-xs border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.04] flex items-center gap-1 rounded transition-all duration-200"
              >
                {action.label}<ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <input 
              ref={inputRef} 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={handleKeyPress} 
              placeholder="Ask your engineer about strategy, setup, fuel, tires..." 
              className="flex-1 h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200" 
              onFocus={() => setShowTrackData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className="h-11 px-5 bg-[#f97316] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#ea580c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded transition-all duration-200"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
