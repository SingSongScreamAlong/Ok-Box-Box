import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { SpotterDataPanel } from '../../../components/SpotterDataPanel';
import { fetchUpcomingRaces, UpcomingRace } from '../../../lib/driverService';
import { 
  Eye, Send, ArrowLeft, Calendar,
  Settings2, ChevronRight, Loader2,
  Car, Users, AlertTriangle, MapPin
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'spotter';
  content: string;
  timestamp: Date;
}

const getSpotterResponse = (userMessage: string, race?: UpcomingRace): string => {
  const msg = userMessage.toLowerCase();
  if (msg.includes('start') || msg.includes('t1') || msg.includes('turn 1')) {
    return `For ${race?.track || 'this track'}, Turn 1 is going to be chaotic with ${race?.expectedField || 24} cars. I'll call "clear inside" or "car outside" - trust the call. We're racing for the finish, not Turn 1.`;
  }
  if (msg.includes('rival') || msg.includes('watch')) {
    return `I've been watching the field. There are a few fast drivers to keep an eye on. They tend to be aggressive on restarts and strong in braking zones. I'll call them out by position during the race.`;
  }
  if (msg.includes('traffic') || msg.includes('lapped')) {
    return `Traffic management: I'll give early warnings. Blue flags mean they should let you by. Best passing zones: main straight and heavy braking areas. Patience wins races.`;
  }
  if (msg.includes('hello') || msg.includes('hi')) {
    return `Hey driver, spotter here. ${race?.expectedField || 24} cars expected at ${race?.track || 'the track'}. What do you want to go over? Race starts, traffic, or competition?`;
  }
  return `Got it. For ${race?.track || 'this race'} with ${race?.expectedField || 24} cars, I'll keep my calls short and clear. What else do you need to know?`;
};

export function SpotterChat() {
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

  useEffect(() => {
    fetchUpcomingRaces().then(races => {
      setUpcomingRaces(races);
      if (races.length > 0) setSelectedRace(races[0]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'spotter',
      content: `${driverName}, spotter checking in. Select a race to see track data and field info, or switch to Chat to discuss race starts and competitors.`,
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
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
    const spotterResponse: Message = { id: (Date.now() + 1).toString(), role: 'spotter', content: getSpotterResponse(input, selectedRace || undefined), timestamp: new Date() };
    setIsTyping(false);
    setMessages(prev => [...prev, spotterResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: 'Race Start Plan', prompt: 'Brief me on the Turn 1 approach' },
    { label: 'Who to Watch', prompt: 'Who are the rivals to watch?' },
    { label: 'Traffic Tips', prompt: 'How should we handle lapped traffic?' },
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
          className="w-full h-full object-cover opacity-30"
        >
          <source src="/videos/track-left.mp4" type="video/mp4" />
        </video>
        {/* Softer gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/95 via-[#0e0e0e]/85 to-[#0e0e0e]/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]" />
      </div>

      {/* Sidebar - cleaner with subtle layering */}
      <div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
              <Eye className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Spotter</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Traffic & Awareness</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Upcoming Races
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
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
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{race.expectedField || 24} cars</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Field Info</h3>
            <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Users className="w-3 h-3" />Expected</span><span className="text-white/80 font-medium">{selectedRace.expectedField || 24} cars</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><AlertTriangle className="w-3 h-3" />Caution Risk</span><span className="text-white/80 font-medium">Medium</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-sm text-white/70">{selectedRace ? `${selectedRace.track} - ${selectedRace.expectedField || 24} car field` : 'Select a race'}</span>
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
            <SpotterDataPanel track={selectedRace} />
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
                      {message.role === 'spotter' ? <Eye className="w-3.5 h-3.5 text-white/50" /> : <Car className="w-3.5 h-3.5 text-white/40" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{message.role === 'spotter' ? 'Spotter' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-white/50" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      <span className="text-xs text-white/40">Spotter checking...</span>
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
              placeholder="Ask about race starts, traffic, competitors..." 
              className="flex-1 h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200" 
              onFocus={() => setShowTrackData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className="h-11 px-5 bg-[#3b82f6] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded transition-all duration-200"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
