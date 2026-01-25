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
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src="/videos/track-left.mp4" type="video/mp4" />
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
            <div className="w-12 h-12 bg-[#3b82f6]/20 border border-[#3b82f6]/40 rounded-sm flex items-center justify-center shadow-lg shadow-[#3b82f6]/10">
              <Eye className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Spotter</h2>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Traffic & Awareness</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Upcoming Races
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
          ) : (
            <div className="space-y-2">
              {upcomingRaces.map(race => (
                <button 
                  key={race.id} 
                  onClick={() => setSelectedRace(race)} 
                  className={`
                    w-full text-left p-3 rounded-sm border transition-all duration-200
                    ${selectedRace?.id === race.id 
                      ? 'border-[#3b82f6]/50 bg-[#3b82f6]/15 shadow-lg shadow-[#3b82f6]/10' 
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
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{race.expectedField || 24} cars</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Field Info</h3>
            <div className="space-y-3 bg-black/30 rounded-sm p-3 border border-white/5">
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Users className="w-3 h-3" />Expected</span><span className="text-white font-medium">{selectedRace.expectedField || 24} cars</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><AlertTriangle className="w-3 h-3" />Caution Risk</span><span className="text-white font-medium">Medium</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
            <span className="text-sm text-white/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{selectedRace ? `${selectedRace.track} - ${selectedRace.expectedField || 24} car field` : 'Select a race'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowTrackData(true)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded-sm ${showTrackData ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-lg shadow-[#3b82f6]/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <MapPin className="w-3 h-3 inline mr-1" />Track Data
            </button>
            <button 
              onClick={() => setShowTrackData(false)} 
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded-sm ${!showTrackData ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-lg shadow-[#3b82f6]/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Chat
            </button>
            <button className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-sm transition-colors"><Settings2 className="w-4 h-4" /></button>
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
                    max-w-[70%] p-4 rounded-sm backdrop-blur-sm shadow-lg
                    ${message.role === 'user' 
                      ? 'bg-[#3b82f6]/15 border border-[#3b82f6]/30 shadow-[#3b82f6]/10' 
                      : 'bg-white/5 border border-white/10'
                    }
                  `}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'spotter' ? <Eye className="w-4 h-4 text-[#3b82f6]" /> : <Car className="w-4 h-4 text-white/60" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/50">{message.role === 'spotter' ? 'Spotter' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-sm backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#3b82f6]" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                      <span className="text-xs text-white/50">Spotter checking...</span>
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
              placeholder="Ask about race starts, traffic, competitors..." 
              className="flex-1 h-12 px-4 bg-black/50 border border-white/10 rounded-sm text-white placeholder-white/30 focus:outline-none focus:border-[#3b82f6]/50 focus:shadow-lg focus:shadow-[#3b82f6]/10 transition-all duration-200" 
              onFocus={() => setShowTrackData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className="h-12 px-6 bg-[#3b82f6] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-sm shadow-lg shadow-[#3b82f6]/30 transition-all duration-200 hover:shadow-xl hover:shadow-[#3b82f6]/40"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
