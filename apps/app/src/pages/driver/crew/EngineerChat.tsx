import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Wrench, Send, ArrowLeft, Calendar, Flag,
  Settings2, Clock, ChevronRight, Loader2,
  Car, Gauge, ThermometerSun
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'engineer';
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
}

// Mock upcoming races - will be replaced with real data
const MOCK_UPCOMING_RACES: UpcomingRace[] = [
  { id: '1', series: 'IMSA Pilot Challenge', track: 'Watkins Glen', date: 'Jan 26', time: '8:00 PM', laps: 45, weather: 'Clear' },
  { id: '2', series: 'GT3 Sprint', track: 'Spa-Francorchamps', date: 'Jan 27', time: '2:00 PM', laps: 30, weather: 'Overcast' },
  { id: '3', series: 'Porsche Cup', track: 'Laguna Seca', date: 'Jan 28', time: '9:00 PM', laps: 25, weather: 'Sunny' },
];

// Mock AI responses - will be replaced with real AI Brain integration
const getEngineerResponse = (userMessage: string, race?: UpcomingRace): string => {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('fuel') || msg.includes('pit')) {
    return `For ${race?.track || 'this track'}, I'm calculating fuel consumption based on your recent laps. At your current pace, you'll need approximately 2.8 gallons per stint. I recommend planning for a pit window around lap ${Math.floor((race?.laps || 30) / 2)} if we're running a two-stop strategy. Want me to run the numbers for a one-stop aggressive strategy?`;
  }
  
  if (msg.includes('setup') || msg.includes('car')) {
    return `I've been analyzing your telemetry from practice. Your corner entry is strong, but I'm seeing some understeer on exit at the high-speed sections. I'd suggest we try softening the rear ARB by 2 clicks and adding a bit more rear wing. This should help rotate the car without sacrificing too much straight-line speed. Should I prepare a baseline setup for you to try?`;
  }
  
  if (msg.includes('strategy') || msg.includes('plan')) {
    return `Looking at the ${race?.laps || 30}-lap race at ${race?.track || 'the track'}, here's my recommendation:\n\n• **Qualifying**: Push for a top-5 grid position to avoid first-lap chaos\n• **Start**: Conservative launch, protect position through T1\n• **Stint 1**: Build gap, manage tires for first ${Math.floor((race?.laps || 30) * 0.4)} laps\n• **Pit Window**: Lap ${Math.floor((race?.laps || 30) / 2)} ± 2 laps depending on traffic\n• **Stint 2**: Push if we have track position, defend if needed\n\nWhat aspect would you like to discuss further?`;
  }
  
  if (msg.includes('tire') || msg.includes('tyre') || msg.includes('wear')) {
    return `Based on your driving style and the track characteristics, I expect front-left to be your limiting tire. At ${race?.track || 'this circuit'}, the long right-handers really work that corner. I'd recommend:\n\n• Smooth inputs through the fast sections\n• Trail brake a bit less into the hairpins\n• Watch your curb usage on exit\n\nThis should extend your stint by 3-4 laps. Want me to set up tire temp alerts for the race?`;
  }
  
  if (msg.includes('weather') || msg.includes('rain')) {
    return `Current forecast shows ${race?.weather || 'mixed conditions'}. I'm monitoring the weather radar and will alert you if anything changes. If rain does come, remember: we'll need to adjust brake bias forward by 2-3% and I'll call the pit for wets. Trust the process - we've practiced this.`;
  }
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hey driver! Good to have you in the briefing room. I've been reviewing the data from your recent sessions. What would you like to discuss? We can talk race strategy, car setup, fuel calculations, or tire management. I'm here to help you prepare.`;
  }
  
  return `I understand. Let me think about that for ${race?.track || 'the upcoming race'}. Based on your driving data and the track characteristics, I'd recommend we focus on consistency over raw pace in the early laps. Build your rhythm, let the tires come in, then we can push when the time is right. What specific aspect would you like me to analyze?`;
};

export function EngineerChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRace, setSelectedRace] = useState<UpcomingRace | null>(MOCK_UPCOMING_RACES[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'engineer',
      content: `Good to see you, ${driverName}. I've been reviewing your recent sessions and preparing for the upcoming races. I see you have ${MOCK_UPCOMING_RACES.length} races on the schedule. Select one from the sidebar and let's start planning your strategy. What would you like to discuss first?`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [driverName]);

  // Auto-scroll to bottom
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

    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    const engineerResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'engineer',
      content: getEngineerResponse(input, selectedRace || undefined),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, engineerResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Race Strategy', prompt: 'What\'s the race strategy for this event?' },
    { label: 'Fuel Plan', prompt: 'Calculate the fuel strategy for this race' },
    { label: 'Setup Tips', prompt: 'Any setup recommendations for this track?' },
    { label: 'Tire Management', prompt: 'How should I manage tire wear?' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Sidebar - Upcoming Races */}
      <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#f97316]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Race Engineer
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Strategy & Setup</p>
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
                    ? 'border-[#f97316]/50 bg-[#f97316]/10'
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
                    <Flag className="w-3 h-3" />
                    {race.laps} laps
                  </span>
                  <span className="flex items-center gap-1">
                    <ThermometerSun className="w-3 h-3" />
                    {race.weather}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats for Selected Race */}
        {selectedRace && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Race Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Clock className="w-3 h-3" />Start Time</span>
                <span className="text-white">{selectedRace.time}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Flag className="w-3 h-3" />Race Length</span>
                <span className="text-white">{selectedRace.laps} laps</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Gauge className="w-3 h-3" />Est. Duration</span>
                <span className="text-white">~{Math.round(selectedRace.laps * 1.8)} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 border-b border-white/10 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-white/80">
              {selectedRace ? `Planning: ${selectedRace.track} - ${selectedRace.series}` : 'Select a race to begin planning'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-4 ${
                  message.role === 'user'
                    ? 'bg-[#f97316]/20 border border-[#f97316]/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {message.role === 'engineer' ? (
                    <Wrench className="w-4 h-4 text-[#f97316]" />
                  ) : (
                    <Car className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {message.role === 'engineer' ? 'Race Engineer' : driverName}
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
                  <Wrench className="w-4 h-4 text-[#f97316]" />
                  <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  <span className="text-xs text-white/40">Engineer is analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
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

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your engineer about strategy, setup, fuel, tires..."
              className="flex-1 h-12 px-4 bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#f97316]/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="h-12 px-6 bg-[#f97316] text-black font-semibold uppercase tracking-wider text-sm hover:bg-[#fb923c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
