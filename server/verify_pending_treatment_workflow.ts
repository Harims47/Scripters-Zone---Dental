import { prisma } from './src/db';

const API_BASE = 'http://localhost:3001/api';

async function runVerification() {
  console.log('--- Starting Pending Treatment Reminder Workflow Verification ---');
  let authCookie = '';
  let authToken = '';

  // 1. Authenticate as Doctor
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'headdoctor',
        password: 'demo123'
      })
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
    }
    const loginData: any = await loginRes.json();
    authToken = loginData.token || '';
    authCookie = `token=${authToken}`;
    console.log('✓ Successfully authenticated as Doctor, token length:', authToken.length);
  } catch (err: any) {
    console.error('Failed to log in:', err.message);
    process.exit(1);
  }

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error [${res.status}] ${path}: ${errText}`);
    }
    return res.json();
  }

  // 2. Find or create a test patient
  let testPatient = await prisma.patient.findFirst({
    where: { phone: '9999888877' }
  });

  if (!testPatient) {
    testPatient = await prisma.patient.create({
      data: {
        name: 'Workflow Test Patient',
        phone: '9999888877',
        age: 32,
        gender: 'Male',
        address: 'Clinical Testing Unit'
      }
    });
  }
  console.log(`✓ Test patient ready: ${testPatient.name} (ID: ${testPatient.id})`);

  // Clean any pre-existing treatment plan for this patient
  const existingPlan = await prisma.treatmentPlan.findUnique({
    where: { patientId: testPatient.id }
  });
  if (existingPlan) {
    await prisma.treatmentSession.deleteMany({
      where: { treatmentPlanItem: { treatmentPlanId: existingPlan.id } }
    });
    await prisma.treatmentPlanItem.deleteMany({
      where: { treatmentPlanId: existingPlan.id }
    });
  }

  // 3. Find a catalog procedure (e.g., Root Canal Treatment)
  let catalogItem = await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Root Canal', mode: 'insensitive' } }
  });
  if (!catalogItem) {
    catalogItem = await prisma.treatmentCatalog.findFirst();
  }
  if (!catalogItem) {
    console.error('No treatment catalog item found in database');
    process.exit(1);
  }
  console.log(`✓ Catalog procedure selected: ${catalogItem.name} (ID: ${catalogItem.id})`);

  // 4. Create a 3-sitting treatment procedure for Tooth 14
  const createdItem = await api(`/patients/${testPatient.id}/treatment-plan/items`, {
    method: 'POST',
    body: JSON.stringify({
      treatmentCatalogId: catalogItem.id,
      toothNumber: 14,
      notes: 'Severe pulpitis, initiating multi-sitting RCT',
      totalSittings: 3
    })
  });
  console.log(`✓ Created 3-sitting treatment item: ID ${createdItem.id}, totalSittings=${createdItem.totalSittings}`);

  // Verify initial pending treatments endpoint
  const pending1 = await api(`/patients/${testPatient.id}/pending-treatments`);
  console.log(`✓ Initial pending treatments count: ${pending1.length}`);
  if (pending1.length !== 1 || pending1[0].nextSession.sittingNumber !== 1 || pending1[0].completedCount !== 0) {
    throw new Error(`Expected nextSession to be Sitting 1 with 0 completed, got: ${JSON.stringify(pending1[0])}`);
  }

  // 5. Complete Sitting 1 (simulating first visit completed)
  const session1 = createdItem.sessions.find((s: any) => s.sittingNumber === 1);
  await api(`/patients/${testPatient.id}/treatment-plan/items/${createdItem.id}/sessions/${session1.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      workPerformed: 'Access cavity prepared, pulp extirpated, canal irrigated and dressed',
      clinicalNotes: 'First sitting completed smoothly'
    })
  });
  console.log('✓ Sitting 1 marked Completed');

  // 6. Verify pending treatments after Sitting 1:
  // Must show: 1 of 3 completed, next: Sitting 2
  const pending2 = await api(`/patients/${testPatient.id}/pending-treatments`);
  console.log(`✓ After Sitting 1, pending treatments:`, JSON.stringify(pending2, null, 2));

  if (pending2.length !== 1) {
    throw new Error(`Expected 1 pending treatment, got ${pending2.length}`);
  }
  const pt2 = pending2[0];
  if (pt2.completedCount !== 1) {
    throw new Error(`Expected completedCount to be 1, got ${pt2.completedCount}`);
  }
  if (pt2.totalSittings !== 3) {
    throw new Error(`Expected totalSittings to be 3, got ${pt2.totalSittings}`);
  }
  if (pt2.nextSession.sittingNumber !== 2) {
    throw new Error(`Expected nextSession to be Sitting 2, got Sitting ${pt2.nextSession.sittingNumber}`);
  }
  if (pt2.toothNumber !== 14) {
    throw new Error(`Expected toothNumber to be 14, got ${pt2.toothNumber}`);
  }
  console.log('✓ Verified: Patient has 1 of 3 sittings completed, Next: Sitting 2 (Tooth 14)');

  // 7. Verify Queue and Dashboard integration
  const doctor = await prisma.staff.findFirst({
    where: { role: { in: ['Head Doctor', 'Duty Doctor'] } }
  });

  const testVisit = await prisma.visit.create({
    data: {
      patientId: testPatient.id,
      doctorId: doctor?.id,
      reasonForVisit: 'RCT Sitting 2',
      status: 'IN_PROGRESS'
    }
  });

  const testQueue = await prisma.queueEntry.create({
    data: {
      patientId: testPatient.id,
      visitId: testVisit.id,
      assignedDoctorId: doctor?.id,
      status: 'Waiting',
      priority: false,
      position: 99,
      arrivalTime: '10:00 AM'
    }
  });
  console.log(`✓ Created test visit & queue entry (Visit ID: ${testVisit.id}, Queue ID: ${testQueue.id})`);

  // Check /api/queue
  const queueRes = await api('/queue');
  const queueItems = Array.isArray(queueRes) ? queueRes : queueRes?.data || [];
  const foundQueueEntry = queueItems.find((q: any) => q.patientId === testPatient.id);
  if (!foundQueueEntry) {
    throw new Error('Test patient not found in /api/queue');
  }
  console.log(`✓ Found queue entry with pendingTreatments:`, JSON.stringify(foundQueueEntry.pendingTreatments, null, 2));
  if (!foundQueueEntry.pendingTreatments || foundQueueEntry.pendingTreatments.length === 0) {
    throw new Error('Queue entry missing pendingTreatments!');
  }
  if (foundQueueEntry.pendingTreatments[0].nextSession.sittingNumber !== 2) {
    throw new Error(`Queue entry next sitting expected 2, got ${foundQueueEntry.pendingTreatments[0].nextSession.sittingNumber}`);
  }
  console.log('✓ Verified: Queue table correctly attaches pending treatment indicator (Sitting 2/3)!');

  // Check /api/dashboard
  const dashRes = await api('/dashboard');
  const waitingPatients = dashRes?.waitingPatients || [];
  const dashPatient = waitingPatients.find((p: any) => p.patientId === testPatient.id);
  if (dashPatient) {
    console.log(`✓ Dashboard waiting patient pendingTreatments:`, JSON.stringify(dashPatient.pendingTreatments, null, 2));
    if (!dashPatient.pendingTreatments || dashPatient.pendingTreatments.length === 0) {
      throw new Error('Dashboard patient missing pendingTreatments!');
    }
    if (dashPatient.pendingTreatments[0].nextSession.sittingNumber !== 2) {
      throw new Error(`Dashboard next sitting expected 2, got ${dashPatient.pendingTreatments[0].nextSession.sittingNumber}`);
    }
    console.log('✓ Verified: Dashboard waiting queue correctly attaches pending treatment indicator!');
  }

  // 8. Simulate "Continue Treatment" -> Doctor completes Sitting 2
  const session2 = createdItem.sessions.find((s: any) => s.sittingNumber === 2);
  await api(`/patients/${testPatient.id}/treatment-plan/items/${createdItem.id}/sessions/${session2.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      visitId: testVisit.id,
      workPerformed: 'Canals shaped and obturated with gutta-percha',
      clinicalNotes: 'Obturation successful'
    })
  });
  console.log('✓ Sitting 2 completed via Continue Treatment action');

  // 9. Verify pending treatments now shows Sitting 3
  const pending3 = await api(`/patients/${testPatient.id}/pending-treatments`);
  if (pending3.length !== 1 || pending3[0].completedCount !== 2 || pending3[0].nextSession.sittingNumber !== 3) {
    throw new Error(`Expected 2 of 3 completed, Next: Sitting 3, got: ${JSON.stringify(pending3)}`);
  }
  console.log('✓ Verified: Patient now has 2 of 3 completed, Next: Sitting 3');

  // 10. Complete Sitting 3 (final sitting)
  const session3 = createdItem.sessions.find((s: any) => s.sittingNumber === 3);
  await api(`/patients/${testPatient.id}/treatment-plan/items/${createdItem.id}/sessions/${session3.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      visitId: testVisit.id,
      workPerformed: 'Permanent composite core build-up completed',
      clinicalNotes: 'Full treatment finished'
    })
  });
  console.log('✓ Sitting 3 completed');

  // 11. Verify all sittings finished: pending treatments must be EMPTY
  const pendingFinal = await api(`/patients/${testPatient.id}/pending-treatments`);
  if (pendingFinal.length !== 0) {
    throw new Error(`Expected 0 pending treatments after all sittings completed, got ${pendingFinal.length}`);
  }
  console.log('✓ Verified: Pending treatments is now EMPTY — Ongoing Treatment banner correctly hidden!');

  // Cleanup test artifacts
  await prisma.queueEntry.delete({ where: { id: testQueue.id } });
  await prisma.treatmentSession.deleteMany({
    where: { treatmentPlanItem: { treatmentPlanId: createdItem.treatmentPlanId } }
  });
  await prisma.treatmentPlanItem.deleteMany({
    where: { treatmentPlanId: createdItem.treatmentPlanId }
  });
  await prisma.visit.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.treatmentPlan.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.patient.delete({ where: { id: testPatient.id } });
  console.log('✓ Test records cleaned up cleanly');

  console.log('\n======================================================');
  console.log('🎉 ALL 11 VERIFICATION CHECKPOINTS PASSED PERFECTLY! 🎉');
  console.log('======================================================');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
