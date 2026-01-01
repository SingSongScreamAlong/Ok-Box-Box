/**
 * Database initialization script for BlackBox Backend Engine
 * This script initializes the PostgreSQL database with the schema defined in db-init.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database connection string from environment variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Read the SQL initialization file
const sqlFilePath = path.join(__dirname, 'db-init.sql');
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Initializing database...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the SQL script
    await client.query(sqlScript);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    // Release client back to pool
    client.release();
    
    // Close the pool
    await pool.end();
  }
}

// Run the initialization
initializeDatabase().catch(err => {
  console.error('Unhandled error during database initialization:', err);
  process.exit(1);
});
