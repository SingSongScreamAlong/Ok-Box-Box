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
                    Team Prep: {trackId}
                </h2>
                <p className="text-sm text-gray-400 mt-1">Pre-race strategy & notes</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Team Strategy Section */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-yellow-300">
                        <Flag className="w-4 h-4" /> Strategy Goals
                    </h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                        <Flag className="w-6 h-6 text-yellow-300/30 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No strategy goals set for this event</p>
                        <p className="text-xs text-gray-500 mt-1">Strategy data will appear here once an active race plan is configured</p>
                    </div>
                </div>

                {/* Setup Notes */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-green-300">
                        <Wrench className="w-4 h-4" /> Setup Focus
                    </h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                        <Wrench className="w-6 h-6 text-green-300/30 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No setup notes available</p>
                        <p className="text-xs text-gray-500 mt-1">Upload team setups to see configuration details here</p>
                    </div>
                </div>

                {/* Track Notes / Knowledge Base */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-300">
                        <BookOpen className="w-4 h-4" /> Knowledge Base
                    </h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center">
                        <BookOpen className="w-6 h-6 text-purple-300/30 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No track notes yet</p>
                        <p className="text-xs text-gray-500 mt-1">Track notes and coaching insights will appear after completing sessions</p>
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
