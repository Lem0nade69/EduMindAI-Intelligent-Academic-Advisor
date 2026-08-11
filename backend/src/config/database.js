/**
 * EduMind AI - Database Configuration
 * PostgreSQL via Supabase (pg driver)
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL Pool error:', err.message);
});

// Test connection on startup
export async function connectDB() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ PostgreSQL connected — Server time: ${result.rows[0].current_time}`);
    client.release();
    return true;
  } catch (err) {
    console.warn(`⚠️  PostgreSQL connection failed: ${err.message}`);
    console.warn('   Running in mock/local mode. Set DATABASE_URL in .env to enable full persistence.');
    return false;
  }
}

// Query helper — always release client
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗃  Query [${duration}ms]:`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error('❌ DB Query error:', err.message, '| Query:', text);
    throw err;
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
