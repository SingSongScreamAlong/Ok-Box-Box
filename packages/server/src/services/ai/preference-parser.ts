/**
 * Preference Parser Service
 * Uses LLM to naturally detect driver preference changes from conversation
 * and updates driver_memory accordingly
 */

import { updateDriverMemory, logMemoryEvent, getDriverMemory } from '../../db/repositories/driver-memory.repo.js';
import { chatCompletion } from './llm-service.js';

// Preference categories that can be updated via voice
interface PreferenceUpdate {
    field: string;
    value: string | boolean | number;
    confirmation: string;
}

interface ParseResult {
    isPreferenceChange: boolean;
    updates: PreferenceUpdate[];
    acknowledgment: string;
}

// Schema for LLM to extract preferences
const PREFERENCE_SCHEMA = `
You are analyzing a driver's message to their race engineer/spotter to detect if they're expressing a preference about HOW they want to be communicated with.

ONLY extract preferences if the driver is clearly expressing how they want the engineer/spotter to behave differently. 
Do NOT extract preferences from normal racing questions or commands.

Extractable preferences:
1. preferred_callout_frequency: "minimal" | "moderate" | "frequent"
   - Driver wants less radio chatter, fewer updates, peace and quiet → "minimal"
   - Driver wants more updates, keep them informed, talk more → "frequent"
   
2. preferred_feedback_style: "brief" | "detailed" | "blunt" | "motivational" | "balanced"
   - Driver wants short/quick answers → "brief"
   - Driver wants full explanations, all the details → "detailed"  
   - Driver wants no sugarcoating, straight talk, brutal honesty → "blunt"
   - Driver wants encouragement, positive reinforcement → "motivational"

3. needs_confidence_building: true | false
   - Driver seems nervous, asks for reassurance, needs support → true
   - Driver says they're fine, don't need pep talks, confident → false

4. prefers_data_vs_feeling: "data" | "feeling" | "balanced"
   - Driver wants numbers, stats, telemetry focus → "data"
   - Driver wants feel-based descriptions, less numbers → "feeling"

5. responds_well_to_criticism: true | false
   - Driver asks to be pushed harder, wants tough love → true
   - Driver asks to go easy, be gentle, constructive only → false

Respond with JSON only. If no preference is being expressed, return: {"preferences": []}

If preferences detected, return:
{
  "preferences": [
    {"field": "field_name", "value": "value", "reason": "why you detected this"}
  ]
}

Examples of what IS a preference:
- "Dude you're talking too much" → preferred_callout_frequency: "minimal"
- "I need you to just give me the basics" → preferred_feedback_style: "brief"
- "Stop babying me, tell me when I screw up" → responds_well_to_criticism: true
- "I'm feeling really nervous about this race" → needs_confidence_building: true
- "Just tell me the lap times, skip the commentary" → prefers_data_vs_feeling: "data"

Examples of what is NOT a preference (normal racing talk):
- "What's my gap to the car ahead?" → No preference
- "How many laps of fuel do I have?" → No preference
- "Box this lap" → No preference
- "That guy just dive bombed me!" → No preference
`;

/**
 * Use LLM to naturally parse preferences from conversation
 */
