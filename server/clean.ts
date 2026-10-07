import { prisma } from './src/db';

async function main() {
  console.log('--- Wiping all patient operational records ---');

  // Delete in reverse dependency order
  const sessions = await prisma.treatmentSession.deleteMany({});
  console.log(`✓ Deleted ${sessions.count} treatment sessions`);

  const planItems = await prisma.treatmentPlanItem.deleteMany({});
  console.log(`✓ Deleted ${planItems.count} treatment plan items`);

  const plans = await prisma.treatmentPlan.deleteMany({});
  console.log(`✓ Deleted ${plans.count} treatment plans`);

  const dispensingItems = await prisma.dispensingItem.deleteMany({});
  console.log(`✓ Deleted ${dispensingItems.count} dispensing items`);

  const dispensings = await prisma.dispensing.deleteMany({});
  console.log(`✓ Deleted ${dispensings.count} dispensing records`);

  const rxItems = await prisma.prescriptionItem.deleteMany({});
  console.log(`✓ Deleted ${rxItems.count} prescription items`);

  const prescriptions = await prisma.prescription.deleteMany({});
  console.log(`✓ Deleted ${prescriptions.count} prescriptions`);

  const consultations = await prisma.consultation.deleteMany({});
  console.log(`✓ Deleted ${consultations.count} consultations`);

  const dentalImages = await prisma.dentalImage.deleteMany({});
  console.log(`✓ Deleted ${dentalImages.count} dental images`);

  const externalAdvices = await prisma.externalDoctorAdvice.deleteMany({});
  console.log(`✓ Deleted ${externalAdvices.count} external doctor advices`);

  const reimbursementDocs = await prisma.reimbursementDocument.deleteMany({});
  console.log(`✓ Deleted ${reimbursementDocs.count} reimbursement documents`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`✓ Deleted ${payments.count} payments`);

  const queue = await prisma.queueEntry.deleteMany({});
  console.log(`✓ Deleted ${queue.count} queue entries`);

  const visits = await prisma.visit.deleteMany({});
  console.log(`✓ Deleted ${visits.count} visits`);

  const appointments = await prisma.appointment.deleteMany({});
  console.log(`✓ Deleted ${appointments.count} appointments`);

  const notifications = await prisma.notification.deleteMany({});
  console.log(`✓ Deleted ${notifications.count} notifications`);

  // Disconnect historical migration patient references if any
  try {
    await prisma.historicalMigrationRecord.updateMany({
      data: {
        matchedPatientId: null,
        importedPatientId: null
      }
    });
  } catch (e) {
    // Ignore if table is empty or not in use
  }

  const patients = await prisma.patient.deleteMany({});
  console.log(`✓ Deleted ${patients.count} patients`);

  console.log('\n===============================================================');
  console.log('✓ All patient records and clinical visits have been wiped clean!');
  console.log('✓ Master catalogs (Treatments, Medicines), Staff & Users preserved.');
  console.log('===============================================================');
}

main()
  .catch((err) => {
    console.error('Failed to wipe patient records:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
