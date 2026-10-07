import { prisma } from '../../src/db';
import fs from 'fs';
import path from 'path';

const STAGING_DIR = path.join(__dirname, '..', '..', 'data_migration_staging');

// Strict topological order
const TABLE_MODELS: Array<{ table: string; model: string }> = [
  { table: 'MedicineCategory', model: 'medicineCategory' },
  { table: 'TreatmentCatalog', model: 'treatmentCatalog' },
  { table: 'Staff', model: 'staff' },
  { table: 'User', model: 'user' },
  { table: 'Supplier', model: 'supplier' },
  { table: 'SupplierMedicineCategory', model: 'supplierMedicineCategory' },
  { table: 'Medicine', model: 'medicine' },
  { table: 'Patient', model: 'patient' },
  { table: 'Appointment', model: 'appointment' },
  { table: 'Visit', model: 'visit' },
  { table: 'QueueEntry', model: 'queueEntry' },
  { table: 'Consultation', model: 'consultation' },
  { table: 'Prescription', model: 'prescription' },
  { table: 'PrescriptionItem', model: 'prescriptionItem' },
  { table: 'Dispensing', model: 'dispensing' },
  { table: 'DispensingItem', model: 'dispensingItem' },
  { table: 'TreatmentPlan', model: 'treatmentPlan' },
  { table: 'TreatmentPlanItem', model: 'treatmentPlanItem' },
  { table: 'TreatmentSession', model: 'treatmentSession' },
  { table: 'Payment', model: 'payment' },
  { table: 'PurchaseOrder', model: 'purchaseOrder' },
  { table: 'PurchaseOrderItem', model: 'purchaseOrderItem' },
  { table: 'SupplierBill', model: 'supplierBill' },
  { table: 'SupplierPayment', model: 'supplierPayment' },
  { table: 'StockMovement', model: 'stockMovement' },
  { table: 'Notification', model: 'notification' },
  { table: 'HistoricalMigrationBatch', model: 'historicalMigrationBatch' },
  { table: 'HistoricalMigrationRecord', model: 'historicalMigrationRecord' },
  { table: 'ReimbursementDocument', model: 'reimbursementDocument' },
  { table: 'DentalImage', model: 'dentalImage' },
  { table: 'ExternalDoctorAdvice', model: 'externalDoctorAdvice' },
];

function sanitizeRow(table: string, row: any) {
  const sanitized = { ...row };

  // Convert empty string phone to null for unique constraint in MySQL
  if (table === 'Patient' && sanitized.phone === '') {
    sanitized.phone = null;
  }
  if (table === 'Notification' && sanitized.idempotencyKey === '') {
    sanitized.idempotencyKey = null;
  }

  // Specific fields that are defined as String in Prisma schema (not DateTime)
  const STRING_DATE_FIELDS = new Set(['Payment.date', 'Appointment.date', 'ReimbursementDocument.documentDate', 'QueueEntry.arrivalTime']);

  // Ensure Date instances only for actual DateTime columns
  for (const [key, val] of Object.entries(sanitized)) {
    const fieldKey = `${table}.${key}`;
    if (!STRING_DATE_FIELDS.has(fieldKey) && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      sanitized[key] = new Date(val);
    }
  }

  return sanitized;
}

async function runImport() {
  console.log('[Import] Starting data import into target MySQL database...');

  // 1. Clear any prior test records in reverse topological order
  console.log('[Import] Clearing existing test records in reverse dependency order...');
  for (let i = TABLE_MODELS.length - 1; i >= 0; i--) {
    const { table, model } = TABLE_MODELS[i];
    const delegate = (prisma as any)[model];
    if (delegate) {
      try {
        await delegate.deleteMany({});
      } catch (e: any) {
        console.warn(`[Import] Could not clear table ${table}:`, e.message);
      }
    }
  }

  // 2. Insert records in strict forward topological order
  console.log('[Import] Inserting records in forward topological order...');
  for (const { table, model } of TABLE_MODELS) {
    const filePath = path.join(STAGING_DIR, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const rows: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (rows.length === 0) {
      console.log(`[Import] ${table}: 0 rows (skipped).`);
      continue;
    }

    const delegate = (prisma as any)[model];
    if (!delegate) {
      console.warn(`[Import] No Prisma delegate found for model "${model}".`);
      continue;
    }

    let inserted = 0;
    for (const rawRow of rows) {
      const sanitized = sanitizeRow(table, rawRow);
      await delegate.create({ data: sanitized });
      inserted++;
    }

    console.log(`[Import] ${table}: Successfully imported ${inserted} row(s).`);
  }

  await prisma.$disconnect();
  console.log('[Import] All tables successfully populated in target MySQL test database!');
}

runImport().catch((err) => {
  console.error('[Import] Fatal error during MySQL import:', err);
  process.exit(1);
});
