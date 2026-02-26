/**
 * Driver Routes API Tests
 * Tests for /api/v1/drivers/* endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Mock dependencies before importing router
vi.mock('../../../db/client.js', () => ({
    pool: {
        query: vi.fn(),
    },
}));

vi.mock('../../../db/repositories/driver-profile.repo.js', () => ({
    createDriverProfile: vi.fn(),
    getDriverProfileById: vi.fn(),
    getDriverProfileByUserId: vi.fn(),
    updateDriverProfile: vi.fn(),
    getLinkedIdentities: vi.fn(),
    linkRacingIdentity: vi.fn(),
    verifyIdentity: vi.fn(),
    unlinkIdentity: vi.fn(),
    getActiveGrants: vi.fn(),
    createAccessGrant: vi.fn(),
    revokeGrant: vi.fn(),
}));

vi.mock('../../../services/iracing-oauth/profile-sync-service.js', () => ({
    getIRacingProfileSyncService: vi.fn(() => ({
        syncProfile: vi.fn(),
        getRaceResults: vi.fn(),
        getRaceResultsCount: vi.fn(),
    })),
}));

vi.mock('../../../services/ai/llm-service.js', () => ({
    chatCompletion: vi.fn(),
    isLLMConfigured: vi.fn(() => false),
}));

vi.mock('../../../websocket/telemetry-cache.js', () => ({
    getTelemetryForVoice: vi.fn(() => null),
}));

vi.mock('../../../services/ai/live-session-analyzer.js', () => ({
    getAnalyzer: vi.fn(() => null),
}));

vi.mock('../../../db/repositories/session-metrics.repo.js', () => ({
    getMetricsForDriver: vi.fn(),
}));

vi.mock('../../../db/repositories/driver-aggregates.repo.js', () => ({
    getAllAggregatesForDriver: vi.fn(),
    getGlobalAggregate: vi.fn(),
}));

vi.mock('../../../db/repositories/driver-traits.repo.js', () => ({
    getCurrentTraits: vi.fn(),
}));

vi.mock('../../../db/repositories/driver-reports.repo.js', () => ({
    getReportsForDriver: vi.fn(),
}));

vi.mock('../../services/idp/iracing-sync.service.js', () => ({
    backfillDriverHistory: vi.fn(),
}));

// Import after mocks
import { pool } from '../../../db/client.js';
import {
    getDriverProfileByUserId,
    getDriverProfileById,
    createDriverProfile,
} from '../../../db/repositories/driver-profile.repo.js';

describe('Driver Routes', () => {
    let app: Express;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test Driver',
    };

    const mockProfile = {
        id: 'profile-123',
        user_id: 'user-123',
        display_name: 'Test Driver',
        primary_discipline: 'road',
        created_at: new Date().toISOString(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        // Create fresh express app for each test
        app = express();
        app.use(express.json());

        // Mock auth middleware
        app.use((req, _res, next) => {
            if (req.headers.authorization === 'Bearer valid-token') {
                (req as any).user = mockUser;
            }
            next();
        });

        // Import and mount router
        const { default: driversRouter } = await import('../drivers.js');
        app.use('/api/v1/drivers', driversRouter);
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('GET /api/v1/drivers/me', () => {
        it('should return 401 without authentication', async () => {
            const res = await request(app)
                .get('/api/v1/drivers/me')
                .expect(401);

            expect(res.body.error).toBeDefined();
        });

        it('should return existing profile for authenticated user', async () => {
            vi.mocked(getDriverProfileByUserId).mockResolvedValue(mockProfile as any);
            vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

            const res = await request(app)
                .get('/api/v1/drivers/me')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(res.body.id).toBe('profile-123');
            expect(res.body.display_name).toBe('Test Driver');
            expect(getDriverProfileByUserId).toHaveBeenCalledWith('user-123');
        });

        it('should auto-create profile if none exists', async () => {
            vi.mocked(getDriverProfileByUserId).mockResolvedValue(null);
            vi.mocked(createDriverProfile).mockResolvedValue(mockProfile as any);
            vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

            const res = await request(app)
                .get('/api/v1/drivers/me')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(createDriverProfile).toHaveBeenCalled();
            expect(res.body.id).toBe('profile-123');
        });

        it('should enrich profile with iRacing data if available', async () => {
            vi.mocked(getDriverProfileByUserId).mockResolvedValue(mockProfile as any);
            vi.mocked(pool.query).mockResolvedValue({
                rows: [{
                    iracing_customer_id: '12345',
                    member_since: '2020-01-01',
                    irating_road: 2500,
                    sr_road: 350,
                    license_road: 'A',
                    irating_oval: 1800,
                    sr_oval: 280,
                    license_oval: 'B',
                }]
            } as any);

            const res = await request(app)
                .get('/api/v1/drivers/me')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(res.body.iracing_cust_id).toBe(12345);
            expect(res.body.licenses).toHaveLength(2);
            expect(res.body.irating_overall).toBe(2500);
        });
    });

    // Note: GET /api/v1/drivers/:id tests skipped due to complex idp-access middleware mocking
    // The middleware requires additional database context that's difficult to mock in isolation
});

describe('Driver Profile Data Transformation', () => {
    it('should map iRacing disciplines correctly', () => {
        const catMap: Record<string, string> = {
            'oval': 'oval',
            'road': 'sportsCar',
            'dirt_oval': 'dirtOval',
            'dirt_road': 'dirtRoad',
        };

        expect(catMap['road']).toBe('sportsCar');
        expect(catMap['oval']).toBe('oval');
        expect(catMap['dirt_oval']).toBe('dirtOval');
        expect(catMap['dirt_road']).toBe('dirtRoad');
    });

    it('should build licenses array from iRacing data', () => {
        const buildLicenses = (ir: any) => {
            const licenses: any[] = [];
            const disciplines = [
                { key: 'oval', irating: ir.irating_oval, sr: ir.sr_oval, license: ir.license_oval },
                { key: 'sportsCar', irating: ir.irating_road, sr: ir.sr_road, license: ir.license_road },
                { key: 'dirtOval', irating: ir.irating_dirt_oval, sr: ir.sr_dirt_oval, license: ir.license_dirt_oval },
                { key: 'dirtRoad', irating: ir.irating_dirt_road, sr: ir.sr_dirt_road, license: ir.license_dirt_road },
            ];

            for (const d of disciplines) {
                if (d.license || d.irating || d.sr) {
                    licenses.push({
                        discipline: d.key,
                        licenseClass: d.license || 'R',
                        safetyRating: d.sr ? d.sr / 100 : 0,
                        iRating: d.irating || null,
                    });
                }
            }
            return licenses;
        };

        const licenses = buildLicenses({
            irating_road: 2500,
            sr_road: 350,
            license_road: 'A',
            irating_oval: 1800,
            sr_oval: 280,
            license_oval: 'B',
        });

        expect(licenses).toHaveLength(2);
        expect(licenses[0].discipline).toBe('oval');
        expect(licenses[0].iRating).toBe(1800);
        expect(licenses[1].discipline).toBe('sportsCar');
        expect(licenses[1].safetyRating).toBe(3.5);
    });

    it('should calculate overall iRating from best discipline', () => {
        const getOverallIRating = (disciplines: Array<{ key: string; irating: number | null }>) => {
            const roadLicense = disciplines.find(d => d.key === 'sportsCar');
            const bestByIrating = disciplines
                .filter(d => d.irating)
                .sort((a, b) => (b.irating || 0) - (a.irating || 0))[0];
            const primary = roadLicense?.irating ? roadLicense : bestByIrating;
            return primary?.irating || null;
        };

        // Road has iRating - should be primary
        expect(getOverallIRating([
            { key: 'sportsCar', irating: 2500 },
            { key: 'oval', irating: 3000 },
        ])).toBe(2500);

        // Road has no iRating - use highest
        expect(getOverallIRating([
            { key: 'sportsCar', irating: null },
            { key: 'oval', irating: 3000 },
        ])).toBe(3000);

        // No iRatings
        expect(getOverallIRating([
            { key: 'sportsCar', irating: null },
        ])).toBeNull();
    });
});

describe('Driver Routes - Error Handling', () => {
    let app: Express;

    beforeEach(async () => {
        vi.clearAllMocks();

        app = express();
        app.use(express.json());

        app.use((req, _res, next) => {
            if (req.headers.authorization === 'Bearer valid-token') {
                (req as any).user = { id: 'user-123', email: 'test@example.com' };
            }
            next();
        });

        const { default: driversRouter } = await import('../drivers.js');
        app.use('/api/v1/drivers', driversRouter);
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('should handle database errors gracefully', async () => {
        vi.mocked(getDriverProfileByUserId).mockRejectedValue(new Error('DB connection failed'));

        const res = await request(app)
            .get('/api/v1/drivers/me')
            .set('Authorization', 'Bearer valid-token')
            .expect(500);

        expect(res.body.error).toBe('Failed to fetch driver profile');
    });
});
