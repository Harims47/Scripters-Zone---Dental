import dotenv from 'dotenv';
dotenv.config();

/**
 * Validates and retrieves the authoritative JWT secret.
 * Fails closed immediately if JWT_SECRET is missing or empty.
 * In production mode, enforces a minimum entropy requirement (at least 32 characters).
 */
export function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing. Authentication cannot function without a secure secret.');
  }

  if (process.env.NODE_ENV === 'production' && secret.trim().length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production mode.');
  }

  return secret.trim();
}

/**
 * Authoritative exported JWT_SECRET constant.
 * Evaluated at module load time to guarantee fail-closed behavior on startup.
 */
export const JWT_SECRET = validateJwtSecret();
