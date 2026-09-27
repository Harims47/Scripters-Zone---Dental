import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { Pool } = require(path.resolve('./server/node_modules/pg'));

const DB_URL = process.env.DATABASE_URL || 'postgresql://dental:dentalpassword@127.0.0.1:5433/dentalcore';

/**
 * Ensures at least one active patient with an open visit exists in the database
 * so tests requiring an active consultation/visit can execute reliably.
 */
export async function ensureActiveTestPatient(): Promise<{ id: string; visitId: string }> {
  const pool = new Pool({ connectionString: DB_URL });
  try {
    const existing = await pool.query(`
      SELECT p.id, v.id as "visitId"
      FROM "Patient" p
      JOIN "Visit" v ON p.id = v."patientId"
      LEFT JOIN "Consultation" c ON c."visitId" = v.id
      WHERE p.status = 'Active' 
        AND v.status = 'WITH_DOCTOR'
        AND (c.status IS NULL OR c.status != 'Completed')
      ORDER BY v."createdAt" DESC
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Get doctor staff
    const doctorRes = await pool.query(`SELECT id FROM "Staff" WHERE role = 'Duty Doctor' LIMIT 1`);
    let doctorId = doctorRes.rows[0]?.id;
    if (!doctorId) {
      const anyStaff = await pool.query(`SELECT id FROM "Staff" LIMIT 1`);
      doctorId = anyStaff.rows[0]?.id;
    }

    // Check or create patient
    let patientRes = await pool.query(`SELECT id FROM "Patient" WHERE name = 'E2E Test Patient' LIMIT 1`);
    let patientId = patientRes.rows[0]?.id;
    if (!patientId) {
      const newPat = await pool.query(`
        INSERT INTO "Patient" (id, name, phone, age, gender, status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'E2E Test Patient', '9999900001', 35, 'Male', 'Active', NOW(), NOW())
        RETURNING id
      `);
      patientId = newPat.rows[0].id;
    }

    // Create visit
    const newVisit = await pool.query(`
      INSERT INTO "Visit" (id, "patientId", "doctorId", status, "reasonForVisit", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, 'WITH_DOCTOR', 'Consultation & Treatment Plan', NOW(), NOW())
      RETURNING id
    `, [patientId, doctorId]);

    return { id: patientId, visitId: newVisit.rows[0].id };
  } finally {
    await pool.end();
  }
}
