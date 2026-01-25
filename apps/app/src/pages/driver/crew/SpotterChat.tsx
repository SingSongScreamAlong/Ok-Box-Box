import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { TrackDataPanel } from '../../../components/TrackDataPanel';
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

interface UpcomingRace {
  id: string;
  series: string;
  track: string;
  date: string;
  time: string;
  laps: number;
  weather?: string;
  expectedField: number;
  knownRivals?: string[];
}

const MOCK_UPCOMING_RACES: UpcomingRace[] = [
  { id: '1', series: 'IMSA Pilot Challenge', track: 'Watkins Glen', date: 'Jan 26', time: '8:00 PM', laps: 45, weather: 'Clear', expectedField: 24, knownRivals: ['FastDriver42', 'SpeedKing_99'] },
  { id: '2', series: 'GT3 Sprint', track: 'Spa-Francorchamps', date: 'Jan 27', time: '2:00 PM', laps: 30, weather: 'Overcast', expectedField: 30, knownRivals: ['BelgianRacer', 'EauRouge_Master'] },
  { id: '3', series: 'Porsche Cup', track: 'Laguna Seca', date: 'Jan 28', time: '9:00 PM', laps: 25, weather: 'Sunny', expectedField: 20, knownRivals: ['CorkscrewKing'] },
];

const getSpotterResponse = (userMessage: string, race?: UpcomingRace): string => {
  const msg = userMessage.toLowerCase();
  if (msg.includes('start') || msg.includes('t1') || msg.includes('turn 1')) {
    return `For ${race?.track || 'this track'}, Turn 1 is going to be chaotic with ${race?.expectedField || 24} cars. I'll call "clear inside" or "car outside" - trust the call. We're racing for the finish, not Turn 1.`;
  }
  if (msg.includes('rival') || msg.includes('watch')) {
    const rivals = race?.knownRivals?.join(', ') || 'a few fast drivers';
    return `Watch out for ${rivals}. They tend to be aggressive on restarts and strong in braking zones. I'll call them out by position during the race.`;
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
  const [selectedRace, setSelectedRace] = useState<UpcomingRace | null>(MOCK_UPCOMING_RACES[0]);
  const [showTrackData, setShowTrackData] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

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
    <div className="h-[calc(100vh-8rem)] flex">
      <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Spotter</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Traffic & Awareness</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Upcoming Races
          </h3>
          <div className="space-y-2">
            {MOCK_UPCOMING_RACES.map(race => (
              <button key={race.id} onClick={() => setSelectedRace(race)} className={`w-full text-left p-3 border transition-colors ${selectedRace?.id === race.id ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10' : 'border-white/10 hover:border-white/20 bg-black/20'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{race.track}</span>
                  <span className="text-[10px] text-white/40">{race.date}</span>
                </div>
                <div className="text-[10px] text-white/50">{race.series}</div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{race.expectedField} cars</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Field Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Users className="w-3 h-3" />Expected</span><span className="text-white">{selectedRace.expectedField} cars</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><AlertTriangle className="w-3 h-3" />Rivals</span><span className="text-white">{selectedRace.knownRivals?.length || 0}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-white/80">{selectedRace ? `${selectedRace.track} - ${selectedRace.expectedField} car field` : 'Select a race'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTrackData(true)} className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${showTrackData ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-white/40 hover:text-white'}`}>
              <MapPin className="w-3 h-3 inline mr-1" />Track Data
            </button>
            <button onClick={() => setShowTrackData(false)} className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${!showTrackData ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-white/40 hover:text-white'}`}>
              Chat
            </button>
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white"><Settings2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showTrackData && selectedRace ? (
            <TrackDataPanel track={selectedRace} />
          ) : (
            <div className="p-4 space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 ${message.role === 'user' ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30' : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'spotter' ? <Eye className="w-4 h-4 text-[#3b82f6]" /> : <Car className="w-4 h-4 text-white/60" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{message.role === 'spotter' ? 'Spotter' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#3b82f6]" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                      <span className="text-xs text-white/40">Spotter checking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {quickActions.map(action => (
              <button key={action.label} onClick={() => { setInput(action.prompt); setShowTrackData(false); inputRef.current?.focus(); }} className="flex-shrink-0 px-3 py-1.5 text-xs border border-white/10 text-white/60 hover:text-white hover:border-white/20 flex items-center gap-1">
                {action.label}<ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about race starts, traffic, competitors..." className="flex-1 h-12 px-4 bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#3b82f6]/50" onFocus={() => setShowTrackData(false)} />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className="h-12 px-6 bg-[#3b82f6] text-white font-semibold uppercase tracking-wider text-sm hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
