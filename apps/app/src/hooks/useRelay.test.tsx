import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRelay } from './useRelay';

// Test useRelay without provider (fallback behavior)
describe('useRelay (without provider)', () => {
    it('should return fallback state when used outside provider', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(result.current.status).toBe('disconnected');
        expect(result.current.reconnectAttempts).toBe(0);
    });

    it('should provide default telemetry in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(result.current.telemetry).toBeDefined();
        expect(result.current.telemetry.speed).toBeNull();
        expect(result.current.telemetry.rpm).toBeNull();
        expect(result.current.telemetry.gear).toBeNull();
    });

    it('should provide default session in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(result.current.session).toBeDefined();
        expect(result.current.session.trackName).toBeNull();
        expect(result.current.session.sessionType).toBeNull();
    });

    it('should provide connect and disconnect functions in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(typeof result.current.connect).toBe('function');
        expect(typeof result.current.disconnect).toBe('function');
        
        // Should not throw when called
        expect(() => result.current.connect()).not.toThrow();
        expect(() => result.current.disconnect()).not.toThrow();
    });

    it('should provide getCarMapPosition function in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(typeof result.current.getCarMapPosition).toBe('function');
        
        const pos = result.current.getCarMapPosition(0.5);
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
    });

    it('should provide empty arrays in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(result.current.incidents).toEqual([]);
        expect(result.current.engineerUpdates).toEqual([]);
    });

    it('should provide null raceIntelligence in fallback', () => {
        const { result } = renderHook(() => useRelay());
        
        expect(result.current.raceIntelligence).toBeNull();
    });
});
