import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { AnalystDataPanel } from '../../../components/AnalystDataPanel';
import { fetchDriverSessions } from '../../../lib/driverService';
import { 
  BarChart3, Send, ArrowLeft, Calendar,
  Settings2, ChevronRight, Loader2,
  Car, TrendingUp, TrendingDown, Target, Clock, MapPin, Wrench, Eye
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

// AI responses will come from the backend API when implemented
const getAnalystResponse = (): string => {
  return 'Analyst AI responses coming soon. This feature is under development.';
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
        consistency: 0, // Will come from API when implemented
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
    const analystResponse: Message = { id: (Date.now() + 1).toString(), role: 'analyst', content: getAnalystResponse(), timestamp: new Date() };
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
          <source src="/videos/track-right.mp4" type="video/mp4" />
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
              <BarChart3 className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/90" style={{ fontFamily: 'Orbitron, sans-serif' }}>Performance Analyst</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Data & Insights</p>
            </div>
          </div>
        </div>
        
        {/* Crew Navigation Tabs */}
        <div className="p-3 border-b border-white/[0.06]">
          <div className="flex gap-1">
            <Link 
              to="/driver/crew/engineer"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-medium bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70 transition-colors"
            >
              <Wrench className="w-3 h-3" />
              Engineer
            </Link>
            <Link 
              to="/driver/crew/spotter"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-medium bg-white/[0.03] text-white/50 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Spotter
            </Link>
            <Link 
              to="/driver/crew/analyst"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-medium bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30"
            >
              <BarChart3 className="w-3 h-3" />
              Analyst
            </Link>
          </div>
        </div>
        
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />Recent Sessions
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button 
                  key={session.id} 
                  onClick={() => setSelectedSession(session)} 
                  className={`
                    w-full text-left p-3 rounded border transition-all duration-200
                    ${selectedSession?.id === session.id 
                      ? 'border-white/20 bg-white/[0.06]' 
                      : 'border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03] bg-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/90">{session.track}</span>
                    <span className="text-[10px] text-white/40">{session.date}</span>
                  </div>
                  <div className="text-[10px] text-white/50">{session.series}</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className={`flex items-center gap-1 ${session.position < session.started ? 'text-emerald-400' : 'text-red-400'}`}>
                      {session.position < session.started ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      P{session.position}
                    </span>
                    <span className="text-white/30">from P{session.started}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedSession && (
          <div className="p-4 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3">Session Stats</h3>
            <div className="space-y-3 bg-white/[0.02] rounded p-3 border border-white/[0.06]">
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Target className="w-3 h-3" />Best Lap</span><span className="text-white/80 font-mono font-medium">{selectedSession.bestLap}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><BarChart3 className="w-3 h-3" />Consistency</span><span className="text-white/80 font-medium">{selectedSession.consistency}%</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-white/40 flex items-center gap-2"><Clock className="w-3 h-3" />Incidents</span><span className={`font-medium ${selectedSession.incidents > 2 ? 'text-red-400' : 'text-white/80'}`}>{selectedSession.incidents}x</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-sm text-white/70">{selectedSession ? `${selectedSession.track} - ${selectedSession.series}` : 'Select a session'}</span>
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
          {showTrackData && selectedSession ? (
            <AnalystDataPanel track={selectedSession} />
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
                      {message.role === 'analyst' ? <BarChart3 className="w-3.5 h-3.5 text-white/50" /> : <Car className="w-3.5 h-3.5 text-white/40" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/40">{message.role === 'analyst' ? 'Analyst' : driverName}</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-white/50" />
                      <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      <span className="text-xs text-white/40">Analyst crunching numbers...</span>
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
              placeholder="Ask about lap times, consistency, improvements..." 
              className="flex-1 h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200" 
              onFocus={() => setShowTrackData(false)} 
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className="h-11 px-5 bg-[#8b5cf6] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded transition-all duration-200"
            >
              <Send className="w-4 h-4" />Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
