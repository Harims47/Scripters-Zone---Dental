import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ExternalDoctorAdvice" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE,
        "patientId" TEXT NOT NULL REFERENCES "Patient"("id") ON DELETE CASCADE,
        "doctorId" TEXT,
        "doctorName" TEXT NOT NULL,
        "doctorEmail" TEXT NOT NULL,
        "doctorPhone" TEXT,
        "speciality" TEXT NOT NULL,
        "hospitalClinic" TEXT,
        "medicalCondition" TEXT NOT NULL,
        "plannedProcedure" TEXT NOT NULL,
        "clinicalQuery" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "doctorResponse" TEXT,
        "emailSent" BOOLEAN NOT NULL DEFAULT false,
        "emailSentAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "ExternalDoctorAdvice_visitId_idx" ON "ExternalDoctorAdvice"("visitId");
      CREATE INDEX IF NOT EXISTS "ExternalDoctorAdvice_patientId_idx" ON "ExternalDoctorAdvice"("patientId");
      CREATE INDEX IF NOT EXISTS "ExternalDoctorAdvice_status_idx" ON "ExternalDoctorAdvice"("status");
    `);
    console.log('✅ Applied ExternalDoctorAdvice table migration successfully');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

main();
