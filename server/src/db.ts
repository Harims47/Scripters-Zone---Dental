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
 * Parses TLS / SSL configuration safely from query parameters and environment overrides.
 * Preserves strict certificate verification by default. Never leaks secrets.
 */
function parseTlsConfiguration(
  searchParams?: URLSearchParams | null
): boolean | (SecureContextOptions & { rejectUnauthorized?: boolean }) | undefined {
  const sslParam = searchParams?.get('ssl');
  const sslModeParam = searchParams?.get('sslmode') || searchParams?.get('ssl-mode');
  const rejectUnauthorizedParam = searchParams?.get('rejectUnauthorized') || searchParams?.get('reject-unauthorized');
  const sslCaParam = searchParams?.get('sslca') || searchParams?.get('ssl-ca');

  const isSslRequested =
    sslParam === 'true' ||
    sslParam === '1' ||
    (sslModeParam !== null &&
      sslModeParam !== undefined &&
      ['require', 'required', 'verify_ca', 'verify-ca', 'verify_identity', 'verify-full', 'prefer'].includes(
        sslModeParam.toLowerCase()
      )) ||
    process.env.DATABASE_SSL === 'true';

  const isSslExplicitlyDisabled =
    sslParam === 'false' ||
    sslParam === '0' ||
    (sslModeParam !== null &&
      sslModeParam !== undefined &&
      ['disable', 'disabled'].includes(sslModeParam.toLowerCase())) ||
    process.env.DATABASE_SSL === 'false';

  if (isSslExplicitlyDisabled) {
    return false;
  }

  if (isSslRequested) {
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

    return sslConfig;
  }

  return undefined;
}

/**
 * Validates the database configuration from environment variables.
 * Precedence:
 * 1. If all five GoDaddy DB_* variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) are present and valid,
 *    use them directly to configure the connection. (A localhost DATABASE_URL will never override GoDaddy DB_*).
 * 2. Otherwise, fall back to DATABASE_URL for local development and other environments.
 * 3. If neither configuration is complete, fail closed immediately with a sanitized error message.
 * Never logs or exposes credentials.
 */
export function validateDatabaseConfig(): ValidatedDatabaseConfig {
  const dbHost = process.env.DB_HOST?.trim();
  const dbPortStr = process.env.DB_PORT?.trim();
  const dbName = process.env.DB_NAME?.trim();
  const dbUser = process.env.DB_USER?.trim();
  const dbPassword = process.env.DB_PASSWORD;

  // Check if all five GoDaddy native variables are provided
  const hasGoDaddyConfig = Boolean(
    dbHost &&
    dbHost.length > 0 &&
    dbPortStr &&
    dbPortStr.length > 0 &&
    dbName &&
    dbName.length > 0 &&
    dbUser &&
    dbUser.length > 0 &&
    dbPassword !== undefined
  );

  if (hasGoDaddyConfig) {
    const port = parseInt(dbPortStr!, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`FATAL: GoDaddy DB_PORT "${dbPortStr}" is invalid. Port must be an integer between 1 and 65535.`);
    }

    const ssl = parseTlsConfiguration(null);

    return {
      host: dbHost!,
      port,
      user: dbUser!,
      password: dbPassword,
      database: dbName!,
      ...(ssl !== undefined ? { ssl } : {}),
    };
  }

  // Fallback to DATABASE_URL for local development and non-GoDaddy environments
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error(
      'FATAL: DATABASE_URL environment variable is missing. DentalCore requires either complete GoDaddy variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) or a valid MySQL DATABASE_URL.'
    );
  }

  let u: URL;
  try {
    u = new URL(dbUrl);
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

  let port = 3306;
  if (u.port) {
    port = parseInt(u.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`FATAL: DATABASE_URL port "${u.port}" is invalid. Port must be an integer between 1 and 65535.`);
    }
  }

  const ssl = parseTlsConfiguration(u.searchParams);

  return {
    host: u.hostname,
    port,
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
