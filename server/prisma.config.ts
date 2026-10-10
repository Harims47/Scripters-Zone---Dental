import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Resolves the database connection URL for Prisma CLI.
 * Precedence:
 * 1. If all five GoDaddy DB_* variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) are present,
 *    synthesize the connection URL directly from them so a localhost DATABASE_URL never overrides GoDaddy.
 * 2. Otherwise, fall back to process.env.DATABASE_URL for local development.
 * Never logs credentials or complete URLs.
 */
export function resolvePrismaDatabaseUrl(): string | undefined {
  const dbHost = process.env.DB_HOST?.trim();
  const dbPortStr = process.env.DB_PORT?.trim();
  const dbName = process.env.DB_NAME?.trim();
  const dbUser = process.env.DB_USER?.trim();
  const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';

  const hasAllGoDaddyVars = Boolean(
    dbHost &&
    dbHost.length > 0 &&
    dbPortStr &&
    dbPortStr.length > 0 &&
    dbName &&
    dbName.length > 0 &&
    dbUser &&
    dbUser.length > 0 &&
    process.env.DB_PASSWORD !== undefined
  );

  if (hasAllGoDaddyVars) {
    const port = parseInt(dbPortStr!, 10);
    const validPort = isNaN(port) || port < 1 || port > 65535 ? 3306 : port;
    const encodedUser = encodeURIComponent(dbUser!);
    const encodedPass = encodeURIComponent(dbPassword);

    // Support TLS overrides if specified
    const queryParts: string[] = [];
    if (process.env.DATABASE_SSL === 'true') {
      queryParts.push('ssl=true');
    } else if (process.env.DATABASE_SSL === 'false') {
      queryParts.push('ssl=false');
    }
    if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
      queryParts.push('rejectUnauthorized=false');
    }
    if (process.env.DATABASE_SSL_CA) {
      queryParts.push(`sslca=${encodeURIComponent(process.env.DATABASE_SSL_CA)}`);
    }

    const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return `mysql://${encodedUser}:${encodedPass}@${dbHost}:${validPort}/${dbName}${queryStr}`;
  }

  return process.env.DATABASE_URL?.trim();
}

export default defineConfig({
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    url: resolvePrismaDatabaseUrl(),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
