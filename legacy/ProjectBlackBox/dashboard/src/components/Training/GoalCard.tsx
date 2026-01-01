
import React from 'react';

interface GoalCardProps {
    goal: {
        id: string;
        title: string;
        description: string;
        type: string;
        targetValue: number;
        currentValue: number;
        progress: number;
        metrics: any;
    };
}

const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
    const percent = Math.min(100, Math.max(0, goal.progress * 100));

    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 shadow-lg border border-gray-700">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                    <p className="text-gray-400 text-sm">{goal.description}</p>
                </div>
                <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded uppercase font-semibold">
                    {goal.type}
                </span>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Current: {goal.currentValue.toFixed(1)}</span>
                    <span>Target: {goal.targetValue.toFixed(1)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                    ></div>
                </div>
                <div className="text-right mt-1 text-xs text-green-400 font-bold">
                    {percent.toFixed(0)}%
                </div>
            </div>
        </div>
    );
};

export default GoalCard;
