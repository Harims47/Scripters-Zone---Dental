import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface ValidatedDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

/**
 * Validates the database configuration from environment variables.
 * Fails closed immediately if DATABASE_URL is missing, malformed, or targets an unsupported protocol.
 * Never logs or exposes credentials.
 */
export function validateDatabaseConfig(): ValidatedDatabaseConfig {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim().length === 0) {
    throw new Error('FATAL: DATABASE_URL environment variable is missing. DentalCore requires a valid MySQL database connection string.');
  }

  let u: URL;
  try {
    u = new URL(dbUrl.trim());
  } catch {
    throw new Error('FATAL: DATABASE_URL is malformed. Ensure it is a valid URL.');
  }

  if (u.protocol !== 'mysql:' && u.protocol !== 'mariadb:') {
    throw new Error(`FATAL: DATABASE_URL protocol "${u.protocol}" is unsupported. Only "mysql:" and "mariadb:" protocols are allowed.`);
  }

  const database = u.pathname.replace(/^\//, '').trim();
  if (!database) {
    throw new Error('FATAL: DATABASE_URL must specify a target database name.');
  }

  if (!u.hostname) {
    throw new Error('FATAL: DATABASE_URL must specify a target host.');
  }

  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database,
  };
}

function createDatabaseAdapter() {
  const config = validateDatabaseConfig();

  const pool = mariadb.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  });

  return new PrismaMariaDb(pool as any);
}

const adapter = createDatabaseAdapter();

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Pre-warm database connection pool on server boot
prisma.$connect()
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Database] MySQL connection pool initialized successfully.');
    }
  })
  .catch((err) => {
    console.warn('[Database] Initial DB warm-up connection failed:', err.message);
  });
