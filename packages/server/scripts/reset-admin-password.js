import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;

async function resetPassword() {
    const hash = await bcrypt.hash('ControlBox2024!', 10);
    console.log('Generated hash:', hash);
    
    const client = new Client({
        connectionString: 'postgresql://controlbox:controlbox_dev@localhost:5432/controlbox'
    });
    
    await client.connect();
    const result = await client.query(
        'UPDATE admin_users SET password_hash = $1 WHERE email = $2',
        [hash, 'admin@okboxbox.com']
    );
    console.log('Rows updated:', result.rowCount);
    await client.end();
}

resetPassword().catch(console.error);
