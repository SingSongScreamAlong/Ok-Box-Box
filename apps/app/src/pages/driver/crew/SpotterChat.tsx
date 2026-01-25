import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
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
  expectedField: number;
  knownRivals?: string[];
}

const MOCK_UPCOMING_RACES: UpcomingRace[] = [
  { id: '1', series: 'IMSA Pilot Challenge', track: 'Watkins Glen', date: 'Jan 26', time: '8:00 PM', expectedField: 24, knownRivals: ['FastDriver42', 'SpeedKing_99'] },
  { id: '2', series: 'GT3 Sprint', track: 'Spa-Francorchamps', date: 'Jan 27', time: '2:00 PM', expectedField: 30, knownRivals: ['BelgianRacer', 'EauRouge_Master'] },
  { id: '3', series: 'Porsche Cup', track: 'Laguna Seca', date: 'Jan 28', time: '9:00 PM', expectedField: 20, knownRivals: ['CorkscrewKing'] },
];

const getSpotterResponse = (userMessage: string, race?: UpcomingRace): string => {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('start') || msg.includes('launch') || msg.includes('t1') || msg.includes('turn 1')) {
    return `Copy that. For ${race?.track || 'this track'}, Turn 1 is going to be chaotic with ${race?.expectedField || 24} cars. Here's what I'm watching for:\n\n• **Inside line**: Expect dive-bombers. Leave room or you'll get collected\n• **Outside line**: Safer but you'll lose positions if you're too conservative\n• **My call**: I'll tell you "clear inside" or "car outside" - trust the call\n\nRemember, we're racing for the finish, not Turn 1. Let's keep it clean and pick them off later.`;
  }
  
  if (msg.includes('rival') || msg.includes('competitor') || msg.includes('watch')) {
    const rivals = race?.knownRivals?.join(', ') || 'a few fast drivers';
    return `I've got eyes on the entry list. Watch out for ${rivals}. Based on their recent races:\n\n• They tend to be aggressive on restarts\n• Strong in the braking zones\n• Sometimes overcommit in traffic\n\nI'll call them out by position during the race. "P3 is the aggressive one" - you'll know who I mean.`;
  }
  
  if (msg.includes('traffic') || msg.includes('lapped') || msg.includes('backmarker')) {
    return `Traffic management at ${race?.track || 'this track'} - here's the plan:\n\n• I'll give you early warnings: "Slower car ahead, 3 seconds"\n• Blue flags mean they should let you by, but don't count on it\n• Best passing zones: main straight and any heavy braking areas\n• If they're fighting, I'll say "two cars battling ahead" - give them room\n\nPatience with traffic wins races. We'll get through clean.`;
  }
  
  if (msg.includes('position') || msg.includes('gap') || msg.includes('battle')) {
    return `During the race, I'll keep you updated on:\n\n• Gap to car ahead (every lap or on request)\n• Gap to car behind (when they're closing)\n• Position in class and overall\n• Pit window status of competitors\n\nJust say "gaps" and I'll give you the full picture. Focus on your driving, I've got the situational awareness covered.`;
  }
  
  if (msg.includes('incident') || msg.includes('crash') || msg.includes('yellow') || msg.includes('caution')) {
    return `If there's an incident, here's our protocol:\n\n• "YELLOW YELLOW YELLOW" - slow down immediately\n• "Debris left/right" - avoid that side of the track\n• "Car stopped at [corner]" - I'll guide you around\n• "Full course caution" - maintain position, no passing\n\nI'm watching the whole field. You focus on what's in front, I'll warn you about everything else.`;
  }
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hey driver, spotter here. I've been studying the track layout and entry list for your upcoming races. ${race?.expectedField || 24} cars expected at ${race?.track || 'the track'}. What do you want to go over? We can talk race starts, traffic management, or I can brief you on the competition.`;
  }
  
  return `Got it. For ${race?.track || 'this race'}, I'll be your eyes on the field. With ${race?.expectedField || 24} cars, there's going to be action everywhere. I'll keep my calls short and clear - "clear left", "hold your line", "car inside". Trust the calls and we'll get through clean. What else do you need to know?`;
};

export function SpotterChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRace, setSelectedRace] = useState<UpcomingRace | null>(MOCK_UPCOMING_RACES[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'spotter',
      content: `${driverName}, spotter checking in. I've got the entry lists pulled up and I'm ready to brief you on the competition. Select a race from the sidebar and let's talk through the start, traffic situations, and who to watch out for. What's on your mind?`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [driverName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

    const spotterResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'spotter',
      content: getSpotterResponse(input, selectedRace || undefined),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, spotterResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Race Start Plan', prompt: 'Brief me on the Turn 1 approach' },
    { label: 'Who to Watch', prompt: 'Who are the rivals I should watch out for?' },
    { label: 'Traffic Tips', prompt: 'How should we handle lapped traffic?' },
    { label: 'Incident Protocol', prompt: 'What\'s our plan if there\'s a yellow?' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Spotter
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Traffic & Awareness</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Upcoming Races
          </h3>
          <div className="space-y-2">
            {MOCK_UPCOMING_RACES.map(race => (
              <button
                key={race.id}
                onClick={() => setSelectedRace(race)}
                className={`w-full text-left p-3 border transition-colors ${
                  selectedRace?.id === race.id
                    ? 'border-[#3b82f6]/50 bg-[#3b82f6]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{race.track}</span>
                  <span className="text-[10px] text-white/40">{race.date}</span>
                </div>
                <div className="text-[10px] text-white/50">{race.series}</div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {race.expectedField} cars
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Field Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Users className="w-3 h-3" />Expected Cars</span>
                <span className="text-white">{selectedRace.expectedField}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><AlertTriangle className="w-3 h-3" />Key Rivals</span>
                <span className="text-white">{selectedRace.knownRivals?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><MapPin className="w-3 h-3" />Track</span>
                <span className="text-white text-right">{selectedRace.track}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-white/80">
              {selectedRace ? `Briefing: ${selectedRace.track} - ${selectedRace.expectedField} car field` : 'Select a race to begin'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-4 ${
                  message.role === 'user'
                    ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {message.role === 'spotter' ? (
                    <Eye className="w-4 h-4 text-[#3b82f6]" />
                  ) : (
                    <Car className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {message.role === 'spotter' ? 'Spotter' : driverName}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
                  <span className="text-xs text-white/40">Spotter checking data...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  setInput(action.prompt);
                  inputRef.current?.focus();
                }}
                className="flex-shrink-0 px-3 py-1.5 text-xs border border-white/10 text-white/60 hover:text-white hover:border-white/20 flex items-center gap-1"
              >
                {action.label}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about race starts, traffic, competitors..."
              className="flex-1 h-12 px-4 bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#3b82f6]/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="h-12 px-6 bg-[#3b82f6] text-white font-semibold uppercase tracking-wider text-sm hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
