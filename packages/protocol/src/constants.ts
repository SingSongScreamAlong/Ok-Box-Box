export const EVENTS = {
    RELAY: {
        V1: {
            SESSION_METADATA: 'session_metadata',
            TELEMETRY: 'telemetry',
            INCIDENT: 'incident',
            RACE_EVENT: 'race_event',
        },
        INTELLIGENCE: {
            V1: {
                OVERLAP: 'overlap_state_changed',
                THREE_WIDE: 'three_wide_detected',
                OFFTRACK: 'offtrack',
                UNSAFE_REJOIN: 'unsafe_rejoin_risk',
                LOCAL_CAUTION: 'local_caution'
            }
        }
    }
} as const;
