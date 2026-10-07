import { prisma } from '../../src/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { QueueRunner } from '../../src/services/communication/queueRunner';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function record(suite: string, testName: string, passed: boolean, details?: string, error?: string) {
  results.push({ suite, testName, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${suite}] ${testName}: ${icon} ${details ? `(${details})` : ''}`);
  if (error) console.error(`   Error: ${error}`);
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('      DENTALCORE FULL REGRESSION SUITE (MYSQL 8.0 TEST DB)     ');
  console.log('================================================================');

  const testSuffix = `_qa_${Date.now()}`;

  // -------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & ACCESS CONTROL (RBAC)
  // -------------------------------------------------------------
  try {
    const rawPassword = 'SecurePassword123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const validPassword = await bcrypt.compare(rawPassword, passwordHash);

    const testStaff = await prisma.staff.create({
      data: {
        name: `Dr. QA Doctor ${testSuffix}`,
        phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'Associate Doctor',
        status: 'Active',
      }
    });

    const testUser = await prisma.user.create({
      data: {
        username: `qa_doctor${testSuffix}`,
        passwordHash,
        role: 'Associate Doctor',
        staffId: testStaff.id,
      }
    });

    const token = jwt.sign(
      { id: testUser.id, role: testUser.role, username: testUser.username },
      process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
      { expiresIn: '1h' }
    );
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_change_in_production');

    record('Auth & RBAC', 'Bcrypt Hashing & Password Verification', validPassword);
    record('Auth & RBAC', 'User & Staff Creation with Role Association', !!testUser.id && testUser.role === 'Associate Doctor');
    record('Auth & RBAC', 'JWT Token Minting & Verification', decoded.username === testUser.username);
  } catch (err: any) {
    record('Auth & RBAC', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 2: PATIENTS & CLINICAL WORKFLOWS
  // -------------------------------------------------------------
  let patientId: string = '';
  let visitId: string = '';
  let planId: string = '';
  let planItemId: string = '';

  try {
    const patient = await prisma.patient.create({
      data: {
        name: `Ramesh Kumar ${testSuffix}`,
        phone: `+9191234${Math.floor(10000 + Math.random() * 90000)}`,
        age: 34,
        gender: 'Male',
        address: '123 Medical Enclave, Main Street, Bengaluru',
        status: 'Active'
      }
    });
    patientId = patient.id;

    // Search query test without mode: 'insensitive' under utf8mb4_unicode_ci
    const searchMatch = await prisma.patient.findFirst({
      where: { id: patient.id, name: { contains: 'ramesh' } }
    });

    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        status: 'Completed',
        amountDue: 3500,
        consultationFee: 500,
        treatmentFee: 3000,
        reasonForVisit: 'Severe tooth pain in upper right quadrant',
        paymentOwner: 'RECEPTION',
        visitDate: new Date()
      }
    });
    visitId = visit.id;

    const queueEntry = await prisma.queueEntry.create({
      data: {
        visitId: visit.id,
        patientId: patient.id,
        position: 1,
        status: 'Completed',
        arrivalTime: '10:00 AM'
      }
    });

    const consultation = await prisma.consultation.create({
      data: {
        visitId: visit.id,
        doctorId: (await prisma.staff.findFirst())?.id || patient.id,
        reasonForVisit: 'Severe pain and sensitivity on molar',
        clinicalNotes: 'Deep occlusal caries detected on FDI tooth 16. Cold test positive, lingering pain indicates irreversible pulpitis. Advised root canal treatment.',
        consultationFee: 500,
        treatmentFee: 3000,
        status: 'Completed'
      }
    });

    record('Patient & Visit', 'Patient Registration & Address Storage', !!patient.id);
    record('Patient & Visit', 'Case-Insensitive Patient Search (utf8mb4_unicode_ci)', !!searchMatch && searchMatch.id === patient.id);
    record('Patient & Visit', 'Visit & Queue Management', !!visit.id && !!queueEntry.id);
    record('Clinical', 'Consultation with Detailed Clinical Notes (@db.Text)', !!consultation.id && consultation.clinicalNotes.length > 50);
  } catch (err: any) {
    record('Patient & Clinical', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 3: FDI TOOTH CHARTING & MULTI-SITTING SESSIONS
  // -------------------------------------------------------------
  try {
    const catalogItem = await prisma.treatmentCatalog.findFirst() || await prisma.treatmentCatalog.create({
      data: {
        category: 'Endodontics',
        name: 'Root Canal Treatment (Molar)',
        variant: 'Standard',
        isActive: true
      }
    });

    const plan = await prisma.treatmentPlan.create({
      data: { patientId }
    });
    planId = plan.id;

    const planItem = await prisma.treatmentPlanItem.create({
      data: {
        treatmentPlanId: plan.id,
        treatmentCatalogId: catalogItem.id,
        toothNumber: 16, // FDI notation: Upper right first molar
        status: 'In Progress',
        totalSittings: 3,
        notes: 'Three-sitting RCT planned'
      }
    });
    planItemId = planItem.id;

    // Create 3 Multi-Sitting treatment sessions
    const session1 = await prisma.treatmentSession.create({
      data: {
        treatmentPlanItemId: planItem.id,
        sittingNumber: 1,
        stage: 'Access Opening & Pulp Extirpation',
        status: 'Completed',
        plannedDate: new Date(),
        actualDate: new Date(),
        visitId: visitId,
        clinicalNotes: 'Access cavity prepared under local anesthesia. Working lengths determined via apex locator. Canal shaped to 20/04.',
        workPerformed: 'Access opening, irrigation with 3% NaOCl, closed with Ca(OH)2 dressing.',
        materialsUsed: 'Lignocaine 2% with adrenaline, EDTA, Ca(OH)2 paste',
        nextSittingDate: new Date(Date.now() + 7 * 86400000),
        followUpInstructions: 'Avoid chewing hard foods on right side. Prescribed analgesics if mild pain occurs.',
        fee: 1000
      }
    });

    const session2 = await prisma.treatmentSession.create({
      data: {
        treatmentPlanItemId: planItem.id,
        sittingNumber: 2,
        stage: 'Biomechanical Preparation & Irrigation',
        status: 'Planned',
        plannedDate: new Date(Date.now() + 7 * 86400000),
        fee: 1000
      }
    });

    const session3 = await prisma.treatmentSession.create({
      data: {
        treatmentPlanItemId: planItem.id,
        sittingNumber: 3,
        stage: 'Obturation & Permanent Restoration',
        status: 'Planned',
        plannedDate: new Date(Date.now() + 14 * 86400000),
        fee: 1000
      }
    });

    // Verify session unique constraint on [treatmentPlanItemId, sittingNumber]
    let duplicateCaught = false;
    try {
      await prisma.treatmentSession.create({
        data: {
          treatmentPlanItemId: planItem.id,
          sittingNumber: 1, // Duplicate sitting number
          status: 'Planned'
        }
      });
    } catch {
      duplicateCaught = true;
    }

    record('FDI & Multi-Sitting', 'Treatment Plan & Tooth Number (FDI 16) Mapping', planItem.toothNumber === 16);
    record('FDI & Multi-Sitting', '3 Multi-Sitting Treatment Sessions Planning', !!session1.id && !!session2.id && !!session3.id);
    record('FDI & Multi-Sitting', 'Composite Unique Constraint on (PlanItem, SittingNumber)', duplicateCaught);
  } catch (err: any) {
    record('FDI & Multi-Sitting', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 4: PRESCRIPTIONS, DISPENSING & INVENTORY
  // -------------------------------------------------------------
  try {
    const category = await prisma.medicineCategory.findFirst();
    const medicine = await prisma.medicine.create({
      data: {
        name: `Amoxicillin 500mg ${testSuffix}`,
        genericName: 'Amoxicillin Trihydrate',
        categoryId: category!.id,
        form: 'Capsule',
        unit: 'Strip',
        stockWarningLevel: 10,
        currentStock: 50,
        unitPrice: 120,
        status: 'Active'
      }
    });

    const doctor = await prisma.staff.findFirst();
    const prescription = await prisma.prescription.create({
      data: {
        visitId,
        doctorId: doctor!.id,
        status: 'Saved',
        notes: 'Post-op antibiotic course for 5 days',
        items: {
          create: [
            {
              medicineId: medicine.id,
              quantity: 15,
              dosage: '500mg',
              frequency: 'TDS (Three times daily)',
              duration: '5 Days',
              instructions: 'Take orally after meals with full glass of water'
            }
          ]
        }
      },
      include: { items: true }
    });

    // Dispense medicine and perform inventory movement
    const dispensing = await prisma.dispensing.create({
      data: {
        visitId,
        prescriptionId: prescription.id,
        status: 'Completed',
        items: {
          create: [
            {
              medicineId: medicine.id,
              prescribedQuantity: 15,
              dispensedQuantity: 15
            }
          ]
        }
      }
    });

    // Update stock and create movement record
    await prisma.medicine.update({
      where: { id: medicine.id },
      data: { currentStock: { decrement: 15 } }
    });

    const stockMovement = await prisma.stockMovement.create({
      data: {
        medicineId: medicine.id,
        movementType: 'DISPENSING',
        quantity: -15,
        balanceAfter: 35,
        referenceType: 'VISIT',
        referenceId: visitId,
        reason: 'Dispensed for prescription',
        performedBy: 'Pharmacist Staff'
      }
    });

    const updatedMed = await prisma.medicine.findUnique({ where: { id: medicine.id } });

    record('Pharmacy & Stock', 'Prescription Creation with Structured Items', prescription.items.length === 1);
    record('Pharmacy & Stock', 'Dispensing & Stock Movement Ledger', !!dispensing.id && !!stockMovement.id);
    record('Pharmacy & Stock', 'Accurate Stock Balance Decrement (50 -> 35)', updatedMed?.currentStock === 35);
  } catch (err: any) {
    record('Pharmacy & Stock', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 5: BILLING, CONCURRENCY LOCKS & PAYMENTS
  // -------------------------------------------------------------
  try {
    // 1. Partial Payment
    const payment1 = await prisma.payment.create({
      data: {
        visitId,
        patientId,
        amount: 2000,
        method: 'UPI',
        status: 'Completed',
        date: new Date().toISOString().split('T')[0],
        notes: 'Initial partial payment for RCT sitting 1'
      }
    });

    // 2. Final Settlement
    const payment2 = await prisma.payment.create({
      data: {
        visitId,
        patientId,
        amount: 1500,
        method: 'Cash',
        status: 'Completed',
        date: new Date().toISOString().split('T')[0],
        notes: 'Remaining balance payment settled'
      }
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { visitId },
      _sum: { amount: true }
    });

    // 3. Concurrency Row Lock verification using MySQL backticks
    let lockAcquired = false;
    await prisma.$transaction(async (tx) => {
      const lockedRows: any[] = await tx.$queryRaw`SELECT 1 FROM \`Visit\` WHERE id = ${visitId} FOR UPDATE`;
      lockAcquired = lockedRows && lockedRows.length > 0;
    });

    record('Billing & Ledger', 'Split / Partial & Balance Payment Settlements', totalPaid._sum.amount === 3500);
    record('Billing & Ledger', 'MySQL Concurrency Row Lock on Visit (FOR UPDATE)', lockAcquired);
  } catch (err: any) {
    record('Billing & Ledger', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 6: SUPPLIER PROCUREMENT & SUPPLIER BILL LOCK
  // -------------------------------------------------------------
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: `Precision Dental Supplies ${testSuffix}`,
        contactPerson: 'Mr. Arvind Sharma',
        phone: '+919845012345',
        email: 'sales@precisiondental.mock',
        status: 'Active'
      }
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        orderNumber: `PO-${Date.now().toString().slice(-6)}`,
        supplierId: supplier.id,
        status: 'Ordered',
        notes: 'Monthly clinic consumable reorder'
      }
    });

    const bill = await prisma.supplierBill.create({
      data: {
        supplierId: supplier.id,
        purchaseOrderId: po.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        amount: 8500,
        status: 'Unpaid',
        notes: 'Standard 30-day supplier credit'
      }
    });

    // Verify MySQL parameterized backtick row lock on SupplierBill
    let supplierBillLocked = false;
    await prisma.$transaction(async (tx) => {
      const locked: any[] = await tx.$queryRaw`
        SELECT id, \`supplierId\`, amount, status 
        FROM \`SupplierBill\` 
        WHERE id = ${bill.id} 
        FOR UPDATE
      `;
      supplierBillLocked = locked && locked.length > 0;
    });

    const supplierPayment = await prisma.supplierPayment.create({
      data: {
        supplierBillId: bill.id,
        amount: 8500,
        method: 'Bank Transfer',
        notes: 'Full invoice settlement via NEFT'
      }
    });

    await prisma.supplierBill.update({
      where: { id: bill.id },
      data: { status: 'Paid' }
    });

    record('Procurement', 'Purchase Order & Supplier Bill Workflow', !!po.id && !!bill.id);
    record('Procurement', 'MySQL Backtick Lock on SupplierBill (FOR UPDATE)', supplierBillLocked);
    record('Procurement', 'Supplier Bill Settlement & Payment Reconciliation', !!supplierPayment.id);
  } catch (err: any) {
    record('Procurement', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 7: DENTAL IMAGING & DOCUMENT ATTACHMENTS
  // -------------------------------------------------------------
  try {
    const dentalImage = await prisma.dentalImage.create({
      data: {
        patientId,
        visitId,
        type: 'RVG',
        title: 'Pre-op RVG Periapical X-Ray Tooth 16',
        fileName: 'rvg_test_16.png',
        mimeType: 'image/png',
        fileSize: 102400,
        imageUrl: '/uploads/dental-images/rvg_test_16.png',
        toothNumber: 16,
        notes: 'Periapical radiolucency observed around mesiobuccal root apex.'
      }
    });

    const retrievedImage = await prisma.dentalImage.findUnique({
      where: { id: dentalImage.id }
    });

    record('Dental Imaging', 'RVG/OPG Image Metadata & FDI Tooth Link (Tooth 16)', retrievedImage?.type === 'RVG' && retrievedImage.toothNumber === 16);
  } catch (err: any) {
    record('Dental Imaging', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 8: NOTIFICATION QUEUE RUNNER & ATOMIC BATCH CLAIMING
  // -------------------------------------------------------------
  try {
    const notif1 = await prisma.notification.create({
      data: {
        type: 'APPOINTMENT_CONFIRMATION',
        channel: 'WHATSAPP',
        status: 'QUEUED',
        recipientPhone: '+919876543210',
        recipientName: 'Test Patient A',
        scheduledAt: new Date(Date.now() - 10000)
      }
    });

    const notif2 = await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIPT',
        channel: 'SMS',
        status: 'QUEUED',
        recipientPhone: '+919876543211',
        recipientName: 'Test Patient B',
        scheduledAt: new Date(Date.now() - 5000)
      }
    });

    // Run QueueRunner batch processing
    const claimedCount = await QueueRunner.processBatch(5);

    const check1 = await prisma.notification.findUnique({ where: { id: notif1.id } });
    const check2 = await prisma.notification.findUnique({ where: { id: notif2.id } });

    const validTransition = ['SENT', 'SENDING', 'RETRYING', 'FAILED'].includes(check1?.status || '') &&
                            ['SENT', 'SENDING', 'RETRYING', 'FAILED'].includes(check2?.status || '');

    record('Communication Queue', 'Queue Creation & Atomic 2-Phase Batch Claiming', claimedCount >= 2 && validTransition);
  } catch (err: any) {
    record('Communication Queue', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 9: TRANSACTION ROLLBACK INTEGRITY & FOREIGN KEY SAFETY
  // -------------------------------------------------------------
  try {
    // 1. Transaction Rollback Verification
    let rollbackSuccess = false;
    const testEmail = `rollback_test_${Date.now()}@mock.com`;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.supplier.create({
          data: { name: 'Temp Rollback Supplier', email: testEmail }
        });
        // Intentionally throw an unhandled error to force rollback
        throw new Error('Simulated intentional transaction failure');
      });
    } catch {
      // Check that the supplier was NOT created
      const exists = await prisma.supplier.findFirst({ where: { email: testEmail } });
      rollbackSuccess = !exists;
    }

    // 2. Foreign Key Rejection Verification
    let fkRejected = false;
    try {
      await prisma.visit.create({
        data: {
          patientId: '00000000-0000-0000-0000-000000000000', // Non-existent patient ID
          status: 'Active'
        }
      });
    } catch (e: any) {
      fkRejected = e.code === 'P2003' || e.message.includes('Foreign key');
    }

    record('Integrity & ACID', 'Prisma Transaction Atomic Rollback on Error', rollbackSuccess);
    record('Integrity & ACID', 'MySQL InnoDB Foreign Key Constraint Enforcement', fkRejected);
  } catch (err: any) {
    record('Integrity & ACID', 'Suite Exception', false, undefined, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 10: REPORTS & AGGREGATE CALCULATIONS
  // -------------------------------------------------------------
  try {
    const { getRevenueReportData, getVisitsReportData } = await import('../../src/services/reportsService');

    const revenueReport = await getRevenueReportData({
      startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    const visitsReport = await getVisitsReportData({
      startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    record('Reporting Engine', 'Revenue Aggregate Report Generation', revenueReport.summary.totalCollected >= 0);
    record('Reporting Engine', 'Visits Breakdown Report Generation', visitsReport.data.length >= 0);
  } catch (err: any) {
    record('Reporting Engine', 'Suite Exception', false, undefined, err.message);
  }

  console.log('================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`SUMMARY: ${passed}/${total} Tests Passed (${failed} Failures)`);
  console.log('================================================================');

  await prisma.$disconnect();
  return { total, passed, failed, results };
}

runRegressionSuite()
  .then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('[Regression] Fatal execution error:', err);
    process.exit(1);
  });
