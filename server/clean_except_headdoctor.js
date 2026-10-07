const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Strict safety check
const dbUrl = process.env.DATABASE_URL || '';
if (process.env.NODE_ENV === 'production' || !process.env.ALLOW_DATA_RESET || dbUrl.includes('render.com') || dbUrl.includes('godaddy') || dbUrl.includes('supabase')) {
  console.error('[SAFETY SHIELD] Refusing to run cleanup: ALLOW_DATA_RESET=true is required and cannot run in production.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function cleanDataExceptHeadDoctor() {
  console.log('--- STARTING TOTAL CLEANUP EXCEPT HEAD DOCTOR ---');

  // 1. Operational, Clinical & Billing transactions
  console.log('Deleting Supplier Payments & Bills...');
  await prisma.supplierPayment.deleteMany({});
  await prisma.supplierBill.deleteMany({});

  console.log('Deleting Purchase Order Items & Purchase Orders...');
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});

  console.log('Deleting Stock Movements...');
  await prisma.stockMovement.deleteMany({});

  console.log('Deleting Dispensing, Prescriptions, Consultations, Queue Entries, Payments...');
  await prisma.dispensingItem.deleteMany({});
  await prisma.dispensing.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.consultation.deleteMany({});
  await prisma.queueEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.treatmentPlanItem.deleteMany({});
  await prisma.treatmentPlan.deleteMany({});

  console.log('Deleting Visits & Appointments...');
  await prisma.visit.deleteMany({});
  await prisma.appointment.deleteMany({});

  console.log('Deleting Notifications, Reimbursements, Migration Records, Dental Images...');
  await prisma.dentalImage.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.reimbursementDocument.deleteMany({});
  await prisma.historicalMigrationRecord.deleteMany({});
  await prisma.historicalMigrationBatch.deleteMany({});

  console.log('Deleting Patients...');
  await prisma.patient.deleteMany({});

  // 2. Inventory & Supplier Catalogs (Preserved as requested)
  console.log('Preserving Inventory: Medicines, Categories, Suppliers intact...');
  // await prisma.supplierMedicineCategory.deleteMany({});
  // await prisma.supplier.deleteMany({});
  // await prisma.medicine.deleteMany({});
  // await prisma.medicineCategory.deleteMany({});

  // 3. Delete Non-Head-Doctor Users & Staff
  console.log('Deleting Non-Head-Doctor Users...');
  await prisma.user.deleteMany({
    where: {
      role: { not: 'Head Doctor' }
    }
  });

  // Find the primary Head Doctor user to know their staffId
  const headUser = await prisma.user.findFirst({
    where: { role: 'Head Doctor' }
  });

  const headStaffId = headUser ? headUser.staffId : null;

  console.log('Deleting Non-Head-Doctor Staff (retaining staffId:', headStaffId, ')...');
  if (headStaffId) {
    await prisma.staff.deleteMany({
      where: {
        id: { not: headStaffId }
      }
    });
  } else {
    // If no staffId linked, keep all role == 'Head Doctor' staff
    await prisma.staff.deleteMany({
      where: {
        role: { not: 'Head Doctor' }
      }
    });
  }

  // Ensure head doctor staff status and attendance are clean
  if (headStaffId) {
    await prisma.staff.update({
      where: { id: headStaffId },
      data: {
        attendance: 'Present',
        status: 'Active'
      }
    });
  }

  console.log('--- CLEANUP COMPLETE ---');
  
  // Verification log
  console.log('Remaining Users:', await prisma.user.findMany({ select: { username: true, role: true, staffId: true } }));
  console.log('Remaining Staff:', await prisma.staff.findMany({ select: { id: true, name: true, role: true } }));
  console.log('Patients Count:', await prisma.patient.count());
  console.log('Visits Count:', await prisma.visit.count());
  console.log('Appointments Count:', await prisma.appointment.count());
  console.log('Payments Count:', await prisma.payment.count());
  console.log('Medicines Count:', await prisma.medicine.count());
  console.log('Suppliers Count:', await prisma.supplier.count());
}

cleanDataExceptHeadDoctor()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
