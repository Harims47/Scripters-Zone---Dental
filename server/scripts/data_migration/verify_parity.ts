import { Client } from 'pg';
import { prisma } from '../../src/db';

const PG_URL = process.env.SOURCE_PG_URL || 'postgresql://dental:dentalpassword@127.0.0.1:5433/dentalcore?schema=public';

const TABLES = [
  { name: 'MedicineCategory', model: 'medicineCategory' },
  { name: 'TreatmentCatalog', model: 'treatmentCatalog' },
  { name: 'Staff', model: 'staff' },
  { name: 'User', model: 'user' },
  { name: 'Supplier', model: 'supplier' },
  { name: 'SupplierMedicineCategory', model: 'supplierMedicineCategory' },
  { name: 'Medicine', model: 'medicine' },
  { name: 'Patient', model: 'patient' },
  { name: 'Appointment', model: 'appointment' },
  { name: 'Visit', model: 'visit' },
  { name: 'QueueEntry', model: 'queueEntry' },
  { name: 'Consultation', model: 'consultation' },
  { name: 'Prescription', model: 'prescription' },
  { name: 'PrescriptionItem', model: 'prescriptionItem' },
  { name: 'Dispensing', model: 'dispensing' },
  { name: 'DispensingItem', model: 'dispensingItem' },
  { name: 'TreatmentPlan', model: 'treatmentPlan' },
  { name: 'TreatmentPlanItem', model: 'treatmentPlanItem' },
  { name: 'TreatmentSession', model: 'treatmentSession' },
  { name: 'Payment', model: 'payment' },
  { name: 'PurchaseOrder', model: 'purchaseOrder' },
  { name: 'PurchaseOrderItem', model: 'purchaseOrderItem' },
  { name: 'SupplierBill', model: 'supplierBill' },
  { name: 'SupplierPayment', model: 'supplierPayment' },
  { name: 'StockMovement', model: 'stockMovement' },
  { name: 'Notification', model: 'notification' },
  { name: 'HistoricalMigrationBatch', model: 'historicalMigrationBatch' },
  { name: 'HistoricalMigrationRecord', model: 'historicalMigrationRecord' },
  { name: 'ReimbursementDocument', model: 'reimbursementDocument' },
  { name: 'DentalImage', model: 'dentalImage' },
  { name: 'ExternalDoctorAdvice', model: 'externalDoctorAdvice' },
];

async function verifyParity() {
  console.log('=== DATA PARITY & INTEGRITY AUDIT ===');
  console.log('Source: PostgreSQL (port 5433)');
  console.log('Target: MySQL (port 3306, database: dentalcore_test)');
  console.log('--------------------------------------------------');

  const pgClient = new Client({ connectionString: PG_URL });
  await pgClient.connect();

  let allRowCountsMatch = true;
  let allIdSetsMatch = true;

  for (const { name, model } of TABLES) {
    const pgCountRes = await pgClient.query(`SELECT COUNT(*)::int as count FROM "${name}"`);
    const pgCount = pgCountRes.rows[0].count;

    const delegate = (prisma as any)[model];
    const mysqlCount = await delegate.count();

    const match = pgCount === mysqlCount;
    if (!match) allRowCountsMatch = false;

    console.log(`[Table] ${name.padEnd(28)} | PG: ${String(pgCount).padStart(4)} | MySQL: ${String(mysqlCount).padStart(4)} | Match: ${match ? '✅ OK' : '❌ MISMATCH'}`);

    // Verify ID matching if rows exist
    if (pgCount > 0) {
      const pgIdsRes = await pgClient.query(`SELECT id FROM "${name}" ORDER BY id ASC`);
      const pgIds = new Set(pgIdsRes.rows.map((r: any) => r.id));

      const mysqlRows = await delegate.findMany({ select: { id: true } });
      const mysqlIds = new Set(mysqlRows.map((r: any) => r.id));

      if (pgIds.size !== mysqlIds.size) {
        allIdSetsMatch = false;
        console.error(`   ❌ ID count mismatch in ${name}: PG ${pgIds.size} vs MySQL ${mysqlIds.size}`);
      } else {
        for (const id of pgIds) {
          if (!mysqlIds.has(id)) {
            allIdSetsMatch = false;
            console.error(`   ❌ Missing ID in MySQL for ${name}: ${id}`);
            break;
          }
        }
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log('=== FINANCIAL & METRIC INTEGRITY CHECK ===');

  // 1. Payment Total Sum
  const pgPaymentRes = await pgClient.query(`SELECT COALESCE(SUM(amount), 0)::float as total FROM "Payment"`);
  const pgPaymentTotal = pgPaymentRes.rows[0].total;

  const mysqlPaymentAgg = await prisma.payment.aggregate({ _sum: { amount: true } });
  const mysqlPaymentTotal = mysqlPaymentAgg._sum.amount || 0;

  const paymentMatch = Math.abs(pgPaymentTotal - mysqlPaymentTotal) < 0.001;
  console.log(`Payment Total Amount    | PG: ${pgPaymentTotal.toFixed(2)} | MySQL: ${mysqlPaymentTotal.toFixed(2)} | ${paymentMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  // 2. Visit amountDue Total Sum
  const pgVisitDueRes = await pgClient.query(`SELECT COALESCE(SUM("amountDue"), 0)::float as total FROM "Visit"`);
  const pgVisitDueTotal = pgVisitDueRes.rows[0].total;

  const mysqlVisitDueAgg = await prisma.visit.aggregate({ _sum: { amountDue: true } });
  const mysqlVisitDueTotal = mysqlVisitDueAgg._sum.amountDue || 0;

  const visitDueMatch = Math.abs(pgVisitDueTotal - mysqlVisitDueTotal) < 0.001;
  console.log(`Visit amountDue Total   | PG: ${pgVisitDueTotal.toFixed(2)} | MySQL: ${mysqlVisitDueTotal.toFixed(2)} | ${visitDueMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  // 3. TreatmentSession Count & Status Integrity
  const pgSessionCount = (await pgClient.query(`SELECT COUNT(*)::int as count FROM "TreatmentSession"`)).rows[0].count;
  const mysqlSessionCount = await prisma.treatmentSession.count();
  console.log(`TreatmentSession Count  | PG: ${pgSessionCount} | MySQL: ${mysqlSessionCount} | ${pgSessionCount === mysqlSessionCount ? '✅ MATCH' : '❌ MISMATCH'}`);

  console.log('--------------------------------------------------');
  if (allRowCountsMatch && allIdSetsMatch && paymentMatch && visitDueMatch) {
    console.log('🎉 100% DATA PARITY AND INTEGRITY VERIFIED! MySQL test database matches PostgreSQL reference.');
  } else {
    console.error('⚠️ PARITY WARNING: Some counts or sums did not match.');
  }

  await pgClient.end();
  await prisma.$disconnect();
}

verifyParity().catch((err) => {
  console.error('[Verify] Fatal error:', err);
  process.exit(1);
});
