import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb, { type PoolConnection } from 'mariadb';
import type { SecureContextOptions } from 'node:tls';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface ValidatedDatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean | (SecureContextOptions & { rejectUnauthorized?: boolean });
}

/**
 * Validates the database configuration from environment variables.
 * Fails closed immediately if DATABASE_URL is missing, malformed, or targets an unsupported protocol.
 * Parses supported TLS settings if present without silently weakening certificate verification.
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

  // Parse TLS / SSL configuration safely
  const sslParam = u.searchParams.get('ssl');
  const sslModeParam = u.searchParams.get('sslmode') || u.searchParams.get('ssl-mode');
  const rejectUnauthorizedParam = u.searchParams.get('rejectUnauthorized') || u.searchParams.get('reject-unauthorized');
  const sslCaParam = u.searchParams.get('sslca') || u.searchParams.get('ssl-ca');

  let ssl: boolean | (SecureContextOptions & { rejectUnauthorized?: boolean }) | undefined = undefined;

  const isSslRequested =
    sslParam === 'true' ||
    sslParam === '1' ||
    (sslModeParam !== null && ['require', 'required', 'verify_ca', 'verify-ca', 'verify_identity', 'verify-full', 'prefer'].includes(sslModeParam.toLowerCase())) ||
    process.env.DATABASE_SSL === 'true';

  const isSslExplicitlyDisabled =
    sslParam === 'false' ||
    sslParam === '0' ||
    (sslModeParam !== null && ['disable', 'disabled'].includes(sslModeParam.toLowerCase())) ||
    process.env.DATABASE_SSL === 'false';

  if (isSslExplicitlyDisabled) {
    ssl = false;
  } else if (isSslRequested) {
    // Default to strict certificate verification; do not silently disable verification
    let rejectUnauthorized = true;
    if (
      rejectUnauthorizedParam === 'false' ||
      sslModeParam?.toLowerCase() === 'no-verify' ||
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false'
    ) {
      rejectUnauthorized = false;
    }

    const sslConfig: SecureContextOptions & { rejectUnauthorized?: boolean } = {
      rejectUnauthorized,
    };

    if (sslCaParam) {
      if (fs.existsSync(sslCaParam)) {
        sslConfig.ca = fs.readFileSync(sslCaParam);
      } else {
        throw new Error(`FATAL: Specified SSL CA file does not exist at "${sslCaParam}".`);
      }
    } else if (process.env.DATABASE_SSL_CA) {
      if (fs.existsSync(process.env.DATABASE_SSL_CA)) {
        sslConfig.ca = fs.readFileSync(process.env.DATABASE_SSL_CA);
      } else {
        sslConfig.ca = process.env.DATABASE_SSL_CA;
      }
    }

    ssl = sslConfig;
  }

  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database,
    ...(ssl !== undefined ? { ssl } : {}),
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
    connectTimeout: 10000, // 10 seconds for initial TCP / TLS socket handshake
    acquireTimeout: 10000, // 10 seconds for pool connection retrieval
    prepareCacheLength: 0, // Required for Prisma MariaDB adapter to prevent statement cache collisions
    allowPublicKeyRetrieval: true,
    ...(config.ssl !== undefined ? { ssl: config.ssl } : {}),
  });

  const adapter = new PrismaMariaDb(pool as any, {
    disposeExternalPool: true,
  });

  return { pool, adapter, config };
}

const { pool, adapter, config: dbConfig } = createDatabaseAdapter();

export { pool };

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Executes a real connectivity probe using direct pool connection and SELECT 1.
 * Logs sanitized diagnostic information without exposing credentials.
 * Fails if either the underlying socket connection or the Prisma query pipeline fails.
 */
export async function probeDatabaseConnectivity(): Promise<void> {
  // Step 1: Probe direct socket connection from the pool to capture underlying driver/socket errors
  let rawConn: PoolConnection | null = null;
  try {
    rawConn = await pool.getConnection();
  } catch (err: any) {
    const socketCode = err.cause?.code || err.cause?.errno || err.code || 'UNKNOWN';
    const socketMsg = err.cause?.message || err.message || 'Connection failed';
    const sanitizedHost = dbConfig.host;
    const sanitizedPort = dbConfig.port;
    console.error(
      `[Database] Connection probe failed: unable to acquire socket connection to ${sanitizedHost}:${sanitizedPort} (socketErrorCode: ${socketCode}, detail: ${socketMsg})`
    );
    throw new Error(
      `Database connectivity probe failed (socketErrorCode: ${socketCode}): ${socketMsg}`
    );
  } finally {
    if (rawConn) {
      await rawConn.release();
    }
  }

  // Step 2: Probe through Prisma query engine pipeline
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (err: any) {
    const errCode = (err as any).code || 'UNKNOWN';
    console.error(`[Database] SELECT 1 query probe failed via Prisma engine (code: ${errCode}): ${err.message}`);
    throw err;
  }
}

// Pre-warm and verify database connection on server boot
probeDatabaseConnectivity()
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Database] MySQL connection verified successfully via SELECT 1.');
    }
  })
  .catch((err) => {
    // Sanitized diagnostic logging - never expose credentials
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Database] Initial DB connectivity probe failed:', err.message);
    }
  });
