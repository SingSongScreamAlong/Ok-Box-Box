import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { AnalystDataPanel } from '../../../components/AnalystDataPanel';
import { fetchDriverSessions } from '../../../lib/driverService';
import { 
  BarChart3, Send, ArrowLeft, Calendar,
  Settings2, ChevronRight, Loader2,
  Car, TrendingUp, TrendingDown, Target, Clock, MapPin
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'analyst';
  content: string;
  timestamp: Date;
}

interface SessionForPanel {
  id: string;
  track: string;
  series: string;
  date: string;
  time: string;
  laps: number;
  weather?: string;
  position: number;
  started: number;
  bestLap: string;
  consistency: number;
  incidents: number;
}

const getAnalystResponse = (userMessage: string, session?: SessionForPanel): string => {
  const msg = userMessage.toLowerCase();
  if (msg.includes('lap') || msg.includes('pace')) {
    return `Looking at your lap times from ${session?.track || 'recent sessions'}:\n\n **Best Lap**: ${session?.bestLap || '--:--.---'}\n **Consistency**: ${session?.consistency || 85}%\n\nI noticed patterns in your sector times. Want me to break down where you're losing time?`;
  }
  if (msg.includes('improve') || msg.includes('better')) {
    return `Based on your data, top 3 areas for improvement:\n\n1. **Trail Braking**: Keep 10-15% brake deeper into corners\n2. **Throttle Application**: Commit earlier on exit\n3. **Consistency in Traffic**: Your pace drops when cars are nearby`;
  }
  if (msg.includes('debrief') || msg.includes('review')) {
    return `**Session Debrief: ${session?.track || 'Recent Race'}**\n\n Started: P${session?.started || 8}  Finished: P${session?.position || 5}\n Best Lap: ${session?.bestLap || '--:--.---'}\n Incidents: ${session?.incidents || 0}x\n\n${session && session.position < session.started ? 'Good race craft - you gained positions.' : 'Focus on qualifying pace to start higher.'}`;
  }
  if (msg.includes('hello') || msg.includes('hi')) {
    return `Driver, analyst here. I've been crunching the numbers from your recent sessions. Select a session to see track data, or switch to Chat to discuss performance.`;
  }
  return `I've analyzed your data from ${session?.track || 'recent sessions'}. Your finishing position of P${session?.position || 5} from P${session?.started || 8} shows ${session && session.position < session.started ? 'strong race craft' : 'room for improvement'}. Would you like me to break down specific sectors?`;
};

export function AnalystChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState<SessionForPanel[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionForPanel | null>(null);
  const [showTrackData, setShowTrackData] = useState(true);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const driverName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Driver';

  useEffect(() => {
    fetchDriverSessions().then(rawSessions => {
      const mapped: SessionForPanel[] = rawSessions.slice(0, 5).map((s, i) => ({
        id: s.sessionId || String(i),
        track: s.trackName,
        series: s.seriesName,
        date: new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(s.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        laps: 30,
        position: s.finishPos || 0,
        started: s.startPos || 0,
        bestLap: '--:--.---',
        consistency: Math.floor(75 + Math.random() * 20),
        incidents: s.incidents || 0,
      }));
      setSessions(mapped);
      if (mapped.length > 0) setSelectedSession(mapped[0]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      role: 'analyst',
      content: `${driverName}, I've compiled your recent session data. Select a session to see track data and performance metrics, or switch to Chat to discuss improvements.`,
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
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 1500));
    const analystResponse: Message = { id: (Date.now() + 1).toString(), role: 'analyst', content: getAnalystResponse(input, selectedSession || undefined), timestamp: new Date() };
    setIsTyping(false);
    setMessages(prev => [...prev, analystResponse]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    { label: 'Session Debrief', prompt: 'Give me a full debrief' },
    { label: 'Lap Analysis', prompt: 'Analyze my lap times' },
    { label: 'Improvement Areas', prompt: 'Where can I improve?' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link to="/driver/home" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />Back to Operations
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Performance Analyst</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Data & Insights</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Recent Sessions
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button key={session.id} onClick={() => setSelectedSession(session)} className={`w-full text-left p-3 border transition-colors ${selectedSession?.id === session.id ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/10' : 'border-white/10 hover:border-white/20 bg-black/20'}`}>
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
          )}
        </div>
        {selectedSession && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-3">Session Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Target className="w-3 h-3" />Best Lap</span><span className="text-white font-mono">{selectedSession.bestLap}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><BarChart3 className="w-3 h-3" />Consistency</span><span className="text-white">{selectedSession.consistency}%</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/50 flex items-center gap-2"><Clock className="w-3 h-3" />Incidents</span><span className={selectedSession.incidents > 2 ? 'text-red-400' : 'text-white'}>{selectedSession.incidents}x</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-white/80">{selectedSession ? `${selectedSession.track} - ${selectedSession.series}` : 'Select a session'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTrackData(true)} className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${showTrackData ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'text-white/40 hover:text-white'}`}>
              <MapPin className="w-3 h-3 inline mr-1" />Track Data
            </button>
            <button onClick={() => setShowTrackData(false)} className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${!showTrackData ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'text-white/40 hover:text-white'}`}>
              Chat
            </button>
            <button className="p-2 hover:bg-white/5 text-white/40 hover:text-white"><Settings2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showTrackData && selectedSession ? (
            <AnalystDataPanel track={selectedSession} />
          ) : (
            <div className="p-4 space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 ${message.role === 'user' ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/30' : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {message.role === 'analyst' ? <BarChart3 className="w-4 h-4 text-[#8b5cf6]" /> : <Car className="w-4 h-4 text-white/60" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{message.role === 'analyst' ? 'Analyst' : driverName}</span>
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
            <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask about lap times, consistency, improvements..." className="flex-1 h-12 px-4 bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#8b5cf6]/50" onFocus={() => setShowTrackData(false)} />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className="h-12 px-6 bg-[#8b5cf6] text-white font-semibold uppercase tracking-wider text-sm hover:bg-[#a78bfa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
