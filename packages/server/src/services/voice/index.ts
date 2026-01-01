/**
 * Voice Services Index
 */

export { VoiceService, getVoiceService, VOICE_PRESETS } from './voice-service.js';
export type { VoiceGenerationRequest, VoiceGenerationResult } from './voice-service.js';

export { WhisperService, getWhisperService } from './whisper-service.js';
export type { TranscriptionRequest, TranscriptionResult, ConversationContext } from './whisper-service.js';
