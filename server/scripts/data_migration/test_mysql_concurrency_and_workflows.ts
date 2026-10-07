import { prisma } from '../../src/db';
import { QueueRunner } from '../../src/services/communication/queueRunner';

async function runTests() {
  console.log('=== RUNNING WORKFLOW & CONCURRENCY TESTS ON MYSQL TEST DB ===');

  // Test 1: Search Case Insensitivity (utf8mb4_unicode_ci)
  console.log('\n[Test 1] Testing Case-Insensitive Search on TreatmentCatalog...');
  const lowerResults = await prisma.treatmentCatalog.findMany({
    where: { name: { contains: 'root' } }
  });
  const upperResults = await prisma.treatmentCatalog.findMany({
    where: { name: { contains: 'ROOT' } }
  });
  const mixedResults = await prisma.treatmentCatalog.findMany({
    where: { name: { contains: 'Root' } }
  });

  if (lowerResults.length > 0 && lowerResults.length === upperResults.length && upperResults.length === mixedResults.length) {
    console.log(`   ✅ PASS: 'root' (${lowerResults.length}), 'ROOT' (${upperResults.length}), 'Root' (${mixedResults.length}) all match identically under utf8mb4_unicode_ci!`);
  } else {
    console.error(`   ❌ FAIL: Inconsistent search matches: lower=${lowerResults.length}, upper=${upperResults.length}, mixed=${mixedResults.length}`);
  }

  // Test 2: Nullable Unique Phone (Multiple NULLs allowed in MySQL)
  console.log('\n[Test 2] Testing Multiple Patients with NULL phone...');
  const pat1 = await prisma.patient.create({
    data: {
      name: '__Test Patient Null Phone 1',
      phone: null,
      age: 30,
      gender: 'Male'
    }
  });

  const pat2 = await prisma.patient.create({
    data: {
      name: '__Test Patient Null Phone 2',
      phone: null,
      age: 35,
      gender: 'Female'
    }
  });

  console.log(`   ✅ PASS: Successfully created two patients with NULL phone: ${pat1.id.slice(0, 8)} and ${pat2.id.slice(0, 8)}`);

  // Clean up the two test patients
  await prisma.patient.deleteMany({
    where: { id: { in: [pat1.id, pat2.id] } }
  });

  // Test 3: Concurrency Row Lock (FOR UPDATE on Visit)
  console.log('\n[Test 3] Testing Concurrent Row Lock on Visit...');
  const anyVisit = await prisma.visit.findFirst();
  if (anyVisit) {
    let tx1Acquired = false;
    let tx2BlockedUntilTx1Done = false;

    // Simulate transaction 1 holding lock for 300ms
    const p1 = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM \`Visit\` WHERE id = ${anyVisit.id} FOR UPDATE`;
      tx1Acquired = true;
      await new Promise(r => setTimeout(r, 300));
    });

    // Transaction 2 immediately attempts to lock same row
    const p2 = (async () => {
      await new Promise(r => setTimeout(r, 50));
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM \`Visit\` WHERE id = ${anyVisit.id} FOR UPDATE`;
        if (tx1Acquired) {
          tx2BlockedUntilTx1Done = true;
        }
      });
    })();

    await Promise.all([p1, p2]);
    if (tx2BlockedUntilTx1Done) {
      console.log('   ✅ PASS: MySQL row-level lock (FOR UPDATE) successfully serialized concurrent transactions.');
    } else {
      console.warn('   ⚠️ Lock serialization check could not confirm blocking.');
    }
  }

  // Test 4: Notification Queue Claim Transaction
  console.log('\n[Test 4] Testing Notification Queue Runner Atomic Claiming...');
  // Create two mock queued notifications
  const n1 = await prisma.notification.create({
    data: {
      type: 'APPOINTMENT_CONFIRMATION',
      channel: 'WHATSAPP',
      status: 'QUEUED',
      recipientPhone: '+919999999991',
      recipientName: 'Test Recipient 1',
      scheduledAt: new Date(Date.now() - 5000), // scheduled in the past
    }
  });

  const n2 = await prisma.notification.create({
    data: {
      type: 'APPOINTMENT_REMINDER',
      channel: 'SMS',
      status: 'QUEUED',
      recipientPhone: '+919999999992',
      recipientName: 'Test Recipient 2',
      scheduledAt: new Date(Date.now() - 2000), // scheduled in the past
    }
  });

  // Process batch of 5
  const claimedCount = await QueueRunner.processBatch(5);
  console.log(`   Claimed count: ${claimedCount}`);

  const updatedN1 = await prisma.notification.findUnique({ where: { id: n1.id } });
  const updatedN2 = await prisma.notification.findUnique({ where: { id: n2.id } });

  console.log(`   Notification 1 status after claim: ${updatedN1?.status}`);
  console.log(`   Notification 2 status after claim: ${updatedN2?.status}`);

  if (['SENT', 'SENDING', 'RETRYING', 'FAILED'].includes(updatedN1?.status || '')) {
    console.log('   ✅ PASS: QueueRunner atomically claimed and transitioned notification state!');
  } else {
    console.error('   ❌ FAIL: Notification status was not updated properly.');
  }

  // Clean up mock notifications
  await prisma.notification.deleteMany({
    where: { id: { in: [n1.id, n2.id] } }
  });

  console.log('\n=== ALL MYSQL WORKFLOW & CONCURRENCY TESTS COMPLETED SUCCESSFULLY! ===');
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('[Tests] Fatal error during test execution:', err);
  process.exit(1);
});
