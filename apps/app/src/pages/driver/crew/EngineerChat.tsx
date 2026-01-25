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
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src="/videos/driver-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/80" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-72 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#f97316]/20 border border-[#f97316]/40 rounded-sm flex items-center justify-center shadow-lg shadow-[#f97316]/10">
              <Wrench className="w-6 h-6 text-[#f97316]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Race Engineer</h2>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Strategy & Setup</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Upcoming Races
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingRaces.map(race => (
                <button 
                  key={race.id} 
                  onClick={() => setSelectedRace(race)} 
                  className={`
                    w-full text-left p-3 rounded-sm border transition-all duration-200
                    ${selectedRace?.id === race.id 
                      ? 'border-[#f97316]/50 bg-[#f97316]/15 shadow-lg shadow-[#f97316]/10' 
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5 bg-black/30'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{race.track}</span>
                    <span className="text-[10px] text-white/50">{race.date}</span>
                  </div>
                  <div className="text-[10px] text-white/60">{race.series}</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
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
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Race Details</h3>
            <div className="space-y-3 bg-black/30 rounded-sm p-3 border border-white/5">
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Clock className="w-3 h-3" />Start Time</span><span className="text-white font-medium">{selectedRace.time}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Flag className="w-3 h-3" />Race Length</span><span className="text-white font-medium">{selectedRace.laps} laps</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Gauge className="w-3 h-3" />Est. Duration</span><span className="text-white font-medium">~{Math.round(selectedRace.laps * 1.8)} min</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
            <span className="text-sm text-white/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{selectedRace ? `${selectedRace.track} - ${selectedRace.series}` : 'Select a race'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowTrackData(true)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded-sm ${showTrackData ? 'bg-[#f97316]/20 text-[#f97316] shadow-lg shadow-[#f97316]/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <MapPin className="w-3 h-3 inline mr-1" />Track Data
            </button>
            <button 
              onClick={() => setShowTrackData(false)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded-sm ${!showTrackData ? 'bg-[#f97316]/20 text-[#f97316] shadow-lg shadow-[#f97316]/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Chat
            </button>
            <button className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-sm transition-colors"><Settings2 className="w-4 h-4" /></button>
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
                    max-w-[70%] p-4 rounded-sm backdrop-blur-sm shadow-lg
                    ${message.role === 'user' 
                      ? 'bg-[#f97316]/15 border border-[#f97316]/30 shadow-[#f97316]/10' 
                      : 'bg-white/5 border border-white/10'
                    }
                  `}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'engineer' ? <Wrench className="w-4 h-4 text-[#f97316]" /> : <Car className="w-4 h-4 text-white/60" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/50">{message.role === 'engineer' ? 'Race Engineer' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-sm backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#f97316]" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                      <span className="text-xs text-white/50">Engineer is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {quickActions.map(action => (
              <button 
                key={action.label} 
                onClick={() => { setInput(action.prompt); setShowTrackData(false); inputRef.current?.focus(); }} 
                className="flex-shrink-0 px-3 py-1.5 text-xs border border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 flex items-center gap-1 rounded-sm transition-all duration-200"
              >
                {action.label}<ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <input 
              ref={inputRef} 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={handleKeyPress} 
              placeholder="Ask your engineer about strategy, setup, fuel, tires..." 
              className="flex-1 h-12 px-4 bg-black/50 border border-white/10 rounded-sm text-white placeholder-white/30 focus:outline-none focus:border-[#f97316]/50 focus:shadow-lg focus:shadow-[#f97316]/10 transition-all duration-200" 
              onFocus={() => setShowTrackData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className="h-12 px-6 bg-[#f97316] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#fb923c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-sm shadow-lg shadow-[#f97316]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#f97316]/40"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
