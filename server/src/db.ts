import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// Pre-warm database connection pool and schema cache on server boot to avoid first-request latency
pool.query('SELECT 1').catch((err) => {
  console.warn('Initial DB warm-up ping failed:', err.message);
});

