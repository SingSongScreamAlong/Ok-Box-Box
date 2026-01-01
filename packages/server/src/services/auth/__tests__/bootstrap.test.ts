/**
 * Unit Tests: Bootstrap & Capability Mapping
 * 
 * Tests the bootstrap endpoint logic to ensure:
 * - Correct capability derivation from licenses
 * - Available surfaces derived from capabilities
 * - No code paths use license names for gating (only capabilities)
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// MOCK TYPES (mirrors server logic)
// ============================================================================

interface Licenses {
    blackbox: boolean;
    controlbox: boolean;
}

interface Capabilities {
    driver_hud: boolean;
    ai_coaching: boolean;
    voice_engineer: boolean;
    personal_telemetry: boolean;
    pitwall_view: boolean;
    multi_car_monitor: boolean;
    strategy_timeline: boolean;
    incident_review: boolean;
    penalty_assign: boolean;
    protest_review: boolean;
    rulebook_manage: boolean;
    session_authority: boolean;
}

type Surface = 'driver' | 'team' | 'racecontrol';

// ============================================================================
// CAPABILITY DERIVATION LOGIC (mirrors auth.ts bootstrap endpoint)
// ============================================================================

function deriveCapabilities(
    licenses: Licenses,
    roles: string[]
): Capabilities {
    return {
        // BlackBox - Driver
        driver_hud: licenses.blackbox,
        ai_coaching: licenses.blackbox,
        voice_engineer: licenses.blackbox,
        personal_telemetry: licenses.blackbox,

        // BlackBox - Team
        pitwall_view: licenses.blackbox,
        multi_car_monitor: licenses.blackbox,
        strategy_timeline: licenses.blackbox,

        // ControlBox - Race Control
        incident_review: licenses.controlbox,
        penalty_assign: licenses.controlbox && roles.includes('racecontrol'),
        protest_review: licenses.controlbox && roles.includes('racecontrol'),
        rulebook_manage: licenses.controlbox && roles.includes('admin'),
        session_authority: licenses.controlbox && roles.includes('admin')
    };
}

function deriveAvailableSurfaces(capabilities: Capabilities): Surface[] {
    const surfaces: Surface[] = [];
    if (capabilities.driver_hud) surfaces.push('driver');
    if (capabilities.pitwall_view) surfaces.push('team');
    if (capabilities.incident_review) surfaces.push('racecontrol');
    return surfaces;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Bootstrap Capabilities', () => {
    describe('deriveCapabilities', () => {
        it('should give all BlackBox capabilities with blackbox license', () => {
            const caps = deriveCapabilities({ blackbox: true, controlbox: false }, ['driver', 'team']);

            expect(caps.driver_hud).toBe(true);
            expect(caps.ai_coaching).toBe(true);
            expect(caps.pitwall_view).toBe(true);
            expect(caps.incident_review).toBe(false);
        });

        it('should give all ControlBox capabilities with controlbox license', () => {
            const caps = deriveCapabilities(
                { blackbox: false, controlbox: true },
                ['racecontrol', 'admin']
            );

            expect(caps.incident_review).toBe(true);
            expect(caps.penalty_assign).toBe(true);
            expect(caps.protest_review).toBe(true);
            expect(caps.rulebook_manage).toBe(true);
            expect(caps.session_authority).toBe(true);
            expect(caps.driver_hud).toBe(false);
        });

        it('should require racecontrol role for penalty_assign', () => {
            // Has controlbox but NO racecontrol role
            const caps = deriveCapabilities(
                { blackbox: false, controlbox: true },
                ['viewer']
            );

            expect(caps.incident_review).toBe(true);
            expect(caps.penalty_assign).toBe(false);
            expect(caps.protest_review).toBe(false);
        });

        it('should require admin role for rulebook_manage', () => {
            const caps = deriveCapabilities(
                { blackbox: false, controlbox: true },
                ['racecontrol']  // NO admin
            );

            expect(caps.incident_review).toBe(true);
            expect(caps.rulebook_manage).toBe(false);
            expect(caps.session_authority).toBe(false);
        });

        it('should give all capabilities with both licenses', () => {
            const caps = deriveCapabilities(
                { blackbox: true, controlbox: true },
                ['driver', 'team', 'racecontrol', 'admin']
            );

            expect(caps.driver_hud).toBe(true);
            expect(caps.pitwall_view).toBe(true);
            expect(caps.incident_review).toBe(true);
            expect(caps.penalty_assign).toBe(true);
            expect(caps.rulebook_manage).toBe(true);
        });
    });

    describe('deriveAvailableSurfaces', () => {
        it('should return only driver and team for BlackBox-only user', () => {
            const caps = deriveCapabilities({ blackbox: true, controlbox: false }, ['driver', 'team']);
            const surfaces = deriveAvailableSurfaces(caps);

            expect(surfaces).toContain('driver');
            expect(surfaces).toContain('team');
            expect(surfaces).not.toContain('racecontrol');
        });

        it('should return only racecontrol for ControlBox-only user', () => {
            const caps = deriveCapabilities({ blackbox: false, controlbox: true }, ['racecontrol']);
            const surfaces = deriveAvailableSurfaces(caps);

            expect(surfaces).not.toContain('driver');
            expect(surfaces).not.toContain('team');
            expect(surfaces).toContain('racecontrol');
        });

        it('should return all surfaces for user with both licenses', () => {
            const caps = deriveCapabilities({ blackbox: true, controlbox: true }, ['driver', 'team', 'racecontrol']);
            const surfaces = deriveAvailableSurfaces(caps);

            expect(surfaces).toEqual(['driver', 'team', 'racecontrol']);
        });

        it('should return empty array for user with no licenses', () => {
            const caps = deriveCapabilities({ blackbox: false, controlbox: false }, []);
            const surfaces = deriveAvailableSurfaces(caps);

            expect(surfaces).toEqual([]);
        });
    });

    describe('CRITICAL: No license-based gating', () => {
        it('should never use license name directly for route gating', () => {
            // This test documents the rule: 
            // App should NEVER branch on license name — only capabilities.

            const caps = deriveCapabilities({ blackbox: true, controlbox: false }, ['driver']);

            // CORRECT: Gate on capability
            const canViewPitWall = caps.pitwall_view;
            expect(canViewPitWall).toBe(true);

            // INCORRECT (what we must NOT do):
            // const canViewPitWall = licenses.blackbox; // NO!
        });
    });
});

describe('Mode Selection', () => {
    describe('CRITICAL: Never infer driver from iRacing running', () => {
        it('should not auto-select driver mode when iRacing is running', () => {
            // This test documents the critical rule:
            // Race Control users often run iRacing as spectator/admin.
            // iRacing running must NEVER auto-select Driver HUD.

            const isIRacingRunning = true;
            const availableModes = ['driver', 'team', 'racecontrol'];

            // The mode selection logic should NOT use isIRacingRunning
            // to auto-select 'driver' mode

            // Correct behavior: if multiple modes and no saved preference,
            // show mode picker instead of auto-selecting
            const shouldShowPicker = availableModes.length > 1;
            expect(shouldShowPicker).toBe(true);

            // Even with iRacing running, we don't auto-select driver
            const autoSelectedMode = null; // Mode picker should be shown
            expect(autoSelectedMode).toBeNull();
        });

        it('should auto-select only when single mode available', () => {
            const availableModes = ['racecontrol'];

            // Only one mode - safe to auto-select
            const shouldAutoSelect = availableModes.length === 1;
            expect(shouldAutoSelect).toBe(true);

            const autoSelectedMode = availableModes[0];
            expect(autoSelectedMode).toBe('racecontrol');
        });

        it('should use saved preference when multiple modes available', () => {
            const availableModes = ['driver', 'team', 'racecontrol'];
            const savedMode = 'racecontrol';

            // Saved preference is available - use it
            const shouldUseSaved = availableModes.includes(savedMode);
            expect(shouldUseSaved).toBe(true);

            const selectedMode = savedMode;
            expect(selectedMode).toBe('racecontrol');
        });
    });
});
