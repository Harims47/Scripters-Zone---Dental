const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.consultation.deleteMany({});
  await prisma.queueEntry.deleteMany({});
  await prisma.dispensingItem.deleteMany({});
  await prisma.dispensing.deleteMany({});
  await prisma.visit.deleteMany({});
  
  // Also delete patients created by tests
  await prisma.patient.deleteMany({
    where: { name: 'Test User' }
  });
  
  console.log('Database cleaned up!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
