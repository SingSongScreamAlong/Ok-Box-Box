/**
 * SQL Injection Protection Tests
 */

import { SafeDB, sanitizeInputs, QueryBuilder, SafeQueries } from '../src/middleware/sql-injection-guard';
import express, { Express } from 'express';
import request from 'supertest';

describe('SQL Injection Protection', () => {
    describe('SafeDB', () => {
        let mockPool: any;
        let safeDB: SafeDB;

        beforeEach(() => {
            mockPool = {
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
            };
            safeDB = new SafeDB(mockPool);
        });

        it('should execute parameterized queries safely', async () => {
            await safeDB.query('SELECT * FROM users WHERE id = $1', [123]);

            expect(mockPool.query).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE id = $1',
                [123]
            );
        });

        it('should warn about potential string interpolation', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const maliciousQuery = "SELECT * FROM users WHERE id = '${userId}'";

            await safeDB.query(maliciousQuery, []);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should allow safe queries without parameters', async () => {
            await safeDB.query('SELECT COUNT(*) FROM users', []);

            expect(mockPool.query).toHaveBeenCalled();
        });
    });

    describe('sanitizeInputs middleware', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.use(sanitizeInputs);
            app.post('/api/test', (req, res) => res.json({ success: true }));
        });

        it('should block requests with SQL injection in body', async () => {
            await request(app)
                .post('/api/test')
                .send({ username: "'; DROP TABLE users; --" })
                .expect(400);
        });

        it('should block requests with UNION SELECT injection', async () => {
            await request(app)
                .post('/api/test')
                .send({ input: "1' UNION SELECT * FROM passwords --" })
                .expect(400);
        });

        it('should allow safe requests', async () => {
            const response = await request(app)
                .post('/api/test')
                .send({ username: 'john.doe', email: 'john@example.com' })
                .expect(200);

            expect(response.body).toEqual({ success: true });
        });
    });

    describe('QueryBuilder', () => {
        it('should build safe WHERE clauses', () => {
            const builder = new QueryBuilder();
            const result = builder
                .where('email', '=', 'test@example.com')
                .and('status', '=', 'active')
                .build();

            expect(result.whereClause).toContain('WHERE');
            expect(result.whereClause).toContain('$1');
            expect(result.whereClause).toContain('$2');
            expect(result.values).toEqual(['test@example.com', 'active']);
        });
    });

    describe('SafeQueries', () => {
        it('should generate safe SELECT queries', () => {
            const { query, values } = SafeQueries.select(
                'users',
                ['id', 'email'],
                [{ column: 'id', value: 123 }]
            );

            expect(query).toContain('SELECT');
            expect(query).toContain('$1');
            expect(values).toEqual([123]);
        });

        it('should generate safe INSERT queries', () => {
            const { query, values } = SafeQueries.insert('users', {
                email: 'test@example.com',
                name: 'Test User'
            });

            expect(query).toContain('INSERT INTO');
            expect(query).toContain('$1');
            expect(query).toContain('$2');
            expect(values).toEqual(['test@example.com', 'Test User']);
        });
    });
});
