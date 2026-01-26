
import React from 'react';
import { Plus, Minus, Maximize, LocateFixed } from 'lucide-react';

interface TrackControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    currentZoom: number;
}

export function TrackControls({ onZoomIn, onZoomOut, currentZoom }: TrackControlsProps) {
    return (
        <div className="absolute right-6 top-6 flex flex-col gap-2 bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10">
            <button
                onClick={onZoomIn}
                className="p-2 hover:bg-white/10 rounded-md text-cyan-400 transition-colors"
                title="Zoom In"
            >
                <Plus size={20} />
            </button>

            <div className="text-center text-[10px] font-mono text-cyan-500/70 border-y border-white/5 py-1">
                {Math.round(currentZoom * 100)}%
            </div>

            <button
                onClick={onZoomOut}
                className="p-2 hover:bg-white/10 rounded-md text-cyan-400 transition-colors"
                title="Zoom Out"
            >
                <Minus size={20} />
            </button>

            <div className="h-px bg-white/10 my-1" />

            <button
                className="p-2 hover:bg-white/10 rounded-md text-cyan-400 transition-colors group"
                title="Reset View"
            >
                <Maximize size={20} className="group-hover:scale-110 transition-transform" />
            </button>

            <button
                className="p-2 hover:bg-white/10 rounded-md text-cyan-400 transition-colors"
                title="Follow Car"
            >
                <LocateFixed size={20} />
            </button>
        </div>
    );
}
