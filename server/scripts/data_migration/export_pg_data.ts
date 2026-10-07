import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const PG_URL = process.env.SOURCE_PG_URL || 'postgresql://dental:dentalpassword@127.0.0.1:5433/dentalcore?schema=public';
const STAGING_DIR = path.join(__dirname, '..', '..', 'data_migration_staging');

const TABLES = [
  'MedicineCategory',
  'TreatmentCatalog',
  'Staff',
  'User',
  'Supplier',
  'SupplierMedicineCategory',
  'Medicine',
  'Patient',
  'Appointment',
  'Visit',
  'QueueEntry',
  'Consultation',
  'Prescription',
  'PrescriptionItem',
  'Dispensing',
  'DispensingItem',
  'TreatmentPlan',
  'TreatmentPlanItem',
  'TreatmentSession',
  'Payment',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'SupplierBill',
  'SupplierPayment',
  'StockMovement',
  'Notification',
  'HistoricalMigrationBatch',
  'HistoricalMigrationRecord',
  'ReimbursementDocument',
  'DentalImage',
  'ExternalDoctorAdvice'
];

async function runExport() {
  console.log('[Export] Connecting to PostgreSQL at:', PG_URL.replace(/:[^:@]+@/, ':***@'));
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
  }

  const manifest: Record<string, number> = {};

  for (const table of TABLES) {
    try {
      const res = await client.query(`SELECT * FROM "${table}"`);
      const filePath = path.join(STAGING_DIR, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf-8');
      manifest[table] = res.rows.length;
      console.log(`[Export] ${table}: ${res.rows.length} row(s) exported.`);
    } catch (err: any) {
      console.warn(`[Export] Table "${table}" query skipped/failed:`, err.message);
      manifest[table] = 0;
    }
  }

  fs.writeFileSync(
    path.join(STAGING_DIR, 'manifest.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), tables: manifest }, null, 2),
    'utf-8'
  );

  await client.end();
  console.log('[Export] Data export complete. Summary saved to data_migration_staging/manifest.json');
}

runExport().catch((err) => {
  console.error('[Export] Fatal error during export:', err);
  process.exit(1);
});
