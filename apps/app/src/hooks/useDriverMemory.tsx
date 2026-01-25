import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { 
  DriverMemory, 
  DriverIdentity, 
  EngineerOpinion, 
  DriverMemoryEvent,
  DriverMemoryState,
  EngineerPersonality
} from '../types/driver-memory';

/**
 * useDriverMemory - Access the driver's living memory
 * 
 * This hook provides access to the driver memory system that powers
 * the personalized engineer experience. It includes:
 * - Driving tendencies and patterns
 * - Strengths and weaknesses
 * - Communication preferences
 * - Engineer opinions
 * - Identity and narrative
 */
export function useDriverMemory() {
  const { user } = useAuth();
  const [state, setState] = useState<DriverMemoryState>({
    memory: null,
    identity: null,
    opinions: [],
    recentEvents: [],
    loading: true,
    error: null,
  });

  // Fetch driver memory data
  const fetchMemory = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // First get the driver profile ID
      const { data: profile, error: profileError } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_account_id', user.id)
        .single();

      if (profileError || !profile) {
        // No profile yet - return empty state
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const driverProfileId = profile.id;

      // Fetch memory, identity, opinions, and events in parallel
      const [memoryResult, identityResult, opinionsResult, eventsResult] = await Promise.all([
        supabase
          .from('driver_memory')
          .select('*')
          .eq('driver_profile_id', driverProfileId)
          .single(),
        supabase
          .from('driver_identity')
          .select('*')
          .eq('driver_profile_id', driverProfileId)
          .single(),
        supabase
          .from('engineer_opinions')
          .select('*')
          .eq('driver_profile_id', driverProfileId)
          .is('valid_until', null)
          .order('priority', { ascending: false })
          .limit(10),
        supabase
          .from('driver_memory_events')
          .select('*')
          .eq('driver_profile_id', driverProfileId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setState({
        memory: memoryResult.data ? transformMemory(memoryResult.data) : null,
        identity: identityResult.data ? transformIdentity(identityResult.data) : null,
        opinions: opinionsResult.data ? opinionsResult.data.map(transformOpinion) : [],
        recentEvents: eventsResult.data ? eventsResult.data.map(transformEvent) : [],
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching driver memory:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load driver memory',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  // Derive engineer personality from memory
  const getEngineerPersonality = useCallback((): EngineerPersonality => {
    const { memory, opinions } = state;

    if (!memory) {
      return {
        toneStyle: 'supportive',
        verbosity: 'balanced',
        confidenceLevel: 'building',
        focusArea: null,
        currentConcern: null,
      };
    }

    // Determine tone based on driver preferences
    let toneStyle: EngineerPersonality['toneStyle'] = 'supportive';
    if (memory.preferredFeedbackStyle === 'motivational' || memory.needsConfidenceBuilding) {
      toneStyle = 'motivational';
    } else if (memory.preferredFeedbackStyle === 'blunt') {
      toneStyle = 'direct';
    } else if (memory.prefersDataVsFeeling === 'data') {
      toneStyle = 'analytical';
    }

    // Determine verbosity
    let verbosity: EngineerPersonality['verbosity'] = 'balanced';
    if (memory.preferredFeedbackStyle === 'brief' || memory.preferredCalloutFrequency === 'minimal') {
      verbosity = 'terse';
    } else if (memory.preferredFeedbackStyle === 'detailed') {
      verbosity = 'detailed';
    }

    // Determine confidence level based on memory confidence
    let confidenceLevel: EngineerPersonality['confidenceLevel'] = 'building';
    if (memory.memoryConfidence > 0.7) {
      confidenceLevel = 'high';
    } else if (memory.memoryConfidence > 0.4) {
      confidenceLevel = 'moderate';
    }

    // Get current focus from highest priority actionable opinion
    const focusOpinion = opinions.find(o => o.isActionable);
    const focusArea = focusOpinion?.suggestedAction || null;

    // Get current concern from highest priority concern/critical opinion
    const concernOpinion = opinions.find(o => 
      o.opinionSentiment === 'concern' || o.opinionSentiment === 'critical'
    );
    const currentConcern = concernOpinion?.opinionSummary || null;

    return {
      toneStyle,
      verbosity,
      confidenceLevel,
      focusArea,
      currentConcern,
    };
  }, [state]);

  // Update a specific memory field (for explicit driver feedback)
  const updateMemoryField = useCallback(async (
    field: keyof DriverMemory,
    value: unknown,
    reason: string
  ) => {
    if (!user || !state.memory) return;

    try {
      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_account_id', user.id)
        .single();

      if (!profile) return;

      // Update the memory field
      const { error: updateError } = await supabase
        .from('driver_memory')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('driver_profile_id', profile.id);

      if (updateError) throw updateError;

      // Log the memory event
      await supabase.from('driver_memory_events').insert({
        driver_profile_id: profile.id,
        event_type: 'preference_inferred',
        memory_field: field,
        previous_value: String(state.memory[field]),
        new_value: String(value),
        evidence_type: 'explicit_feedback',
        evidence_summary: reason,
        learning_confidence: 1.0,
      });

      // Refresh memory
      await fetchMemory();
    } catch (err) {
      console.error('Error updating memory field:', err);
    }
  }, [user, state.memory, fetchMemory]);

  // Get a summary of what the engineer "knows" about the driver
  const getEngineerKnowledge = useCallback((): string[] => {
    const { memory, identity } = state;
    const knowledge: string[] = [];

    if (!memory) {
      knowledge.push("I'm still getting to know you. Complete a few sessions and I'll start learning your style.");
      return knowledge;
    }

    // Braking
    if (memory.brakingStyle !== 'unknown') {
      knowledge.push(`You tend to brake ${memory.brakingStyle}.`);
    }

    // Throttle
    if (memory.throttleStyle !== 'unknown') {
      knowledge.push(`Your throttle application is ${memory.throttleStyle}.`);
    }

    // Racecraft
    if (memory.overtakingStyle) {
      knowledge.push(`Your overtaking style is ${memory.overtakingStyle}.`);
    }

    // Strengths
    if (memory.strengthTrackTypes.length > 0) {
      knowledge.push(`You're strong on ${memory.strengthTrackTypes.join(', ')} tracks.`);
    }

    // Weaknesses
    if (memory.weaknessCornerTypes.length > 0) {
      knowledge.push(`You struggle with ${memory.weaknessCornerTypes.join(', ')} corners.`);
    }

    // Mental state
    if (memory.postIncidentTiltRisk && memory.postIncidentTiltRisk > 0.6) {
      knowledge.push("You tend to push too hard after incidents. I'll remind you to reset.");
    }

    // Identity
    if (identity?.driverArchetype) {
      knowledge.push(`You're developing as a ${identity.driverArchetype.replace('_', ' ')}.`);
    }

    if (identity?.currentChapter) {
      knowledge.push(`Current focus: ${identity.currentChapter}`);
    }

    if (knowledge.length === 0) {
      knowledge.push("I'm building your profile. A few more sessions and I'll have insights for you.");
    }

    return knowledge;
  }, [state]);

  return {
    ...state,
    fetchMemory,
    getEngineerPersonality,
    updateMemoryField,
    getEngineerKnowledge,
  };
}

// ========================
// TRANSFORM FUNCTIONS
// ========================

function transformMemory(data: Record<string, unknown>): DriverMemory {
  return {
    id: data.id as string,
    driverProfileId: data.driver_profile_id as string,
    brakingStyle: data.braking_style as DriverMemory['brakingStyle'],
    brakingConsistency: data.braking_consistency as number | null,
    brakeBiasPreference: data.brake_bias_preference as DriverMemory['brakeBiasPreference'],
    throttleStyle: data.throttle_style as DriverMemory['throttleStyle'],
    throttleOnExitTendency: data.throttle_on_exit_tendency as DriverMemory['throttleOnExitTendency'],
    tractionManagement: data.traction_management as number | null,
    cornerEntryStyle: data.corner_entry_style as DriverMemory['cornerEntryStyle'],
    apexHitRate: data.apex_hit_rate as number | null,
    cornerExitQuality: data.corner_exit_quality as number | null,
    overtakingStyle: data.overtaking_style as DriverMemory['overtakingStyle'],
    defensiveAwareness: data.defensive_awareness as number | null,
    trafficComfort: data.traffic_comfort as number | null,
    incidentProneness: data.incident_proneness as number | null,
    postIncidentTiltRisk: data.post_incident_tilt_risk as number | null,
    recoverySpeed: data.recovery_speed as DriverMemory['recoverySpeed'],
    lateRaceDegradation: data.late_race_degradation as number | null,
    sessionLengthSweetSpot: data.session_length_sweet_spot as number | null,
    fatigueOnsetLap: data.fatigue_onset_lap as number | null,
    commonErrorTypes: (data.common_error_types as DriverMemory['commonErrorTypes']) || [],
    highRiskCorners: (data.high_risk_corners as DriverMemory['highRiskCorners']) || [],
    strengthTrackTypes: (data.strength_track_types as string[]) || [],
    weaknessTrackTypes: (data.weakness_track_types as string[]) || [],
    strengthCornerTypes: (data.strength_corner_types as string[]) || [],
    weaknessCornerTypes: (data.weakness_corner_types as string[]) || [],
    qualifyingVsRaceDelta: data.qualifying_vs_race_delta as number | null,
    practiceToRaceImprovement: data.practice_to_race_improvement as number | null,
    preferredFeedbackStyle: data.preferred_feedback_style as DriverMemory['preferredFeedbackStyle'],
    preferredCalloutFrequency: data.preferred_callout_frequency as DriverMemory['preferredCalloutFrequency'],
    respondsWellToCriticism: data.responds_well_to_criticism as boolean,
    needsConfidenceBuilding: data.needs_confidence_building as boolean,
    prefersDataVsFeeling: data.prefers_data_vs_feeling as DriverMemory['prefersDataVsFeeling'],
    baselineConfidence: data.baseline_confidence as number,
    confidenceVolatility: data.confidence_volatility as number,
    currentConfidence: data.current_confidence as number,
    confidenceTrend: data.confidence_trend as DriverMemory['confidenceTrend'],
    sessionsAnalyzed: data.sessions_analyzed as number,
    lapsAnalyzed: data.laps_analyzed as number,
    lastLearningUpdate: data.last_learning_update as string | null,
    memoryConfidence: data.memory_confidence as number,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function transformIdentity(data: Record<string, unknown>): DriverIdentity {
  return {
    id: data.id as string,
    driverProfileId: data.driver_profile_id as string,
    driverArchetype: data.driver_archetype as DriverIdentity['driverArchetype'],
    archetypeConfidence: data.archetype_confidence as number | null,
    archetypeEvidence: data.archetype_evidence as string | null,
    skillTrajectory: data.skill_trajectory as DriverIdentity['skillTrajectory'],
    trajectorySince: data.trajectory_since as string | null,
    trajectoryEvidence: data.trajectory_evidence as string | null,
    readyForLongerRaces: data.ready_for_longer_races as boolean,
    readyForHigherSplits: data.ready_for_higher_splits as boolean,
    readyForNewDiscipline: data.ready_for_new_discipline as boolean,
    readinessNotes: data.readiness_notes as string | null,
    currentDevelopmentFocus: data.current_development_focus as string | null,
    focusSetAt: data.focus_set_at as string | null,
    focusProgress: data.focus_progress as number,
    definingMoment: data.defining_moment as string | null,
    currentChapter: data.current_chapter as string | null,
    nextMilestone: data.next_milestone as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function transformOpinion(data: Record<string, unknown>): EngineerOpinion {
  return {
    id: data.id as string,
    driverProfileId: data.driver_profile_id as string,
    opinionDomain: data.opinion_domain as EngineerOpinion['opinionDomain'],
    opinionContext: data.opinion_context as string | null,
    opinionSummary: data.opinion_summary as string,
    opinionDetail: data.opinion_detail as string | null,
    opinionConfidence: data.opinion_confidence as number,
    opinionSentiment: data.opinion_sentiment as EngineerOpinion['opinionSentiment'],
    isActionable: data.is_actionable as boolean,
    suggestedAction: data.suggested_action as string | null,
    priority: data.priority as number,
    validFrom: data.valid_from as string,
    validUntil: data.valid_until as string | null,
    evidenceSessions: (data.evidence_sessions as string[]) || [],
    evidenceSummary: data.evidence_summary as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function transformEvent(data: Record<string, unknown>): DriverMemoryEvent {
  return {
    id: data.id as string,
    driverProfileId: data.driver_profile_id as string,
    eventType: data.event_type as DriverMemoryEvent['eventType'],
    memoryField: data.memory_field as string,
    previousValue: data.previous_value as string | null,
    newValue: data.new_value as string,
    evidenceType: data.evidence_type as DriverMemoryEvent['evidenceType'],
    evidenceSessionId: data.evidence_session_id as string | null,
    evidenceSummary: data.evidence_summary as string,
    learningConfidence: data.learning_confidence as number,
    createdAt: data.created_at as string,
  };
}
