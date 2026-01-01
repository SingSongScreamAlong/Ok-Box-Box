// =====================================================================
// Director Presets (Week 10)
// Scene presets for common broadcast moments.
// =====================================================================

import type { BroadcastState, BroadcastCue } from '../../../../server/src/broadcast/broadcast.state';

// =====================================================================
// Preset Definitions
// =====================================================================

export interface DirectorPreset {
    id: string;
    name: string;
    icon: string;
    description: string;
    apply: (currentState: Partial<BroadcastState>) => Partial<BroadcastState>;
}

export const DIRECTOR_PRESETS: DirectorPreset[] = [
    {
        id: 'intro',
        name: 'Intro',
        icon: '🎬',
        description: 'Pre-race grid view',
        apply: () => ({
            featuredDriverId: null,
            featuredBattle: null,
            activeCue: { type: 'timing-tower' as const, payload: {}, expiresAt: null },
            sceneName: 'intro',
            delayMs: 0,
        }),
    },
    {
        id: 'green_flag',
        name: 'Green Flag',
        icon: '🟢',
        description: 'Race start - leader focus',
        apply: (state) => ({
            featuredDriverId: null, // Will be set to leader
            featuredBattle: null,
            activeCue: null,
            sceneName: 'racing',
            delayMs: 0,
        }),
    },
    {
        id: 'battle_focus',
        name: 'Battle Focus',
        icon: '⚔️',
        description: 'Switch to battle mode',
        apply: (state) => ({
            // Keep current battle if set
            featuredBattle: state.featuredBattle || null,
            activeCue: { type: 'battle-box' as const, payload: {}, expiresAt: null },
            sceneName: 'battle',
            delayMs: state.delayMs,
        }),
    },
    {
        id: 'incident',
        name: 'Incident',
        icon: '⚠️',
        description: 'Incident under review',
        apply: (state) => ({
            activeCue: {
                type: 'incident-banner' as const,
                payload: { message: 'INCIDENT UNDER INVESTIGATION' },
                expiresAt: null
            },
            sceneName: 'incident',
            delayMs: Math.max(state.delayMs || 0, 30000), // Auto-increase delay
        }),
    },
    {
        id: 'finish',
        name: 'Finish',
        icon: '🏁',
        description: 'Race finish sequence',
        apply: (state) => ({
            featuredDriverId: null, // Will highlight winner
            featuredBattle: null,
            activeCue: { type: 'lower-third' as const, payload: {}, expiresAt: Date.now() + 10000 },
            sceneName: 'finish',
            delayMs: 0,
        }),
    },
];

// =====================================================================
// Preset Helpers
// =====================================================================

export function getPreset(id: string): DirectorPreset | undefined {
    return DIRECTOR_PRESETS.find(p => p.id === id);
}

export function applyPreset(
    presetId: string,
    currentState: Partial<BroadcastState>
): Partial<BroadcastState> | null {
    const preset = getPreset(presetId);
    if (!preset) return null;
    return preset.apply(currentState);
}

// =====================================================================
// Recommended Overlays Per Preset
// =====================================================================

export const PRESET_OVERLAYS: Record<string, string[]> = {
    intro: ['timing-tower'],
    green_flag: ['timing-tower'],
    battle_focus: ['timing-tower', 'battle-box'],
    incident: ['timing-tower', 'incident-banner'],
    finish: ['timing-tower', 'lower-third'],
};

export function getRecommendedOverlays(presetId: string): string[] {
    return PRESET_OVERLAYS[presetId] || ['timing-tower'];
}
