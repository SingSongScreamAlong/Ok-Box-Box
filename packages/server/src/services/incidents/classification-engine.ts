// =====================================================================
// Classification Engine
// Orchestrates incident classification from triggers to full incidents
// =====================================================================

import { EventEmitter } from 'events';
import type {
    IncidentEvent,
    IncidentTrigger,
    InvolvedDriver,
    ContactType,
    IncidentType
} from '@controlbox/common';
import { ContactAnalyzer } from './contact-analyzer.js';
import { SeverityScorer } from './severity-scorer.js';
import { ResponsibilityPredictor } from './responsibility-predictor.js';
import { IncidentRepository } from '../../db/repositories/incident.repo.js';
import { v4 as uuid } from 'uuid';
import { SpatialAwarenessService } from '../telemetry/spatial-awareness/spatial-awareness.service.js';
// import { WorldSnapshot } from '../telemetry/spatial-awareness/snapshot.js';

export interface ClassificationEngineEvents {
    'incident:classified': (incident: IncidentEvent) => void;
}

import { ExplanationBuilder } from '../explanations/ExplanationBuilder.js';
import { SpokenSummaryBuilder } from '../explanations/SpokenSummaryBuilder.js';
import { getVoiceService, VOICE_PRESETS } from '../voice/index.js';

export class ClassificationEngine extends EventEmitter {
    private contactAnalyzer: ContactAnalyzer;
    private severityScorer: SeverityScorer;
    private responsibilityPredictor: ResponsibilityPredictor;
    private incidentRepo: IncidentRepository;
    private spatialAwareness: SpatialAwarenessService;

    private explanationBuilder = new ExplanationBuilder();
    private summaryBuilder = new SpokenSummaryBuilder();

    constructor() {
        super();
        // Ideally we should use Dependency Injection here
        this.spatialAwareness = new SpatialAwarenessService();
        const spatialAwareness = this.spatialAwareness; // Keep local ref for compatibility if needed below
        // Note: spatialAwareness needs to receive telemetry updates. 
        // In this architecture, it should probably be a singleton or managed by SessionManager.
        // For now, we instantiate it here, but it will be empty unless fed data.
        // TODO: Wire up telemetry feed to this instance.

        this.contactAnalyzer = new ContactAnalyzer(spatialAwareness);
        this.severityScorer = new SeverityScorer();
        this.responsibilityPredictor = new ResponsibilityPredictor();
        this.incidentRepo = new IncidentRepository();
    }

