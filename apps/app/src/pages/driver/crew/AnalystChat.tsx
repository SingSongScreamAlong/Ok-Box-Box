import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  BarChart3, Send, ArrowLeft, Calendar, 
  Settings2, ChevronRight, Loader2,
  Car, TrendingUp, TrendingDown, Target, Clock
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'analyst';
  content: string;
  timestamp: Date;
}

interface RecentSession {
  id: string;
  track: string;
  series: string;
  date: string;
  position: number;
  started: number;
  bestLap: string;
  consistency: number;
  incidents: number;
}

const MOCK_RECENT_SESSIONS: RecentSession[] = [
  { id: '1', track: 'Road America', series: 'IMSA Pilot Challenge', date: 'Jan 24', position: 5, started: 8, bestLap: '2:14.532', consistency: 87, incidents: 2 },
  { id: '2', track: 'Monza', series: 'GT3 Sprint', date: 'Jan 23', position: 12, started: 15, bestLap: '1:48.891', consistency: 92, incidents: 0 },
  { id: '3', track: 'Suzuka', series: 'Porsche Cup', date: 'Jan 22', position: 3, started: 6, bestLap: '2:01.234', consistency: 78, incidents: 4 },
];

const getAnalystResponse = (userMessage: string, session?: RecentSession): string => {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('lap') || msg.includes('time') || msg.includes('pace')) {
    return `Looking at your lap times from ${session?.track || 'recent sessions'}:\n\n• **Best Lap**: ${session?.bestLap || '2:14.532'}\n• **Consistency**: ${session?.consistency || 85}% of laps within 1 second of your best\n• **Trend**: Your pace improved through the stint\n\nI noticed you're losing about 0.3s in Sector 2. The data shows you're braking too early into the chicane. Want me to pull up the sector comparison?`;
  }
  
  if (msg.includes('consistency') || msg.includes('variation')) {
    return `Your consistency score for ${session?.track || 'this session'} was ${session?.consistency || 85}%.\n\nBreaking it down:\n• **Sector 1**: Very consistent, ±0.2s variation\n• **Sector 2**: Some variation, ±0.5s - likely traffic or tire deg\n• **Sector 3**: Inconsistent, ±0.8s - this is where you can improve\n\nThe data suggests you're overdriving in the final sector when tires are worn. Try backing off 5% in the last 10 laps.`;
  }
  
  if (msg.includes('incident') || msg.includes('contact') || msg.includes('crash')) {
    return `Incident analysis for ${session?.track || 'recent races'}:\n\n• **Total Incidents**: ${session?.incidents || 2}x\n• **Pattern**: Most occur in heavy braking zones\n• **Contributing Factors**: Aggressive positioning in traffic\n\nRecommendation: Give yourself an extra car length in braking zones when battling. The data shows you're often the faster car - patience will pay off.`;
  }
  
  if (msg.includes('improve') || msg.includes('better') || msg.includes('faster')) {
    return `Based on your data, here are the top 3 areas for improvement:\n\n1. **Trail Braking**: You're releasing the brake too early. Keep 10-15% brake pressure deeper into corners.\n\n2. **Throttle Application**: Your throttle traces show hesitation on exit. Commit earlier and let the car rotate.\n\n3. **Consistency in Traffic**: Your pace drops 1.5s when cars are nearby. Work on maintaining rhythm regardless of pressure.\n\nWant me to create a practice plan targeting these areas?`;
  }
  
  if (msg.includes('compare') || msg.includes('versus') || msg.includes('vs')) {
    return `Comparing your recent performances:\n\n| Track | Position | vs Grid | Incidents | Consistency |\n|-------|----------|---------|-----------|-------------|\n| Road America | P5 | +3 | 2x | 87% |\n| Monza | P12 | +3 | 0x | 92% |\n| Suzuka | P3 | +3 | 4x | 78% |\n\n**Trend**: You consistently gain positions from your grid slot. Your race craft is strong. Focus on qualifying pace to start higher.`;
  }
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Driver, analyst here. I've been crunching the numbers from your recent sessions. Your overall trend is positive - you're gaining positions in races consistently. Select a session from the sidebar and I can give you detailed insights on lap times, consistency, and areas for improvement.`;
  }
  
  if (msg.includes('debrief') || msg.includes('review') || msg.includes('summary')) {
    return `**Session Debrief: ${session?.track || 'Recent Race'}**\n\n📊 **Results**\n• Started: P${session?.started || 8} → Finished: P${session?.position || 5}\n• Best Lap: ${session?.bestLap || '2:14.532'}\n• Incidents: ${session?.incidents || 2}x\n\n📈 **Positives**\n• Strong race pace, gained ${(session?.started || 8) - (session?.position || 5)} positions\n• Good tire management in final stint\n\n📉 **Areas to Work On**\n• Qualifying pace (starting too far back)\n• Incident avoidance in opening laps\n\nOverall: Solid performance. Keep building on this momentum.`;
  }
  
  return `I've analyzed your data from ${session?.track || 'recent sessions'}. Your finishing position of P${session?.position || 5} from P${session?.started || 8} shows strong race craft. The telemetry indicates room for improvement in qualifying trim - you're leaving time on the table in the fast corners. Would you like me to break down specific sectors or compare against your previous visits to this track?`;
};

export function AnalystChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSession, setSelectedSession] = useState<RecentSession | null>(MOCK_RECENT_SESSIONS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'analyst',
      content: `${driverName}, I've compiled the data from your recent sessions. You've shown consistent improvement - gaining an average of 3 positions per race. Select a session from the sidebar and let's dive into the details. What would you like to analyze first?`,
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

    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 1500));

    const analystResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'analyst',
      content: getAnalystResponse(input, selectedSession || undefined),
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, analystResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Session Debrief', prompt: 'Give me a full debrief of this session' },
    { label: 'Lap Analysis', prompt: 'Analyze my lap times and pace' },
    { label: 'Improvement Areas', prompt: 'Where can I improve the most?' },
    { label: 'Compare Sessions', prompt: 'Compare my recent performances' },
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
            <div className="w-10 h-10 bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Performance Analyst
              </h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Data & Insights</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Recent Sessions
          </h3>
          <div className="space-y-2">
            {MOCK_RECENT_SESSIONS.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left p-3 border transition-colors ${
                  selectedSession?.id === session.id
                    ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{session.track}</span>
                  <span className="text-[10px] text-white/40">{session.date}</span>
                </div>
                <div className="text-[10px] text-white/50">{session.series}</div>
                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className={`flex items-center gap-1 ${session.position < session.started ? 'text-green-400' : 'text-red-400'}`}>
                    {session.position < session.started ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    P{session.position}
                  </span>
                  <span className="text-white/40">from P{session.started}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedSession && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Session Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Target className="w-3 h-3" />Best Lap</span>
                <span className="text-white font-mono">{selectedSession.bestLap}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><BarChart3 className="w-3 h-3" />Consistency</span>
                <span className="text-white">{selectedSession.consistency}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 flex items-center gap-2"><Clock className="w-3 h-3" />Incidents</span>
                <span className={selectedSession.incidents > 2 ? 'text-red-400' : 'text-white'}>{selectedSession.incidents}x</span>
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
              {selectedSession ? `Analyzing: ${selectedSession.track} - ${selectedSession.series}` : 'Select a session to analyze'}
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
                    ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {message.role === 'analyst' ? (
                    <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
                  ) : (
                    <Car className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {message.role === 'analyst' ? 'Performance Analyst' : driverName}
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
                  <BarChart3 className="w-4 h-4 text-[#8b5cf6]" />
                  <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  <span className="text-xs text-white/40">Analyst crunching numbers...</span>
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
              placeholder="Ask about lap times, consistency, improvements..."
              className="flex-1 h-12 px-4 bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#8b5cf6]/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="h-12 px-6 bg-[#8b5cf6] text-white font-semibold uppercase tracking-wider text-sm hover:bg-[#a78bfa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
