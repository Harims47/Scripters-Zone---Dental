import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { Pool } = require(path.resolve('./server/node_modules/pg'));

const DB_URL = process.env.DATABASE_URL || 'postgresql://dental:dentalpassword@127.0.0.1:5433/dentalcore';

let pool: any = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DB_URL,
      max: 5
    });
  }
  return pool;
}

/**
 * Execute a read-only SQL query returning multiple rows.
 */
export async function queryMany<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const trimmed = sql.trim().toLowerCase();
  if (
    trimmed.startsWith('insert') ||
    trimmed.startsWith('update') ||
    trimmed.startsWith('delete') ||
    trimmed.startsWith('drop') ||
    trimmed.startsWith('alter')
  ) {
    throw new Error(`Forbidden mutation query detected in read-only db helper: ${sql}`);
  }
  const client = getPool();
  const res = await client.query(sql, params);
  return res.rows as T[];
}

/**
 * Execute a read-only SQL query returning a single row or null.
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryMany<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
