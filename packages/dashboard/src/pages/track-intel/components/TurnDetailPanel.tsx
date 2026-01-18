import React from 'react';
import { X, TrendingUp, AlertTriangle, BookOpen, Settings } from 'lucide-react';

interface TurnDetailPanelProps {
    turn: any;
    onClose: () => void;
}

export const TurnDetailPanel: React.FC<TurnDetailPanelProps> = ({ turn, onClose }) => {
    // Safety check for missing detailed data
    const perfStart = turn.performance_data?.gt3 || {}; // Default to GT3 for demo

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <span className="text-racing-green font-mono text-sm font-bold">TURN {turn.number}</span>
                        <h2 className="text-3xl font-racing text-white mt-1">{turn.name}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-zinc-300 border border-white/10">{turn.type}</span>
                    <span className={`px-2 py-1 rounded text-xs border border-white/10 ${turn.difficulty === 'Hard' ? 'bg-red-500/20 text-red-200' :
                            turn.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-green-500/20 text-green-200'
                        }`}>
                        {turn.difficulty} Difficulty
                    </span>
                </div>
                <p className="mt-4 text-zinc-400 text-sm leading-relaxed border-l-2 border-racing-blue pl-3 py-1 bg-gradient-to-r from-racing-blue/5 to-transparent">
                    {turn.description}
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Performance Card */}
                {turn.performance_data && (
                    <section className="bg-white/5 rounded-xl p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-racing-blue" size={18} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Target Metrics (GT3)</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-black/20 rounded-lg">
                                <div className="text-xs text-zinc-500 mb-1">Entry Speed</div>
                                <div className="text-xl font-mono text-white">{perfStart.entry_speed_kph || '-'} <span className="text-xs text-zinc-600">kph</span></div>
                            </div>
                            <div className="text-center p-3 bg-black/20 rounded-lg">
                                <div className="text-xs text-zinc-500 mb-1">Apex Speed</div>
                                <div className="text-xl font-mono text-racing-green">{perfStart.apex_speed_kph || '-'} <span className="text-xs text-zinc-600">kph</span></div>
                            </div>
                            <div className="text-center p-3 bg-black/20 rounded-lg">
                                <div className="text-xs text-zinc-500 mb-1">Gear</div>
                                <div className="text-xl font-mono text-racing-yellow">{perfStart.gear || '-'}</div>
                            </div>
                        </div>
                        <div className="text-sm">
                            <span className="text-zinc-500 block mb-1">Braking Point:</span>
                            <span className="text-white bg-red-900/30 px-2 py-0.5 rounded text-xs border border-red-500/30">{perfStart.braking_point || 'N/A'}</span>
                        </div>
                        <div className="text-sm mt-3">
                            <span className="text-zinc-500 block mb-1">Racing Line:</span>
                            <p className="text-zinc-300 leading-relaxed">{perfStart.racing_line || 'No data available.'}</p>
                        </div>
                    </section>
                )}

                {/* Coaching Notes */}
                {turn.coaching_notes && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="text-racing-yellow" size={18} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Instructor Notes</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5">
                                <div className="text-xs font-bold text-racing-green mb-1">BEGINNER</div>
                                <p className="text-sm text-zinc-300">{turn.coaching_notes.beginner}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5">
                                <div className="text-xs font-bold text-racing-blue mb-1">ADVANCED / PRO</div>
                                <p className="text-sm text-zinc-300">{turn.coaching_notes.advanced}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Setup Tips */}
                {turn.setup_recommendations && (
                    <section className="bg-white/5 rounded-xl p-5 border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="text-zinc-400" size={18} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Setup Guide</h3>
                        </div>
                        <ul className="space-y-3">
                            {Object.entries(turn.setup_recommendations).map(([key, value]) => (
                                <li key={key} className="text-sm">
                                    <span className="text-zinc-400 capitalize block mb-0.5">{key}:</span>
                                    <span className="text-zinc-200">{value as string}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Common Mistakes */}
                {turn.common_mistakes && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="text-red-400" size={18} />
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Common Mistakes</h3>
                        </div>
                        <ul className="list-disc list-outside pl-4 space-y-2 text-sm text-zinc-400 marker:text-red-500">
                            {turn.common_mistakes.map((mistake: string, i: number) => (
                                <li key={i}>{mistake}</li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
