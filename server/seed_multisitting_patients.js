const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// SVG Medical Radiograph Generators (rendered directly as crisp, realistic dental radiographs)
function generateOpgSvg(patientName, dateStr) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="1200" height="600" style="background:#070913; font-family: monospace;">
    <defs>
      <radialGradient id="panGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#1b2438"/>
        <stop offset="60%" stop-color="#0c101d"/>
        <stop offset="100%" stop-color="#05070e"/>
      </radialGradient>
      <linearGradient id="boneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#cbd5e1" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#64748b" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#1e293b" stop-opacity="0.3"/>
      </linearGradient>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.08 0"/>
        <feComposite in2="SourceGraphic" in="gl" operator="over"/>
      </filter>
    </defs>

    <rect width="1200" height="600" fill="url(#panGlow)"/>
    <rect width="1200" height="600" filter="url(#noise)" opacity="0.35"/>

    <!-- Grid / Diagnostic Calibration Markers -->
    <g stroke="#1e293b" stroke-width="0.8" stroke-dasharray="4 8">
      <line x1="600" y1="40" x2="600" y2="560"/>
      <line x1="100" y1="300" x2="1100" y2="300"/>
      <circle cx="600" cy="300" r="180" fill="none"/>
      <circle cx="600" cy="300" r="280" fill="none"/>
    </g>

    <!-- Mandibular Bone Contour -->
    <path d="M 220 180 Q 240 460, 600 480 Q 960 460, 980 180 Q 940 430, 600 450 Q 260 430, 220 180 Z" fill="url(#boneGrad)" opacity="0.6"/>

    <!-- Maxillary Arch & Sinuses -->
    <path d="M 260 180 Q 600 240, 940 180 Q 600 210, 260 180 Z" fill="url(#boneGrad)" opacity="0.5"/>
    <ellipse cx="440" cy="220" rx="90" ry="40" fill="#05070e" opacity="0.75" stroke="#334155" stroke-width="1"/>
    <ellipse cx="760" cy="220" rx="90" ry="40" fill="#05070e" opacity="0.75" stroke="#334155" stroke-width="1"/>

    <!-- Upper Dentition (Tooth Arches) -->
    <g fill="#e2e8f0" opacity="0.85">
      <!-- Upper Right Molars to Centrals -->
      <rect x="300" y="210" width="22" height="42" rx="4"/>
      <rect x="330" y="212" width="22" height="40" rx="4"/>
      <rect x="360" y="214" width="20" height="38" rx="4"/>
      <rect x="388" y="218" width="18" height="36" rx="4"/>
      <rect x="414" y="222" width="18" height="36" rx="4"/>
      <rect x="440" y="226" width="16" height="38" rx="3"/>
      <rect x="464" y="230" width="16" height="38" rx="3"/>
      <rect x="488" y="234" width="18" height="40" rx="3"/>
      <rect x="514" y="236" width="18" height="42" rx="3"/>
      <rect x="540" y="238" width="18" height="44" rx="3"/>
      <rect x="566" y="239" width="18" height="45" rx="3"/>
      <!-- Midline -->
      <rect x="616" y="239" width="18" height="45" rx="3"/>
      <rect x="642" y="238" width="18" height="44" rx="3"/>
      <rect x="668" y="236" width="18" height="42" rx="3"/>
      <rect x="694" y="234" width="18" height="40" rx="3"/>
      <rect x="720" y="230" width="16" height="38" rx="3"/>
      <rect x="744" y="226" width="16" height="38" rx="3"/>
      <rect x="768" y="222" width="18" height="36" rx="4"/>
      <rect x="794" y="218" width="18" height="36" rx="4"/>
      <rect x="820" y="214" width="20" height="38" rx="4"/>
      <rect x="848" y="212" width="22" height="40" rx="4"/>
      <rect x="878" y="210" width="22" height="42" rx="4"/>
    </g>

    <!-- Lower Dentition -->
    <g fill="#cbd5e1" opacity="0.8">
      <rect x="310" y="320" width="22" height="44" rx="4"/>
      <rect x="340" y="318" width="22" height="42" rx="4"/>
      <rect x="370" y="316" width="20" height="40" rx="4"/>
      <rect x="398" y="314" width="18" height="38" rx="4"/>
      <rect x="424" y="312" width="18" height="36" rx="4"/>
      <rect x="450" y="308" width="16" height="36" rx="3"/>
      <rect x="474" y="304" width="16" height="36" rx="3"/>
      <rect x="498" y="300" width="16" height="36" rx="3"/>
      <rect x="522" y="298" width="16" height="38" rx="3"/>
      <rect x="546" y="296" width="16" height="38" rx="3"/>
      <rect x="570" y="295" width="16" height="39" rx="3"/>
      <!-- Midline -->
      <rect x="614" y="295" width="16" height="39" rx="3"/>
      <rect x="638" y="296" width="16" height="38" rx="3"/>
      <rect x="662" y="298" width="16" height="38" rx="3"/>
      <rect x="686" y="300" width="16" height="36" rx="3"/>
      <rect x="710" y="304" width="16" height="36" rx="3"/>
      <rect x="734" y="308" width="16" height="36" rx="3"/>
      <rect x="758" y="312" width="18" height="36" rx="4"/>
      <rect x="784" y="314" width="18" height="38" rx="4"/>
      <rect x="810" y="316" width="20" height="40" rx="4"/>
      <rect x="838" y="318" width="22" height="42" rx="4"/>
      <rect x="868" y="320" width="22" height="44" rx="4"/>
    </g>

    <!-- Lesion Highlight on Tooth 16 (Upper Right First Molar) -->
    <circle cx="360" cy="235" r="10" fill="#0f172a" opacity="0.85" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 3"/>

    <!-- Clinical HUD & Metadata Overlay -->
    <g fill="#94a3b8" font-size="13">
      <text x="30" y="38" font-weight="bold" fill="#f8fafc">RAFI DENTAL CLINIC • DIGITAL RADIOLOGY SYSTEM</text>
      <text x="30" y="58">MODALITY: OPG (Orthopantomogram) | Sirona Orthophos SL</text>
      <text x="30" y="78">PATIENT: ${patientName.toUpperCase()} | DATE: ${dateStr}</text>
      <text x="30" y="98">EXPOSURE: 69 kVp • 12 mA • 14.1 s • DAP: 114 mGy.cm²</text>
      
      <text x="1170" y="38" text-anchor="end" font-weight="bold" fill="#38bdf8">R (RIGHT)</text>
      <text x="30" y="560" font-weight="bold" fill="#38bdf8">L (LEFT)</text>
      <text x="1170" y="560" text-anchor="end" font-size="11" fill="#64748b">DIAGNOSTIC HIGH-RES CAPTURE</text>
    </g>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function generateRvgSvg(patientName, toothNum, toothName, stageStr, dateStr) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750" style="background:#05070f; font-family: monospace;">
    <defs>
      <radialGradient id="sensorGlow" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#1e283d"/>
        <stop offset="50%" stop-color="#0f1422"/>
        <stop offset="100%" stop-color="#04060c"/>
      </radialGradient>
      <linearGradient id="enamelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="#94a3b8" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#475569" stop-opacity="0.6"/>
      </linearGradient>
    </defs>

    <rect width="600" height="750" fill="url(#sensorGlow)"/>

    <!-- Sensor Active Area Border -->
    <rect x="25" y="25" width="550" height="700" rx="18" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="6 4"/>

    <!-- Bone Trabeculae Background Texture -->
    <g opacity="0.25" stroke="#64748b" stroke-width="0.5">
      <circle cx="280" cy="220" r="140" fill="none" stroke-dasharray="2 6"/>
      <circle cx="320" cy="420" r="180" fill="none" stroke-dasharray="3 8"/>
    </g>

    <!-- Adjacent Tooth (Faint) -->
    <path d="M 80 200 C 120 180, 160 190, 180 250 C 190 320, 160 480, 140 540 C 130 500, 100 360, 80 200 Z" fill="#475569" opacity="0.45"/>

    <!-- Primary Target Tooth Anatomy -->
    <!-- Crown -->
    <path d="M 220 220 C 240 130, 360 130, 380 220 C 395 290, 390 350, 375 380 C 340 375, 260 375, 225 380 C 210 350, 205 290, 220 220 Z" fill="url(#enamelGrad)"/>

    <!-- Roots (Mesial, Distal, Palatal for Maxillary Molar) -->
    <path d="M 225 380 C 230 450, 210 580, 240 640 C 260 610, 280 480, 290 380 Z" fill="#64748b" opacity="0.85"/>
    <path d="M 310 380 C 320 480, 340 610, 360 640 C 390 580, 370 450, 375 380 Z" fill="#64748b" opacity="0.85"/>

    <!-- Pulp Chamber & Root Canals (Radiolucent dark) -->
    <path d="M 270 240 Q 300 235, 330 240 Q 325 320, 320 380 L 335 620 L 328 620 L 305 380 L 295 380 L 255 620 L 248 620 L 275 380 Z" fill="#04060c" opacity="0.9"/>

    <!-- Endodontic File / Radiopaque Marker Indicator -->
    <line x1="298" y1="180" x2="252" y2="620" stroke="#f8fafc" stroke-width="2.5"/>
    <line x1="302" y1="180" x2="332" y2="620" stroke="#f8fafc" stroke-width="2.5"/>

    <!-- Apex Indicator & Measurement Marks -->
    <circle cx="252" cy="620" r="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="332" cy="620" r="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
    <line x1="220" y1="620" x2="365" y2="620" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="375" y="624" font-size="11" fill="#38bdf8">APEX 0.0 mm</text>

    <!-- Diagnostics HUD -->
    <g fill="#94a3b8" font-size="12">
      <rect x="40" y="40" width="520" height="85" rx="8" fill="#070a14" opacity="0.85" stroke="#1e293b"/>
      <text x="55" y="62" font-weight="bold" fill="#38bdf8">SIRONA XIOS XG SUPREME • DIGITAL RVG</text>
      <text x="55" y="80">PATIENT: ${patientName.toUpperCase()} | FDI TOOTH: #${toothNum} (${toothName})</text>
      <text x="55" y="98">PROCEDURE: ${stageStr}</text>
      <text x="55" y="114" fill="#64748b">DATE: ${dateStr} • 60 kVp • 7 mA • 0.08s exposure</text>
    </g>

    <text x="55" y="705" font-size="11" fill="#475569">SENSOR SIZE 2 • 33.3 lp/mm OPTICAL RESOLUTION</text>
    <text x="545" y="705" text-anchor="end" font-size="11" font-weight="bold" fill="#22c55e">CALIBRATED</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function seedMultiSittingPatients() {
  console.log('--- STARTING MULTI-SITTING PATIENT SEEDING ---');

  // 1. Identify staff and catalogs
  const staff = await prisma.staff.findMany();
  const headDoctor = staff.find(s => s.role === 'Head Doctor') || staff[0];
  const dutyDoctor = staff.find(s => s.role === 'Duty Doctor') || staff[0];

  console.log(`Using Head Doctor: ${headDoctor.name} (${headDoctor.id})`);
  console.log(`Using Duty Doctor: ${dutyDoctor.name} (${dutyDoctor.id})`);

  const rctCatalog = await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Root Canal' } }
  });
  const crownCatalog = await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Ceramic' } }
  }) || await prisma.treatmentCatalog.findFirst({
    where: { name: { contains: 'Zirconia' } }
  });

  if (!rctCatalog || !crownCatalog) {
    console.error('Missing required treatment catalog items for RCT or Crown!');
    process.exit(1);
  }

  const amox = await prisma.medicine.findFirst({ where: { name: { contains: 'STOLIN' } } }) || await prisma.medicine.findFirst();
  const gel = await prisma.medicine.findFirst({ where: { name: { contains: 'CURENEXT' } } }) || await prisma.medicine.findFirst();

  // Helper date constants
  const dateToday = new Date('2026-10-06T10:30:00Z');
  const dateVisitOct3 = new Date('2026-10-03T11:00:00Z');
  const dateVisitSep24 = new Date('2026-09-24T09:30:00Z');
  const dateVisitOct1 = new Date('2026-10-01T15:00:00Z');

  // =========================================================================
  // PATIENT 1: Ananya Sharma (3-Sitting RCT: Sitting 1 completed Oct 3, Sitting 2 TODAY)
  // =========================================================================
  console.log('\n--- Seeding Patient 1: Ananya Sharma (RCT: Sitting 1 completed, Sitting 2 TODAY) ---');
  const phoneP1 = '9845120001';

  // Clean previous records for clean re-runnability
  const existingP1 = await prisma.patient.findUnique({ where: { phone: phoneP1 } });
  if (existingP1) {
    console.log('Cleaning existing records for Patient 1...');
    await prisma.queueEntry.deleteMany({ where: { patientId: existingP1.id } });
    await prisma.payment.deleteMany({ where: { patientId: existingP1.id } });
    await prisma.dispensingItem.deleteMany({ where: { dispensing: { visit: { patientId: existingP1.id } } } });
    await prisma.dispensing.deleteMany({ where: { visit: { patientId: existingP1.id } } });
    await prisma.prescriptionItem.deleteMany({ where: { prescription: { visit: { patientId: existingP1.id } } } });
    await prisma.prescription.deleteMany({ where: { visit: { patientId: existingP1.id } } });
    await prisma.consultation.deleteMany({ where: { visit: { patientId: existingP1.id } } });
    await prisma.treatmentSession.deleteMany({ where: { treatmentPlanItem: { treatmentPlan: { patientId: existingP1.id } } } });
    await prisma.treatmentPlanItem.deleteMany({ where: { treatmentPlan: { patientId: existingP1.id } } });
    await prisma.treatmentPlan.deleteMany({ where: { patientId: existingP1.id } });
    await prisma.dentalImage.deleteMany({ where: { patientId: existingP1.id } });
    await prisma.visit.deleteMany({ where: { patientId: existingP1.id } });
    await prisma.patient.delete({ where: { id: existingP1.id } });
  }

  const patient1 = await prisma.patient.create({
    data: {
      name: 'Ananya Sharma',
      phone: phoneP1,
      age: 29,
      gender: 'Female',
      status: 'Active',
      address: 'Plot 42, Green Glen Layout, Bellandur, Bangalore',
      createdAt: dateVisitOct3,
      updatedAt: dateToday
    }
  });

  // Create Treatment Plan for Ananya Sharma
  const plan1 = await prisma.treatmentPlan.create({
    data: { patientId: patient1.id }
  });

  const planItem1 = await prisma.treatmentPlanItem.create({
    data: {
      treatmentPlanId: plan1.id,
      treatmentCatalogId: rctCatalog.id,
      toothNumber: 16,
      status: 'In Progress',
      totalSittings: 3,
      notes: 'Deep caries in Tooth 16 with irreversible pulpitis. Planned for 3-sitting Root Canal Therapy followed by Crown.',
      createdAt: dateVisitOct3,
      updatedAt: dateToday
    }
  });

  // Create Historical Visit 1 (Completed 3 days ago - 03 Oct 2026)
  const visit1P1 = await prisma.visit.create({
    data: {
      patientId: patient1.id,
      doctorId: headDoctor.id,
      status: 'COMPLETED',
      reasonForVisit: 'Severe throbbing toothache in Upper Right Tooth 16',
      consultationFee: 500,
      treatmentFee: 1500,
      medicineCost: 250,
      amountDue: 2250,
      createdAt: dateVisitOct3,
      updatedAt: dateVisitOct3,
      consultation: {
        create: {
          doctorId: headDoctor.id,
          reasonForVisit: 'Severe throbbing toothache in Upper Right Tooth 16',
          clinicalNotes: 'Acute irreversible pulpitis in Tooth 16. Deep occlusal caries with pulpal involvement. Commenced 3-sitting Root Canal Treatment. Sitting 1 completed today under 2% Lignocaine local anesthesia. Canal exploration, pulpal extirpation, and initial BMP done. Cavit temporary dressing placed. Advised soft diet.',
          consultationFee: 500,
          treatmentFee: 1500,
          status: 'Completed',
          createdAt: dateVisitOct3,
          updatedAt: dateVisitOct3
        }
      },
      prescription: {
        create: {
          doctorId: headDoctor.id,
          notes: 'Take medicine after meals. Report if pain persists or swelling develops.',
          status: 'Finalized',
          createdAt: dateVisitOct3,
          updatedAt: dateVisitOct3,
          items: {
            create: [
              {
                medicineId: amox.id,
                quantity: 1,
                dosage: 'Apply twice daily',
                frequency: 'Twice daily',
                duration: '5 days',
                instructions: 'Apply gently along buccal mucosa',
                createdAt: dateVisitOct3,
                updatedAt: dateVisitOct3
              }
            ]
          }
        }
      },
      payments: {
        create: [
          {
            patientId: patient1.id,
            amount: 2250,
            method: 'GPay',
            status: 'Completed',
            notes: 'UPI payment received for Consultation & Sitting 1',
            date: '2026-10-03',
            createdAt: dateVisitOct3,
            updatedAt: dateVisitOct3
          }
        ]
      }
    },
    include: { prescription: true }
  });

  // Create Pharmacy Dispensing for Visit 1
  await prisma.dispensing.create({
    data: {
      visitId: visit1P1.id,
      prescriptionId: visit1P1.prescription.id,
      status: 'Completed',
      createdAt: dateVisitOct3,
      updatedAt: dateVisitOct3,
      items: {
        create: [
          {
            medicineId: amox.id,
            prescribedQuantity: 1,
            dispensedQuantity: 1,
            createdAt: dateVisitOct3,
            updatedAt: dateVisitOct3
          }
        ]
      }
    }
  });

  // Attach Sittings to Plan Item 1:
  // Sitting 1 (Completed on Oct 3 in Visit 1)
  const session1P1 = await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem1.id,
      sittingNumber: 1,
      stage: 'Sitting 1: Access Cavity & BMP',
      status: 'Completed',
      plannedDate: dateVisitOct3,
      actualDate: dateVisitOct3,
      visitId: visit1P1.id,
      doctorId: headDoctor.id,
      workPerformed: 'Access opening under 2% Lignocaine. Pulpal extirpation done. Working length established: MB-21mm, DB-20mm, Palatal-22mm. BMP done up to 20K file with 2.5% NaOCl irrigation. Temporary Cavit dressing placed.',
      materialsUsed: '2% Lignocaine with Adrenaline, 2.5% NaOCl, 17% EDTA gel, Cavit temp dressing',
      fee: 1500,
      nextSittingDate: new Date('2026-10-06T10:00:00Z'),
      followUpInstructions: 'Avoid chewing on right side. Come for 2nd sitting on Oct 6.',
      createdAt: dateVisitOct3,
      updatedAt: dateVisitOct3
    }
  });

  // Sitting 2 (PLANNED FOR TODAY - Oct 6, 2026)
  const session2P1 = await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem1.id,
      sittingNumber: 2,
      stage: 'Sitting 2: Cleaning, Shaping & Master Cone Fit',
      status: 'Planned',
      plannedDate: dateToday,
      doctorId: headDoctor.id,
      fee: 1500,
      nextSittingDate: new Date('2026-10-10T11:00:00Z'),
      createdAt: dateVisitOct3,
      updatedAt: dateToday
    }
  });

  // Sitting 3 (PLANNED)
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem1.id,
      sittingNumber: 3,
      stage: 'Sitting 3: Obturation & Permanent Restoration',
      status: 'Planned',
      plannedDate: new Date('2026-10-10T11:00:00Z'),
      doctorId: headDoctor.id,
      fee: 1500,
      createdAt: dateVisitOct3,
      updatedAt: dateToday
    }
  });

  // Seed Radiographs for Ananya Sharma (OPG & RVG)
  const opgDataP1 = generateOpgSvg('Ananya Sharma', '03-OCT-2026');
  const rvgDataP1 = generateRvgSvg('Ananya Sharma', 16, 'Upper Right First Molar', 'Working Length BMP Check', '03-OCT-2026');

  await prisma.dentalImage.create({
    data: {
      patientId: patient1.id,
      visitId: visit1P1.id,
      type: 'OPG',
      title: 'Pre-op Full Mouth Panoramic Tomograph',
      fileName: 'OPG_Ananya_Sharma_20261003.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1845200,
      imageUrl: opgDataP1,
      notes: 'Panoramic evaluation showing periapical rarefaction around Tooth 16 apex and bone levels.',
      uploadedById: headDoctor.id,
      createdAt: dateVisitOct3,
      updatedAt: dateVisitOct3
    }
  });

  await prisma.dentalImage.create({
    data: {
      patientId: patient1.id,
      visitId: visit1P1.id,
      toothNumber: 16,
      type: 'RVG',
      title: 'Tooth 16 Working Length Determination',
      fileName: 'RVG_Tooth16_WL_20261003.jpg',
      mimeType: 'image/jpeg',
      fileSize: 420100,
      imageUrl: rvgDataP1,
      notes: 'Electronic apex locator verification corroborated with intraoral periapical radiograph. Apical patency confirmed.',
      uploadedById: headDoctor.id,
      createdAt: dateVisitOct3,
      updatedAt: dateVisitOct3
    }
  });

  // Create TODAY's Visit (Visit 2 - Sitting 2 in Waiting status for Doctor)
  const visitTodayP1 = await prisma.visit.create({
    data: {
      patientId: patient1.id,
      doctorId: headDoctor.id,
      status: 'WAITING',
      reasonForVisit: 'Root Canal Treatment - Sitting 2 (Cleaning & Shaping)',
      consultationFee: 0,
      treatmentFee: 0,
      amountDue: 0,
      createdAt: dateToday,
      updatedAt: dateToday
    }
  });

  // Add Queue Entry for Today
  await prisma.queueEntry.create({
    data: {
      visitId: visitTodayP1.id,
      patientId: patient1.id,
      assignedDoctorId: headDoctor.id,
      position: 1,
      status: 'Waiting',
      priority: true,
      arrivalTime: '10:15 AM',
      createdAt: dateToday,
      updatedAt: dateToday
    }
  });

  console.log(`✓ Patient 1 (Ananya Sharma) created with completed Visit 1 (Oct 3) and ACTIVE/WAITING Visit 2 (Today)!`);

  // =========================================================================
  // PATIENT 2: Vikramaditya Rao (3-Sitting Crown: Sittings 1 & 2 completed, Sitting 3 TODAY)
  // =========================================================================
  console.log('\n--- Seeding Patient 2: Vikramaditya Rao (Crown: Sittings 1 & 2 completed, Sitting 3 TODAY) ---');
  const phoneP2 = '9845120002';

  const existingP2 = await prisma.patient.findUnique({ where: { phone: phoneP2 } });
  if (existingP2) {
    console.log('Cleaning existing records for Patient 2...');
    await prisma.queueEntry.deleteMany({ where: { patientId: existingP2.id } });
    await prisma.payment.deleteMany({ where: { patientId: existingP2.id } });
    await prisma.dispensingItem.deleteMany({ where: { dispensing: { visit: { patientId: existingP2.id } } } });
    await prisma.dispensing.deleteMany({ where: { visit: { patientId: existingP2.id } } });
    await prisma.prescriptionItem.deleteMany({ where: { prescription: { visit: { patientId: existingP2.id } } } });
    await prisma.prescription.deleteMany({ where: { visit: { patientId: existingP2.id } } });
    await prisma.consultation.deleteMany({ where: { visit: { patientId: existingP2.id } } });
    await prisma.treatmentSession.deleteMany({ where: { treatmentPlanItem: { treatmentPlan: { patientId: existingP2.id } } } });
    await prisma.treatmentPlanItem.deleteMany({ where: { treatmentPlan: { patientId: existingP2.id } } });
    await prisma.treatmentPlan.deleteMany({ where: { patientId: existingP2.id } });
    await prisma.dentalImage.deleteMany({ where: { patientId: existingP2.id } });
    await prisma.visit.deleteMany({ where: { patientId: existingP2.id } });
    await prisma.patient.delete({ where: { id: existingP2.id } });
  }

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Vikramaditya Rao',
      phone: phoneP2,
      age: 44,
      gender: 'Male',
      status: 'Active',
      address: 'House #18, 4th Main, Indiranagar, Bangalore',
      createdAt: dateVisitSep24,
      updatedAt: dateToday
    }
  });

  const plan2 = await prisma.treatmentPlan.create({
    data: { patientId: patient2.id }
  });

  const planItem2 = await prisma.treatmentPlanItem.create({
    data: {
      treatmentPlanId: plan2.id,
      treatmentCatalogId: crownCatalog.id,
      toothNumber: 26,
      status: 'In Progress',
      totalSittings: 3,
      notes: 'Full Ceramic Crown for endodontically treated Tooth 26. 3-sitting prosthodontic workflow.',
      createdAt: dateVisitSep24,
      updatedAt: dateToday
    }
  });

  // Historical Visit 1 for Patient 2: (24 Sep 2026 - Sitting 1: Crown Prep)
  const visit1P2 = await prisma.visit.create({
    data: {
      patientId: patient2.id,
      doctorId: headDoctor.id,
      status: 'COMPLETED',
      reasonForVisit: 'Crown Preparation & Tooth Reduction - Tooth 26',
      consultationFee: 500,
      treatmentFee: 3000,
      amountDue: 3500,
      createdAt: dateVisitSep24,
      updatedAt: dateVisitSep24,
      consultation: {
        create: {
          doctorId: headDoctor.id,
          reasonForVisit: 'Crown Preparation & Tooth Reduction - Tooth 26',
          clinicalNotes: 'Endodontically treated Tooth 26 evaluated. Sound core build-up confirmed. Executed full ceramic crown preparation with 1.5mm occlusal reduction and 1.0mm circumferential radial shoulder finish line. Placed Ultrapak #00 gingival retraction cord. Fabricated and cemented acrylic provisional crown.',
          consultationFee: 500,
          treatmentFee: 3000,
          status: 'Completed',
          createdAt: dateVisitSep24,
          updatedAt: dateVisitSep24
        }
      },
      payments: {
        create: [
          {
            patientId: patient2.id,
            amount: 3500,
            method: 'Credit Card',
            status: 'Completed',
            notes: 'Card payment at front desk',
            date: '2026-09-24',
            createdAt: dateVisitSep24,
            updatedAt: dateVisitSep24
          }
        ]
      }
    }
  });

  // Sitting 1 Session
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem2.id,
      sittingNumber: 1,
      stage: 'Sitting 1: Tooth Preparation & Gingival Retraction',
      status: 'Completed',
      plannedDate: dateVisitSep24,
      actualDate: dateVisitSep24,
      visitId: visit1P2.id,
      doctorId: headDoctor.id,
      workPerformed: 'Full ceramic crown preparation on Tooth 26 with 1.5mm occlusal clearance and 1.0mm radial shoulder margin. Gingival retraction cord #00 placed.',
      materialsUsed: 'Diamond preparation burs, Gingival retraction cord, Temp bond, Protemp interim crown',
      fee: 3000,
      nextSittingDate: new Date('2026-10-01T10:30:00Z'),
      followUpInstructions: 'Avoid sticky foods on left side. Return on Oct 1 for final impression.',
      createdAt: dateVisitSep24,
      updatedAt: dateVisitSep24
    }
  });

  // RVG Scan for Visit 1 (Prep check)
  const rvgDataP2V1 = generateRvgSvg('Vikramaditya Rao', 26, 'Upper Left First Molar', 'Crown Preparation Margin Check', '24-SEP-2026');
  await prisma.dentalImage.create({
    data: {
      patientId: patient2.id,
      visitId: visit1P2.id,
      toothNumber: 26,
      type: 'RVG',
      title: 'Tooth 26 Crown Margin Fit Verification',
      fileName: 'RVG_Tooth26_Prep_20260924.jpg',
      mimeType: 'image/jpeg',
      fileSize: 395400,
      imageUrl: rvgDataP2V1,
      notes: 'Radial shoulder finish line verified supragingivally. No undercuts observed.',
      uploadedById: headDoctor.id,
      createdAt: dateVisitSep24,
      updatedAt: dateVisitSep24
    }
  });

  // Historical Visit 2 for Patient 2: (01 Oct 2026 - Sitting 2: Final Impression)
  const visit2P2 = await prisma.visit.create({
    data: {
      patientId: patient2.id,
      doctorId: headDoctor.id,
      status: 'COMPLETED',
      reasonForVisit: 'Elastomeric Impression & Shade Matching - Sitting 2',
      consultationFee: 0,
      treatmentFee: 3000,
      amountDue: 3000,
      createdAt: dateVisitOct1,
      updatedAt: dateVisitOct1,
      consultation: {
        create: {
          doctorId: headDoctor.id,
          reasonForVisit: 'Elastomeric Impression & Shade Matching - Sitting 2',
          clinicalNotes: 'Removed provisional crown. Tissue healing around sulcus satisfactory. Dual-mix addition silicone (putty and light body) impression taken of maxillary arch. Alginate impression of opposing arch taken. Interocclusal bite registration recorded. Shade VITA 3D Master 2M2 selected with patient consent. Dispatched to dental laboratory for crown milling.',
          consultationFee: 0,
          treatmentFee: 3000,
          consultationWaiverReason: 'Follow-up sitting session — Consultation fee waived',
          status: 'Completed',
          createdAt: dateVisitOct1,
          updatedAt: dateVisitOct1
        }
      },
      payments: {
        create: [
          {
            patientId: patient2.id,
            amount: 3000,
            method: 'Cash',
            status: 'Completed',
            notes: 'Cash payment for lab impression and fabrication',
            date: '2026-10-01',
            createdAt: dateVisitOct1,
            updatedAt: dateVisitOct1
          }
        ]
      }
    }
  });

  // Sitting 2 Session
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem2.id,
      sittingNumber: 2,
      stage: 'Sitting 2: Final Impression & Lab Dispatch',
      status: 'Completed',
      plannedDate: dateVisitOct1,
      actualDate: dateVisitOct1,
      visitId: visit2P2.id,
      doctorId: headDoctor.id,
      workPerformed: 'Putty-wash elastomeric impression taken for maxilla and opposing arch bite registration. Shade A2 selected. Sent to dental lab.',
      materialsUsed: 'Addition silicone (PVS Putty & Light body), Alginate, Bite registration wax',
      fee: 3000,
      nextSittingDate: new Date('2026-10-06T10:30:00Z'),
      followUpInstructions: 'Return on Oct 6 for final crown trial and cementation.',
      createdAt: dateVisitOct1,
      updatedAt: dateVisitOct1
    }
  });

  // Sitting 3 Session (PLANNED FOR TODAY - Oct 6, 2026)
  await prisma.treatmentSession.create({
    data: {
      treatmentPlanItemId: planItem2.id,
      sittingNumber: 3,
      stage: 'Sitting 3: Crown Trial & Final Cementation',
      status: 'Planned',
      plannedDate: dateToday,
      doctorId: headDoctor.id,
      fee: 2500,
      createdAt: dateVisitOct1,
      updatedAt: dateToday
    }
  });

  // OPG Scan for Patient 2
  const opgDataP2 = generateOpgSvg('Vikramaditya Rao', '24-SEP-2026');
  await prisma.dentalImage.create({
    data: {
      patientId: patient2.id,
      visitId: visit1P2.id,
      type: 'OPG',
      title: 'Baseline Panoramic Radiograph',
      fileName: 'OPG_Vikramaditya_Rao_20260924.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1910400,
      imageUrl: opgDataP2,
      notes: 'Full mouth panoramic baseline before prosthodontic rehabilitation.',
      uploadedById: headDoctor.id,
      createdAt: dateVisitSep24,
      updatedAt: dateVisitSep24
    }
  });

  // Create TODAY's Visit (Visit 3 - Sitting 3 in Waiting status for Doctor)
  const visitTodayP2 = await prisma.visit.create({
    data: {
      patientId: patient2.id,
      doctorId: headDoctor.id,
      status: 'WAITING',
      reasonForVisit: 'Full Ceramic Crown - Sitting 3 (Crown Cementation & Occlusion)',
      consultationFee: 0,
      treatmentFee: 0,
      amountDue: 0,
      createdAt: dateToday,
      updatedAt: dateToday
    }
  });

  // Add Queue Entry for Today
  await prisma.queueEntry.create({
    data: {
      visitId: visitTodayP2.id,
      patientId: patient2.id,
      assignedDoctorId: headDoctor.id,
      position: 2,
      status: 'Waiting',
      priority: false,
      arrivalTime: '11:15 AM',
      createdAt: dateToday,
      updatedAt: dateToday
    }
  });

  console.log(`✓ Patient 2 (Vikramaditya Rao) created with 2 completed Visits (Sep 24 & Oct 1) and ACTIVE/WAITING Visit 3 (Today)!`);

  console.log('\n======================================================');
  console.log('✓ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Patient 1: Ananya Sharma (+91 98451 20001)');
  console.log('  - Visit 1 (03 Oct 2026): COMPLETED (Sitting 1 RCT, OPG, RVG, Paid)');
  console.log('  - Visit 2 (06 Oct 2026 - Today): WAITING in Queue for Sitting 2!');
  console.log('Patient 2: Vikramaditya Rao (+91 98451 20002)');
  console.log('  - Visit 1 (24 Sep 2026): COMPLETED (Sitting 1 Crown Prep, RVG, OPG, Paid)');
  console.log('  - Visit 2 (01 Oct 2026): COMPLETED (Sitting 2 Impression, Fee Waiver, Paid)');
  console.log('  - Visit 3 (06 Oct 2026 - Today): WAITING in Queue for Sitting 3!');
  console.log('======================================================\n');
}

seedMultiSittingPatients()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
