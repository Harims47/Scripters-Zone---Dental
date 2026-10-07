import { prisma } from './src/db';

async function seedRealDashboardData() {
  console.log('--- Seeding Realistic Clinic Daily Operations Data ---');

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  // 1. Ensure Doctors exist and have rooms
  const headDoc = await prisma.staff.findFirst({ where: { role: 'Head Doctor' } });
  const dutyDoc = await prisma.staff.findFirst({ where: { role: 'Duty Doctor' } });

  if (headDoc) {
    await prisma.staff.update({
      where: { id: headDoc.id },
      data: { roomNumber: '101', attendance: 'Present', status: 'Active' }
    });
  }

  if (dutyDoc) {
    await prisma.staff.update({
      where: { id: dutyDoc.id },
      data: { roomNumber: '102', attendance: 'Present', status: 'Active' }
    });
  }

  // Ensure a 3rd doctor for variety
  let doc3 = await prisma.staff.findFirst({ where: { name: 'Dr. Priya Sharma' } });
  if (!doc3) {
    doc3 = await prisma.staff.create({
      data: {
        name: 'Dr. Priya Sharma',
        phone: '+91 98765 43230',
        role: 'Duty Doctor',
        status: 'Active',
        attendance: 'Present',
        roomNumber: '103'
      }
    });
  }

  // 2. Realistic Patients
  const patientsData = [
    { name: 'Rahul Sharma', phone: '+91 98451 10001', age: 34, gender: 'Male' },
    { name: 'Ananya Iyer', phone: '+91 98451 10002', age: 28, gender: 'Female' },
    { name: 'Vikram Patel', phone: '+91 98451 10003', age: 45, gender: 'Male' },
    { name: 'Deepa Nair', phone: '+91 98451 10004', age: 52, gender: 'Female' },
    { name: 'Kavita Reddy', phone: '+91 98451 10005', age: 31, gender: 'Female' },
    { name: 'Mohammed Farooq', phone: '+91 98451 10006', age: 39, gender: 'Male' },
    { name: 'Sneha Kulkarni', phone: '+91 98451 10007', age: 24, gender: 'Female' },
    { name: 'Arjun Das', phone: '+91 98451 10008', age: 41, gender: 'Male' },
    { name: 'Rohan Gupta', phone: '+91 98451 10009', age: 60, gender: 'Male' },
    { name: 'Meera Sen', phone: '+91 98451 10010', age: 36, gender: 'Female' }
  ];

  const patientMap: Record<string, any> = {};
  for (const p of patientsData) {
    let patient = await prisma.patient.findUnique({ where: { phone: p.phone } });
    if (!patient) {
      patient = await prisma.patient.create({ data: p });
    }
    patientMap[p.name] = patient;
  }

  // 3. Realistic Appointments for Today
  const apptsData = [
    { patient: 'Rahul Sharma', time: '09:30 AM', type: 'Routine Checkup', doc: headDoc?.id, status: 'Completed' },
    { patient: 'Ananya Iyer', time: '10:00 AM', type: 'Toothache', doc: dutyDoc?.id, status: 'Checked In' },
    { patient: 'Vikram Patel', time: '11:15 AM', type: 'Cleaning', doc: dutyDoc?.id, status: 'Confirmed' },
    { patient: 'Deepa Nair', time: '12:00 PM', type: 'Surgery', doc: headDoc?.id, status: 'Confirmed' },
    { patient: 'Kavita Reddy', time: '02:30 PM', type: 'Consultation', doc: doc3?.id, status: 'Scheduled' },
    { patient: 'Mohammed Farooq', time: '04:00 PM', type: 'Follow-up', doc: dutyDoc?.id, status: 'Scheduled' }
  ];

  for (const a of apptsData) {
    const pt = patientMap[a.patient];
    if (pt) {
      await prisma.appointment.create({
        data: {
          patientId: pt.id,
          providerId: a.doc || null,
          date: todayDateStr,
          time: a.time,
          type: a.type,
          status: a.status
        }
      });
    }
  }

  // Treatment catalogs
  const rctCatalog = await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Root Canal', mode: 'insensitive' } }
  }) || await prisma.treatmentCatalog.findFirst();

  const crownCatalog = await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Crown', mode: 'insensitive' } }
  }) || rctCatalog;

  // 4. Scenario A: In-Progress Patient with Duty Doctor (Dr. Carter)
  // Patient: Ananya Iyer — Returning for Sitting 2 of 3 (Root Canal Treatment Tooth 14)
  const ananya = patientMap['Ananya Iyer'];
  const ananyaVisit = await prisma.visit.create({
    data: {
      patientId: ananya.id,
      doctorId: dutyDoc?.id || null,
      status: 'WITH_DOCTOR',
      amountDue: 2500,
      reasonForVisit: 'RCT Sitting 2 (Obturation)',
      consultationFee: 500,
      treatmentFee: 2000
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: ananyaVisit.id,
      patientId: ananya.id,
      assignedDoctorId: dutyDoc?.id || null,
      position: 1,
      status: 'In Progress',
      priority: true,
      arrivalTime: '09:45 AM'
    }
  });

  // Treatment Plan for Ananya Iyer (Returning for Sitting 2 of 3)
  const ananyaPlan = await prisma.treatmentPlan.create({
    data: { patientId: ananya.id }
  });

  const ananyaRctItem = await prisma.treatmentPlanItem.create({
    data: {
      treatmentPlanId: ananyaPlan.id,
      treatmentCatalogId: rctCatalog!.id,
      toothNumber: 14,
      totalSittings: 3,
      status: 'In Progress',
      notes: 'Irreversible pulpitis on tooth 14. 3 sittings planned.'
    }
  });

  const prevWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Sitting 1: Completed previously
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: ananyaRctItem.id,
      sittingNumber: 1,
      stage: 'Sitting 1 - Access & Chemo-mechanical preparation',
      status: 'Completed',
      actualDate: prevWeek,
      plannedDate: prevWeek,
      clinicalNotes: 'Access cavity prepared. Canals irrigated with 3% NaOCl and EDTA. Calcium hydroxide paste placed.',
      workPerformed: 'Access cavity & canal cleaning'
    }
  });

  // Sitting 2: Planned for today!
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: ananyaRctItem.id,
      sittingNumber: 2,
      stage: 'Sitting 2 - Canal Obturation',
      status: 'Planned',
      plannedDate: now,
      clinicalNotes: 'Dry canals and obturate with gutta-percha cones and AH Plus sealer.'
    }
  });

  // Sitting 3: Planned next week
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: ananyaRctItem.id,
      sittingNumber: 3,
      stage: 'Sitting 3 - Permanent Core Build-up & Crown Evaluation',
      status: 'Planned',
      plannedDate: nextWeek,
      clinicalNotes: 'Post-endo restoration with nanohybrid composite resin.'
    }
  });

  // 5. Scenario B: Waiting Patients in Queue
  // Patient: Vikram Patel (Assigned to Dr. Carter) — Returning for Sitting 3 of 4 (Crown & Bridge Tooth 21)
  const vikram = patientMap['Vikram Patel'];
  const vikramVisit = await prisma.visit.create({
    data: {
      patientId: vikram.id,
      doctorId: dutyDoc?.id || null,
      status: 'WAITING',
      amountDue: 4500,
      reasonForVisit: 'Crown Try-in (Sitting 3/4)'
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: vikramVisit.id,
      patientId: vikram.id,
      assignedDoctorId: dutyDoc?.id || null,
      position: 2,
      status: 'Waiting',
      priority: false,
      arrivalTime: '10:05 AM'
    }
  });

  // Treatment Plan for Vikram Patel (Returning for Sitting 3 of 4)
  const vikramPlan = await prisma.treatmentPlan.create({
    data: { patientId: vikram.id }
  });

  const vikramCrownItem = await prisma.treatmentPlanItem.create({
    data: {
      treatmentPlanId: vikramPlan.id,
      treatmentCatalogId: crownCatalog!.id,
      toothNumber: 21,
      totalSittings: 4,
      status: 'In Progress',
      notes: 'Zirconia crown on upper central incisor #21'
    }
  });

  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: vikramCrownItem.id,
      sittingNumber: 1,
      stage: 'Sitting 1 - Tooth Preparation',
      status: 'Completed',
      actualDate: tenDaysAgo,
      plannedDate: tenDaysAgo,
      clinicalNotes: 'Circumferential chamfer finish line prepared. Gingival retraction cord #00 placed.',
      workPerformed: 'Tooth prep & provisional crown'
    }
  });

  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: vikramCrownItem.id,
      sittingNumber: 2,
      stage: 'Sitting 2 - Precision Impression',
      status: 'Completed',
      actualDate: fiveDaysAgo,
      plannedDate: fiveDaysAgo,
      clinicalNotes: 'Dual-phase PVS impression sent to laboratory for CAD/CAM milling.',
      workPerformed: 'Impression & shade selection (A2)'
    }
  });

  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: vikramCrownItem.id,
      sittingNumber: 3,
      stage: 'Sitting 3 - Zirconia Coping Try-in',
      status: 'Planned',
      plannedDate: now,
      clinicalNotes: 'Verify marginal fit, proximal contacts, and bite clearance with articulating paper.'
    }
  });

  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: vikramCrownItem.id,
      sittingNumber: 4,
      stage: 'Sitting 4 - Final Cementation',
      status: 'Planned',
      plannedDate: nextWeek,
      clinicalNotes: 'Resin-modified glass ionomer cementation and post-op care instructions.'
    }
  });


  // Patient: Deepa Nair (Unassigned walk-in / waiting)
  const deepa = patientMap['Deepa Nair'];
  const deepaVisit = await prisma.visit.create({
    data: {
      patientId: deepa.id,
      status: 'WAITING',
      amountDue: 1200,
      reasonForVisit: 'Bleeding gums & sensitivity'
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: deepaVisit.id,
      patientId: deepa.id,
      assignedDoctorId: null,
      position: 3,
      status: 'Waiting',
      priority: false,
      arrivalTime: '10:20 AM'
    }
  });

  // Patient: Kavita Reddy (Urgent walk-in, unassigned)
  const kavita = patientMap['Kavita Reddy'];
  const kavitaVisit = await prisma.visit.create({
    data: {
      patientId: kavita.id,
      status: 'WAITING',
      amountDue: 3500,
      reasonForVisit: 'Chipped front tooth from accident'
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: kavitaVisit.id,
      patientId: kavita.id,
      assignedDoctorId: null,
      position: 4,
      status: 'Waiting',
      priority: true,
      arrivalTime: '10:40 AM'
    }
  });

  // 6. Scenario C: Ready for Reception (Finished doctor consultation, pending checkout & payment)
  // Patient: Sneha Kulkarni
  const sneha = patientMap['Sneha Kulkarni'];
  const snehaVisit = await prisma.visit.create({
    data: {
      patientId: sneha.id,
      doctorId: headDoc?.id || null,
      status: 'READY_FOR_RECEPTION',
      amountDue: 3200,
      consultationFee: 700,
      treatmentFee: 2500,
      reasonForVisit: 'Composite restoration tooth #14'
    }
  });

  await prisma.queueEntry.create({
    data: {
      visitId: snehaVisit.id,
      patientId: sneha.id,
      assignedDoctorId: headDoc?.id || null,
      position: 5,
      status: 'Completed',
      priority: false,
      arrivalTime: '09:00 AM'
    }
  });

  // Patient: Arjun Das (Ready for Reception with partial payment)
  const arjun = patientMap['Arjun Das'];
  const arjunVisit = await prisma.visit.create({
    data: {
      patientId: arjun.id,
      doctorId: dutyDoc?.id || null,
      status: 'READY_FOR_RECEPTION',
      amountDue: 5000,
      consultationFee: 500,
      treatmentFee: 4500,
      reasonForVisit: 'Root Canal Step 1'
    }
  });

  // Arjun paid ₹2000 in advance today
  await prisma.payment.create({
    data: {
      visitId: arjunVisit.id,
      patientId: arjun.id,
      amount: 2000,
      method: 'UPI',
      status: 'Completed',
      date: todayDateStr,
      notes: 'Initial advance payment via GPay'
    }
  });

  // 7. Scenario D: Completed Visit with full collection
  // Patient: Rahul Sharma
  const rahul = patientMap['Rahul Sharma'];
  const rahulVisit = await prisma.visit.create({
    data: {
      patientId: rahul.id,
      doctorId: headDoc?.id || null,
      status: 'COMPLETED',
      amountDue: 1500,
      consultationFee: 500,
      treatmentFee: 1000,
      reasonForVisit: 'Routine scaling'
    }
  });

  await prisma.payment.create({
    data: {
      visitId: rahulVisit.id,
      patientId: rahul.id,
      amount: 1500,
      method: 'Cash',
      status: 'Completed',
      date: todayDateStr,
      notes: 'Full payment received at counter'
    }
  });

  // Patient: Rohan Gupta (Completed earlier today)
  const rohan = patientMap['Rohan Gupta'];
  const rohanVisit = await prisma.visit.create({
    data: {
      patientId: rohan.id,
      doctorId: dutyDoc?.id || null,
      status: 'COMPLETED',
      amountDue: 2500,
      consultationFee: 500,
      treatmentFee: 2000,
      reasonForVisit: 'Dental X-Ray & Extraction'
    }
  });

  await prisma.payment.create({
    data: {
      visitId: rohanVisit.id,
      patientId: rohan.id,
      amount: 2500,
      method: 'Credit Card',
      status: 'Completed',
      date: todayDateStr,
      notes: 'HDFC Pos Machine Transaction'
    }
  });

  console.log('--- Successfully seeded rich, realistic clinic operations data for today! ---');
}

seedRealDashboardData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