export async function parsePreferences(text: string): Promise<ParseResult> {
    // Quick filter: skip very short messages or obvious racing commands
    if (text.length < 10 || /^(box|pit|copy|roger|thanks|ok|okay)$/i.test(text.trim())) {
        return { isPreferenceChange: false, updates: [], acknowledgment: '' };
    }

    try {
        const result = await chatCompletion([
            { role: 'system', content: PREFERENCE_SCHEMA },
            { role: 'user', content: `Driver message: "${text}"` }
        ], {
            temperature: 0.1, // Low temp for consistent extraction
            maxTokens: 200,
        });

        if (!result.success || !result.content) {
            return { isPreferenceChange: false, updates: [], acknowledgment: '' };
        }

        // Parse JSON response
        let parsed: { preferences: Array<{ field: string; value: string | boolean; reason: string }> };
        try {
            // Handle potential markdown code blocks
            let content = result.content.trim();
            if (content.startsWith('```')) {
                content = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }
            parsed = JSON.parse(content);
        } catch {
            console.log('[PreferenceParser] Failed to parse LLM response:', result.content);
            return { isPreferenceChange: false, updates: [], acknowledgment: '' };
        }

        if (!parsed.preferences || parsed.preferences.length === 0) {
            return { isPreferenceChange: false, updates: [], acknowledgment: '' };
        }

        // Convert to updates with confirmations
        const updates: PreferenceUpdate[] = parsed.preferences.map(p => ({
            field: p.field,
            value: p.value,
            confirmation: generateConfirmation(p.field, p.value),
        }));

        const acknowledgment = updates.map(u => u.confirmation).join(' ');

        return {
            isPreferenceChange: true,
            updates,
            acknowledgment,
        };

    } catch (error) {
        console.error('[PreferenceParser] LLM call failed:', error);
        return { isPreferenceChange: false, updates: [], acknowledgment: '' };
    }
}

/**
 * Generate natural confirmation for a preference update
 */
function generateConfirmation(field: string, value: string | boolean | number): string {
    const confirmations: Record<string, Record<string, string>> = {
        preferred_callout_frequency: {
            minimal: "Copy, I'll keep the radio quiet.",
            moderate: "Copy, balanced updates.",
            frequent: "Copy, I'll keep you in the loop.",
        },
        preferred_feedback_style: {
            brief: "Copy, keeping it short.",
            detailed: "Copy, I'll give you the full picture.",
            blunt: "Copy, no sugarcoating.",
            motivational: "Copy, I've got your back.",
            balanced: "Copy, balanced feedback.",
        },
        needs_confidence_building: {
            true: "Copy, we've got this together.",
            false: "Copy, all business.",
        },
        prefers_data_vs_feeling: {
            data: "Copy, numbers it is.",
            feeling: "Copy, focusing on feel.",
            balanced: "Copy, mix of both.",
        },
        responds_well_to_criticism: {
            true: "Copy, I'll push you.",
            false: "Copy, keeping it constructive.",
        },
    };

    return confirmations[field]?.[String(value)] || "Copy that.";
}

/**
 * Apply preference updates to driver memory
 */
export async function applyPreferenceUpdates(
    driverProfileId: string,
    updates: PreferenceUpdate[]
): Promise<void> {
    if (updates.length === 0) return;
    
    // Get current memory for logging previous values
    const currentMemory = await getDriverMemory(driverProfileId);
    
    // Build update object
    const memoryUpdates: Record<string, unknown> = {};
    for (const update of updates) {
        memoryUpdates[update.field] = update.value;
    }
    
    // Apply updates
    await updateDriverMemory(driverProfileId, memoryUpdates);
    
    // Log memory events for audit trail
    for (const update of updates) {
        const previousValue = currentMemory ? String((currentMemory as unknown as Record<string, unknown>)[update.field] ?? 'null') : 'null';
        await logMemoryEvent({
            driver_profile_id: driverProfileId,
            event_type: 'preference_inferred',
            memory_field: update.field,
            previous_value: previousValue,
            new_value: String(update.value),
            evidence_type: 'explicit_feedback',
            evidence_session_id: null,
            evidence_summary: `Driver explicitly requested: "${update.confirmation}"`,
            learning_confidence: 1.0, // High confidence for explicit requests
        });
    }
    
    console.log(`[PreferenceParser] Updated ${updates.length} preferences for driver ${driverProfileId}:`, 
        updates.map(u => `${u.field}=${u.value}`).join(', '));
}

/**
 * Process driver input and apply any preference changes
 * Returns acknowledgment message if preferences were changed
 */
export async function processPreferenceChange(
    driverProfileId: string,
    text: string
): Promise<string | null> {
    const result = await parsePreferences(text);
    
    if (!result.isPreferenceChange) {
        return null;
    }
    
    await applyPreferenceUpdates(driverProfileId, result.updates);
    return result.acknowledgment;
}
