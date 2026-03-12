export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

export const WS_BASE = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://app.okboxbox.com');

/** Background video playback rate used on all pitwall pages */
export const VIDEO_PLAYBACK_RATE = 0.6;
