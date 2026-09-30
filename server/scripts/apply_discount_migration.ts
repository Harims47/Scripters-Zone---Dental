import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "discountReason" TEXT;
    `);
    console.log('✅ Applied discount columns migration to Visit table');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
