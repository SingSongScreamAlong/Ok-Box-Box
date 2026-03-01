import React from 'react';
import { BookOpen, Flag, Wrench, Users } from 'lucide-react';

interface TeamPrepPanelProps {
    trackId: string;
}

export const TeamPrepPanel: React.FC<TeamPrepPanelProps> = ({ trackId }) => {
    return (
        <div className="h-full flex flex-col bg-gray-800 text-white border-l border-gray-700">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Team Prep: {trackId === 'daytona' ? 'Daytona RC' : trackId}
                </h2>
                <p className="text-sm text-gray-400 mt-1">Pre-race strategy & notes</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Team Strategy Section */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-yellow-300">
                        <Flag className="w-4 h-4" /> Strategy Goals
                    </h3>
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                        <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                            <li>Target Laptimes: 1:35.5 (Quali), 1:37.0 (Race)</li>
                            <li>Pit Window: Laps 18-22 (Fuel)</li>
                            <li>Tire Wear: High wear on left rear in infield.</li>
                        </ul>
                    </div>
                </div>

                {/* Setup Notes */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-green-300">
                        <Wrench className="w-4 h-4" /> Setup Focus
                    </h3>
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-300 mb-2">Current Baseline: <strong>v1.2 (Low Downforce)</strong></p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-800 p-2 rounded"><strong>Aero:</strong> Low Drag</div>
                            <div className="bg-gray-800 p-2 rounded"><strong>Brake Bias:</strong> 54.5%</div>
                            <div className="bg-gray-800 p-2 rounded"><strong>TC:</strong> 4 (Race)</div>
                            <div className="bg-gray-800 p-2 rounded"><strong>ABS:</strong> 3</div>
                        </div>
                    </div>
                </div>

                {/* Track Notes / Knowledge Base */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-300">
                        <BookOpen className="w-4 h-4" /> Knowledge Base
                    </h3>
                    <div className="space-y-2">
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 hover:border-purple-500 cursor-pointer transition-colors">
                            <h4 className="font-medium text-purple-200 text-sm">Turn 1 Braking Reference</h4>
                            <p className="text-xs text-gray-400 mt-1">Look for the transition in pavement color just after the start/finish line...</p>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 hover:border-purple-500 cursor-pointer transition-colors">
                            <h4 className="font-medium text-purple-200 text-sm">Bus Stop Entry Speed</h4>
                            <p className="text-xs text-gray-400 mt-1">Take as much curb as possible on the right, sacrifice exit for stability.</p>
                        </div>
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900">
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Edit Notes
                </button>
            </div>
        </div>
    );
};
