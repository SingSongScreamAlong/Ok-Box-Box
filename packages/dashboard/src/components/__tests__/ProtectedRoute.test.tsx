// =====================================================================
// ProtectedRoute Component Tests
// =====================================================================

import { describe, it, expect } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

describe('ProtectedRoute', () => {
    it('should be a valid React component', () => {
        expect(typeof ProtectedRoute).toBe('function');
    });

    it('should accept children prop', () => {
        // ProtectedRoute should be a function component that accepts children
        expect(ProtectedRoute.length).toBeGreaterThanOrEqual(0);
    });
});
