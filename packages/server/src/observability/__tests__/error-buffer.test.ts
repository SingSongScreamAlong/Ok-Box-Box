// =====================================================================
// Error Buffer Tests
// =====================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
    pushError,
    getRecentErrors,
    getErrorsBySubsystem,
    getErrorCounts,
    clearErrors,
    getBufferStats,
    scrubSensitiveData
} from '../error-buffer.js';

describe('Error Buffer', () => {
    beforeEach(() => {
        clearErrors();
    });

    describe('pushError', () => {
        it('should add errors to buffer', () => {
            pushError('Test error message', 'api');
            pushError(new Error('Another error'), 'db');

            const errors = getRecentErrors();
            expect(errors).toHaveLength(2);
            expect(errors[0].message).toBe('Another error');
            expect(errors[1].message).toBe('Test error message');
        });

        it('should sanitize stack traces', () => {
            const error = new Error('Test');
            error.stack = '/Users/conradweeden/secrets/file.ts:10:5\n  at function';
            pushError(error, 'api');

            const errors = getRecentErrors();
            expect(errors[0].stack).not.toContain('/Users/conradweeden');
            expect(errors[0].stack).toContain('~/');
        });
    });

    describe('getRecentErrors', () => {
        it('should return most recent errors first', () => {
            pushError('First', 'api');
            pushError('Second', 'api');
            pushError('Third', 'api');

            const errors = getRecentErrors(2);
            expect(errors).toHaveLength(2);
            expect(errors[0].message).toBe('Third');
            expect(errors[1].message).toBe('Second');
        });

        it('should respect limit', () => {
            for (let i = 0; i < 100; i++) {
                pushError(`Error ${i}`, 'api');
            }

            const errors = getRecentErrors(10);
            expect(errors).toHaveLength(10);
        });
    });

    describe('getErrorsBySubsystem', () => {
        it('should filter by subsystem', () => {
            pushError('API error', 'api');
            pushError('DB error', 'db');
            pushError('Another API error', 'api');

            const apiErrors = getErrorsBySubsystem('api');
            expect(apiErrors).toHaveLength(2);
            expect(apiErrors.every(e => e.subsystem === 'api')).toBe(true);
        });
    });

    describe('getErrorCounts', () => {
        it('should count errors by subsystem', () => {
            pushError('Error 1', 'api');
            pushError('Error 2', 'api');
            pushError('Error 3', 'db');

            const counts = getErrorCounts();
            expect(counts['api']).toBe(2);
            expect(counts['db']).toBe(1);
        });
    });

    describe('scrubSensitiveData', () => {
        it('should redact sensitive keys', () => {
            const data = {
                username: 'testuser',
                password: 'secret123',
                apiKey: 'abc123',
                jwt_token: 'token-value',
                normalField: 'visible'
            };

            const scrubbed = scrubSensitiveData(data);
            expect(scrubbed.username).toBe('testuser');
            expect(scrubbed.password).toBe('[REDACTED]');
            expect(scrubbed.apiKey).toBe('[REDACTED]');
            expect(scrubbed.jwt_token).toBe('[REDACTED]');
            expect(scrubbed.normalField).toBe('visible');
        });

        it('should recursively scrub nested objects', () => {
            const data = {
                config: {
                    database_url: 'postgres://...',
                    secret_key: 'hidden'
                }
            };

            const scrubbed = scrubSensitiveData(data);
            expect((scrubbed.config as any).database_url).toBe('postgres://...');
            expect((scrubbed.config as any).secret_key).toBe('[REDACTED]');
        });
    });
});
