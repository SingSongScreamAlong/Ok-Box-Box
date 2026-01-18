import React from 'react';
import { X } from 'lucide-react';

interface TurnData {
    number: string;
    name: string;
    description: string;
    idealLine: string;
    brakingPoint: string;
    gear: number;
    speed: number;
}

interface TurnDetailPanelProps {
    turn: TurnData;
    onClose: () => void;
}

export const TurnDetailPanel: React.FC<TurnDetailPanelProps> = ({ turn, onClose }) => {
    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Turn {turn.number}: {turn.name}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-6 text-gray-300">
                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Analysis</h3>
                    <p className="leading-relaxed">{turn.description}</p>
                </section>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Target Speed</div>
                        <div className="text-2xl font-mono text-white">{turn.speed} mph</div>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Target Gear</div>
                        <div className="text-2xl font-mono text-white">{turn.gear}</div>
                    </div>
                </div>

                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Ideal Line</h3>
                    <p>{turn.idealLine}</p>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Braking Point</h3>
                    <p>{turn.brakingPoint}</p>
                </section>
            </div>
        </div>
    );
};