    /**
     * Process an incident trigger and classify it
     */
    async processTrigger(trigger: IncidentTrigger, sessionId: string): Promise<IncidentEvent | null> {
        try {
            // Determine incident type from trigger
            const incidentType = this.mapTriggerToIncidentType(trigger);

            // Analyze contact if applicable
            let contactType: ContactType | undefined;
            if (incidentType === 'contact' && trigger.nearbyDriverIds.length > 0) {
                contactType = this.contactAnalyzer.analyzeContact(trigger);

                // PHASE 6: Grounded Voice Explanation
                // Generate explanation if contact confirmed
                try {
                    const impactTime = trigger.sessionTimeMs / 1000.0; // Convert to seconds if needed, check units
                    // NOTE: trigger.sessionTimeMs is usually effectively current time
                    // We need the snapshots from SpatialAwareness service
                    const snapshots = this.spatialAwareness.getRecentSnapshots();

                    const packet = this.explanationBuilder.buildContactExplanation(
                        trigger.primaryDriverId,
                        trigger.nearbyDriverIds[0],
                        impactTime,
                        snapshots
                    );

                    if (packet) {
                        // CONFIDENCE GATING: Only emit explanations above threshold
                        const confidenceThreshold = parseFloat(process.env.CONFIDENCE_GATE_THRESHOLD || '0.6');

                        if (packet.confidence >= confidenceThreshold) {
                            const summary = this.summaryBuilder.buildSpokenSummary(packet);
                            const evidence = this.summaryBuilder.buildEvidenceLine(packet);

                            // Only proceed with TTS if summary was generated
                            if (summary) {
                                // Generate TTS audio for team broadcast
                                let audioBase64: string | undefined;
                                const voiceService = getVoiceService();
                                if (voiceService.isServiceAvailable()) {
                                    try {
                                        const result = await voiceService.textToSpeech({
                                            text: summary,
                                            ...VOICE_PRESETS.raceEngineer
                                        });
                                        if (result.success && result.audioBuffer) {
                                            audioBase64 = result.audioBuffer.toString('base64');
                                        }
                                    } catch (ttsErr) {
                                        console.error('TTS generation failed:', ttsErr);
                                    }
                                }

                                // Emit 'explanation_generated' event with audio
                                this.emit('explanation:generated', {
                                    packet,
                                    summary,
                                    evidence,
                                    audioBase64  // Base64 encoded MP3 for browser playback
                                });
                                console.log(`🗣️ Explanation: "${summary}" (Confidence: ${packet.confidence.toFixed(2)})${audioBase64 ? ' [+Audio]' : ''}`);
                            } else {
                                console.log('🔇 No summary generated, skipping TTS');
                            };
                        } else {
                            // Log gated explanation for monitoring
                            console.log(`🔇 Explanation gated (confidence ${packet.confidence.toFixed(2)} < ${confidenceThreshold}): ${packet.type}`);
                        }
                    }
                } catch (err) {
                    console.error("Failed to generate explanation:", err);
                }
            }

            // Calculate severity
            const { severity, score } = this.severityScorer.calculateSeverity(trigger, contactType);

            // Build involved drivers list
            const involvedDrivers: InvolvedDriver[] = [
                {
                    driverId: trigger.primaryDriverId,
                    driverName: `Driver ${trigger.primaryDriverId}`,
                    carNumber: '0',
                    role: 'involved',
                },
                ...trigger.nearbyDriverIds.map(id => ({
                    driverId: id,
                    driverName: `Driver ${id}`,
                    carNumber: '0',
                    role: 'involved' as const,
                })),
            ];

            // Predict responsibility if multiple drivers involved
            if (involvedDrivers.length > 1) {
                const predictions = this.responsibilityPredictor.predict(trigger, involvedDrivers);
                for (const driver of involvedDrivers) {
                    const pred = predictions.find(p => p.driverId === driver.driverId);
                    if (pred) {
                        driver.faultProbability = pred.probability;
                        driver.role = pred.role;
                    }
                }
            }

            // Create incident
            const incident: IncidentEvent = {
                id: uuid(),
                sessionId,
                type: incidentType,
                contactType,
                severity,
                severityScore: score,
                lapNumber: (trigger.triggerData.lapNumber as number) || 0,
                sessionTimeMs: trigger.sessionTimeMs,
                trackPosition: (trigger.triggerData.trackPosition as number) || 0,
                involvedDrivers,
                status: 'pending',
                replayTimestampMs: trigger.sessionTimeMs,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Persist to database
            const saved = await this.incidentRepo.create(incident);

            console.log(`⚠️  Incident classified: ${incidentType} (${severity}) - ${involvedDrivers.length} drivers`);
            this.emit('incident:classified', saved);

            return saved;
        } catch (error) {
            console.error('Failed to classify incident:', error);
            return null;
        }
    }

    private mapTriggerToIncidentType(trigger: IncidentTrigger): IncidentType {
        switch (trigger.type) {
            case 'incident_count_increase':
                return trigger.nearbyDriverIds.length > 0 ? 'contact' : 'off_track';
            case 'off_track_detected':
                return 'off_track';
            case 'spin_detected':
                return 'spin';
            case 'sudden_deceleration':
                return trigger.nearbyDriverIds.length > 0 ? 'contact' : 'loss_of_control';
            case 'contact_proximity':
                return 'contact';
            case 'erratic_trajectory':
                return 'loss_of_control';
            default:
                return 'contact';
        }
    }
}

// Singleton instance
let engineInstance: ClassificationEngine | null = null;

export function getClassificationEngine(): ClassificationEngine {
    if (!engineInstance) {
        engineInstance = new ClassificationEngine();
    }
    return engineInstance;
}
