import React, { useState, useRef, useEffect } from 'react';
import './AI.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface AIAdvisorProps {
    sessionId?: string;
}

const AIAdvisor: React.FC<AIAdvisorProps> = ({ sessionId }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: 'Hi! I\'m your AI racing advisor. Ask me anything about your telemetry, driving technique, or race strategy.',
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
    const token = localStorage.getItem('token');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // If asking about telemetry and we have a session, request analysis
            if (sessionId && (input.toLowerCase().includes('analyz') || input.toLowerCase().includes('telemetry') || input.toLowerCase().includes('lap'))) {
                const res = await fetch(`${backendUrl}/api/ai/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sessionId,
                        analysisType: 'driverCoach'
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const assistantMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: formatAnalysisResponse(data),
                        timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, assistantMessage]);
                } else {
                    throw new Error('Analysis failed');
                }
            } else {
                // Generic AI response (would use OpenAI chat completion in production)
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: getGenericResponse(input),
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Make sure you have a session selected for telemetry analysis, or try again later.',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const formatAnalysisResponse = (data: any): string => {
        let response = `**Analysis Complete**\n\n${data.analysis}\n\n`;

        if (data.recommendations?.length) {
            response += '**Recommendations:**\n';
            data.recommendations.forEach((rec: string, i: number) => {
                response += `${i + 1}. ${rec}\n`;
            });
        }

        if (data.keyInsights?.length) {
            response += '\n**Key Insights:**\n';
            data.keyInsights.forEach((insight: string) => {
                response += `• ${insight}\n`;
            });
        }

        if (data.riskLevel) {
            response += `\n**Risk Level:** ${data.riskLevel}`;
        }

        return response;
    };

    const getGenericResponse = (query: string): string => {
        const q = query.toLowerCase();

        if (q.includes('brake') || q.includes('braking')) {
            return 'Braking technique is crucial. Focus on: trail braking into corners, progressive brake release, and consistent braking points. Would you like me to analyze your recent laps for braking patterns?';
        }
        if (q.includes('corner') || q.includes('turn')) {
            return 'For corner optimization: late apex for better exit speed, smooth steering inputs, and use all the track. Select a session and I can analyze your corner-by-corner performance.';
        }
        if (q.includes('tire') || q.includes('tyre')) {
            return 'Tire management tips: gradual warm-up on out-laps, avoid wheel spin, and balance front/rear temperatures. Monitor your telemetry for temperature deltas across the stint.';
        }
        if (q.includes('setup') || q.includes('suspension')) {
            return 'Setup advice depends on your data. Upload a session and I can identify oversteer/understeer patterns and suggest setup changes.';
        }

        return 'I can help with driving technique, race strategy, telemetry analysis, and setup advice. For detailed analysis, make sure you have a session selected. What would you like to know?';
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="ai-advisor">
            <div className="ai-header">
                <span className="ai-icon">🤖</span>
                <h3>AI Racing Advisor</h3>
                {sessionId && <span className="session-badge">Session Active</span>}
            </div>

            <div className="messages-container">
                {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="message-content">
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                        <div className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant loading">
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your driving, telemetry, or strategy..."
                    disabled={loading}
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
};

export default AIAdvisor;
