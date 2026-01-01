import { pool } from '../dist/db.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('Seeding Training Goals...');
    const driverId = '8151ed18-9c17-4029-a65c-35220c853127'; // Common test ID or retrieve one

    const goals = [
        {
            title: 'Sub 1:30 at Silverstone',
            description: 'Break the 1:30 barrier in the GT3 car.',
            type: 'speed',
            difficulty: 'high',
            target_value: 90.0, // seconds
            current_value: 92.5,
            progress: 0.5
        },
        {
            title: 'Consistent Lapping',
            description: 'Keep 10 consecutive laps within 0.5s',
            type: 'consistency',
            difficulty: 'medium',
            target_value: 10,
            current_value: 4,
            progress: 0.4
        },
        {
            title: 'Clean Race',
            description: 'Finish a race with 0 incidents',
            type: 'racecraft',
            difficulty: 'medium',
            target_value: 1,
            current_value: 0,
            progress: 0
        }
    ];

    try {
        // Determine a driver ID to perform seed against. 
        // Try to find ANY user or create a placeholder.
        let targetDriverId = driverId;
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        if (userRes.rowCount > 0) {
            targetDriverId = userRes.rows[0].id;
            console.log(`Using existing user ID: ${targetDriverId}`);
        } else {
            console.log(`No users found, using placeholder ID: ${targetDriverId}`);
        }

        for (const g of goals) {
            await pool.query(
                `INSERT INTO training_goals (id, driver_id, title, description, type, difficulty, target_value, current_value, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [uuidv4(), targetDriverId, g.title, g.description, g.type, g.difficulty, g.target_value, g.current_value, g.progress]
            );
        }
        console.log('Seeding complete.');
    } catch (e) {
        console.error('Seeding failed:', e);
    } finally {
        pool.end();
    }
}

seed();
