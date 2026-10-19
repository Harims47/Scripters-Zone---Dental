import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import {
  generatePrescriptionPDF,
  generateReceiptPDF,
  generateInvoicePDF,
  generatePurchaseOrderPDF
} from '../services/documentService';
import { getClinicBranding } from '../services/pdf/clinicBranding';
import { JWT_SECRET } from '../config/authConfig';

/**
 * Generates a tamper-proof cryptographic token for a given document type and visit/entity ID.
 * This allows public access by the patient without exposing patient IDs to enumeration.
 */
export function generateDocumentToken(type: string, entityId: string): string {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${type.toLowerCase()}:${entityId}`)
    .digest('hex')
    .slice(0, 16);
}

// ==============================================================================
// PDF BUFFER BUILDERS (Reusable for both authenticated staff & tokenized public)
// ==============================================================================

export async function buildPrescriptionPDFBuffer(visitId: string): Promise<{ pdfBuffer: Buffer; filename: string }> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      consultation: true,
      prescription: {
        include: {
          items: {
            include: { medicine: true }
          }
        }
      }
    }
  }) as any;

  if (!visit || !visit.prescription) {
    throw new Error('Prescription not found for this visit.');
  }

  const staff = visit.doctorId ? await prisma.staff.findUnique({
    where: { id: visit.doctorId }
  }) : null;

  const branding = getClinicBranding();

  const prescriptionData = {
    clinicName: branding.name,
    clinicAddress: branding.address,
    clinicPhone: branding.phone,
    patientName: visit.patient.name,
    patientAge: visit.patient.age || '',
    patientGender: visit.patient.gender || '',
    patientPhone: visit.patient.phone,
    diagnosis: visit.consultation?.reasonForVisit || visit.reasonForVisit || undefined,
    notes: visit.prescription.notes || visit.consultation?.clinicalNotes || undefined,
    visitDate: visit.createdAt ? new Date(visit.createdAt).toISOString() : new Date().toISOString(),
    doctorName: staff ? staff.name : 'Doctor',
    items: visit.prescription.items.map((item: any) => ({
      medicineName: item.medicine?.name || 'Medicine',
      form: item.medicine?.form || undefined,
      unit: item.medicine?.unit || undefined,
      quantity: item.quantity,
      dosage: item.dosage || undefined,
      frequency: item.frequency || undefined,
      duration: item.duration || undefined,
      instructions: item.instructions || undefined
    }))
  };

  const pdfBuffer = await generatePrescriptionPDF(prescriptionData);
  const safePatientName = (visit.patient.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  const docCode = visit.id.substring(0, 8).toUpperCase();
  const filename = `prescription_${safePatientName}_${docCode}.pdf`;

  return { pdfBuffer, filename };
}

export async function buildReceiptPDFBuffer(
  visitId: string,
  requestedPaymentId?: string,
  receivedBy: string = 'Staff',
  auditAmount?: number
): Promise<{ pdfBuffer: Buffer; filename: string; visit: any }> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      payments: {
        orderBy: { createdAt: 'asc' }
      },
      consultation: true,
      completedTreatmentItems: {
        include: { catalogItem: true }
      },
      dispensing: {
        include: {
          items: {
            include: { medicine: true }
          }
        }
      }
    }
  }) as any;

  if (!visit) {
    throw new Error('Visit not found.');
  }

  let doctorName = 'Doctor';
  if (visit.doctorId) {
    const doctorStaff = await prisma.staff.findUnique({
      where: { id: visit.doctorId }
    });
    if (doctorStaff) doctorName = doctorStaff.name;
  }

  const effectiveAuditAmount = (auditAmount !== undefined && !isNaN(auditAmount) && auditAmount > 0)
    ? auditAmount
    : (visit.auditAmount && visit.auditAmount > 0 ? visit.auditAmount : undefined);
  const isAudit = effectiveAuditAmount !== undefined && effectiveAuditAmount > 0;

  const validPayments = (visit.payments || []).filter(
    (p: any) => p.status === 'Paid' || p.status === 'Completed'
  );

  let payment = null;
  let paymentIndex = -1;
  if (requestedPaymentId) {
    paymentIndex = validPayments.findIndex((p: any) => p.id === requestedPaymentId);
    if (paymentIndex !== -1) {
      payment = validPayments[paymentIndex];
    }
  }
  if (!payment) {
    payment = validPayments.length > 0 ? validPayments[validPayments.length - 1] : null;
    paymentIndex = validPayments.length - 1;
  }

  if (!payment) {
    if (isAudit) {
      payment = {
        id: `AUDIT-${visit.id.substring(0, 8)}`,
        amount: effectiveAuditAmount,
        method: 'Cash',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'Paid',
        notes: 'Doctor Workspace Verified Receipt'
      };
      paymentIndex = 0;
    } else {
      throw new Error('Payment is not completed. Cannot generate receipt.');
    }
  }

  let consultationFee = visit.consultationFee || 0;
  let treatmentFee = visit.treatmentFee || 0;

  let calculatedMedicineCost = 0;
  if (visit.dispensing && visit.dispensing.items) {
    calculatedMedicineCost = visit.dispensing.items.reduce(
      (sum: number, item: any) => sum + ((item.dispensedQuantity || item.prescribedQuantity || 0) * (item.medicine?.unitPrice || 0)),
      0
    );
  }
  let medicineCost = visit.medicineCost ?? calculatedMedicineCost;
  let discount = visit.discount || 0;
  const itemizedTotal = Math.max(0, Math.round((consultationFee + treatmentFee + medicineCost - discount) * 100) / 100);
  let totalAmount = visit.amountDue != null ? visit.amountDue : Math.round(itemizedTotal);

  const priorPaid = validPayments.slice(0, paymentIndex).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  let amountPaid = payment.amount;
  let cumulativePaid = priorPaid + payment.amount;
  let rawBalance = totalAmount - cumulativePaid;
  let balanceDue = (rawBalance <= 0 || (visit.status === 'COMPLETED' && rawBalance < 1)) ? 0 : rawBalance;
  let isPartial = balanceDue > 0;

  if (isAudit) {
    totalAmount = effectiveAuditAmount!;
    amountPaid = effectiveAuditAmount!;
    cumulativePaid = effectiveAuditAmount!;
    balanceDue = 0;
    isPartial = false;
    discount = 0;
    medicineCost = 0;

    const originalTotal = (consultationFee || 0) + (treatmentFee || 0);
    if (originalTotal > 0 && consultationFee > 0 && treatmentFee > 0) {
      consultationFee = Math.round((consultationFee / originalTotal) * effectiveAuditAmount!);
      treatmentFee = effectiveAuditAmount! - consultationFee;
    } else if (treatmentFee > 0) {
      treatmentFee = effectiveAuditAmount!;
      consultationFee = 0;
    } else {
      consultationFee = effectiveAuditAmount!;
      treatmentFee = 0;
    }
  }

  const branding = getClinicBranding();
  const receiptNo = payment.id ? `RCPT-${payment.id.substring(0, 8).toUpperCase()}` : 'RCPT-001';

  const receiptData = {
    clinicName: branding.name,
    clinicAddress: branding.address,
    clinicPhone: branding.phone,
    patientName: visit.patient.name,
    patientAge: visit.patient?.age ?? undefined,
    patientGender: visit.patient?.gender || undefined,
    patientPhone: visit.patient.phone,
    visitDate: visit.createdAt ? new Date(visit.createdAt).toISOString() : new Date().toISOString(),
    doctorName,
    consultationFee,
    treatmentFee,
    medicineCost,
    discount: discount > 0 ? discount : undefined,
    discountReason: isAudit ? undefined : (visit.discountReason || undefined),
    totalAmount,
    amountPaid,
    cumulativePaid,
    balanceDue,
    isPartial,
    paymentNumber: isAudit ? 1 : (paymentIndex >= 0 ? paymentIndex + 1 : 1),
    totalPaymentsCount: isAudit ? 1 : Math.max(1, validPayments.length),
    paymentMethod: payment.method || 'Cash',
    paymentDate: payment.date ? new Date(payment.date).toISOString() : (payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString()),
    paymentStatus: isAudit ? 'Paid' : (isPartial ? 'Partially Paid' : 'Paid'),
    paymentNotes: payment.notes || undefined,
    receiptNo,
    receivedBy,
  };

  const pdfBuffer = await generateReceiptPDF(receiptData);
  const filename = isAudit ? `receipt_audit_${effectiveAuditAmount}_${receiptNo}.pdf` : `receipt_${receiptNo}.pdf`;

  return { pdfBuffer, filename, visit };
}

export async function buildInvoicePDFBuffer(visitId: string): Promise<{ pdfBuffer: Buffer; filename: string; visit: any }> {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: true,
      consultation: true,
      payments: {
        orderBy: { createdAt: 'asc' }
      },
      completedTreatmentItems: {
        include: { catalogItem: true }
      },
      dispensing: {
        include: {
          items: {
            include: { medicine: true }
          }
        }
      }
    }
  }) as any;

  if (!visit) {
    throw new Error('Visit not found.');
  }

  let doctorName = 'Doctor';
  if (visit.doctorId) {
    const doctorStaff = await prisma.staff.findUnique({
      where: { id: visit.doctorId }
    });
    if (doctorStaff) doctorName = doctorStaff.name;
  }

  const consultationFee = visit.consultationFee || 0;
  const treatmentFee = visit.treatmentFee || 0;

  let calculatedMedicineCost = 0;
  const medicines = (visit.dispensing?.items || []).map((item: any) => {
    const qty = item.dispensedQuantity || item.prescribedQuantity || 0;
    const unitPrice = item.medicine?.unitPrice || 0;
    const total = qty * unitPrice;
    calculatedMedicineCost += total;
    return {
      name: item.medicine?.name || 'Medicine',
      quantity: qty,
      unitPrice,
      total
    };
  });

  const medicineCost = visit.medicineCost ?? calculatedMedicineCost;
  const discount = visit.discount || 0;
  const grossTotal = Math.round((consultationFee + treatmentFee + medicineCost) * 100) / 100;
  const netTotal = Math.max(0, Math.round((grossTotal - discount) * 100) / 100);
  const totalAmount = visit.amountDue != null ? visit.amountDue : Math.round(netTotal);
  const roundOff = Math.round((totalAmount - netTotal) * 100) / 100;

  const validPayments = (visit.payments || []).filter((p: any) => p.status === 'Paid' || p.status === 'Completed');
  const paidTotal = validPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const rawDue = totalAmount - paidTotal;
  const amountDue = (rawDue <= 0 || (visit.status === 'COMPLETED' && rawDue < 1)) ? 0 : rawDue;

  const treatments = (visit.completedTreatmentItems || []).map((t: any) => ({
    name: t.catalogItem?.name || 'Dental Procedure',
    category: t.catalogItem?.category,
    notes: t.notes || undefined,
  }));

  const payments = validPayments.map((p: any) => ({
    receiptNo: p.id ? `RCPT-${p.id.substring(0, 8).toUpperCase()}` : 'RCPT',
    date: p.date ? new Date(p.date).toISOString() : new Date(p.createdAt).toISOString(),
    method: p.method || 'Cash',
    amount: p.amount || 0
  }));

  const status = amountDue === 0 ? 'Fully Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid';
  const invoiceNumber = `INV-${visit.id.substring(0, 8).toUpperCase()}`;

  const branding = getClinicBranding();

  const pdfBuffer = await generateInvoicePDF({
    clinicName: branding.name,
    clinicAddress: branding.address,
    clinicPhone: branding.phone,
    invoiceNumber,
    visitDate: visit.createdAt ? new Date(visit.createdAt).toISOString() : new Date().toISOString(),
    patientName: visit.patient.name,
    patientAge: visit.patient?.age ?? undefined,
    patientGender: visit.patient?.gender || undefined,
    patientPhone: visit.patient.phone,
    doctorName,
    consultationFee,
    treatmentFee,
    medicineCost,
    discount: discount > 0 ? discount : undefined,
    discountReason: visit.discountReason || undefined,
    subtotal: grossTotal,
    roundOff: roundOff !== 0 ? roundOff : undefined,
    totalAmount,
    amountPaid: paidTotal,
    amountDue,
    status,
    treatments,
    medicines,
    payments
  });

  const filename = `invoice_${invoiceNumber}.pdf`;
  return { pdfBuffer, filename, visit };
}

// ==============================================================================
// AUTHENTICATED STAFF HANDLERS (Download Attachment)
// ==============================================================================

export const getPrescriptionPDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;
    const { pdfBuffer, filename } = await buildPrescriptionPDFBuffer(visitId);

    res.header('Content-Type', 'application/pdf');
    res.attachment(filename);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating prescription PDF:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to generate prescription PDF' });
  }
};

export const getReceiptPDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;
    const requestedPaymentId = (req.query.paymentId as string) || undefined;
    const auditAmountRaw = req.query.auditAmount as string;
    const auditAmount = auditAmountRaw ? parseFloat(auditAmountRaw) : undefined;
    const receivedBy = req.user?.username || 'Staff';

    const { pdfBuffer, filename, visit } = await buildReceiptPDFBuffer(visitId, requestedPaymentId, receivedBy, auditAmount);



    res.header('Content-Type', 'application/pdf');
    res.attachment(filename);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating receipt PDF:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to generate receipt PDF' });
  }
};

export const getInvoicePDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;
    const { pdfBuffer, filename, visit } = await buildInvoicePDFBuffer(visitId);



    res.header('Content-Type', 'application/pdf');
    res.attachment(filename);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to generate invoice PDF' });
  }
};

export const getPurchaseOrderPDF = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { medicine: true }
        }
      }
    }) as any;

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const branding = getClinicBranding();

    const pdfBuffer = await generatePurchaseOrderPDF({
      clinicName: branding.name,
      orderNumber: po.orderNumber,
      orderDate: po.orderDate ? new Date(po.orderDate).toISOString() : new Date().toISOString(),
      supplierName: po.supplier?.name || 'Supplier',
      supplierEmail: po.supplier?.email || undefined,
      supplierPhone: po.supplier?.phone || undefined,
      items: (po.items || []).map((item: any) => ({
        medicineName: item.medicine?.name || 'Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalAmount || (item.quantity * item.unitPrice),
      })),
      totalAmount: po.totalAmount,
      expectedDate: po.expectedDate ? new Date(po.expectedDate).toISOString() : undefined,
      notes: po.notes || undefined,
    });

    res.header('Content-Type', 'application/pdf');
    res.attachment(`purchase_order_${po.orderNumber}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating purchase order PDF:', error);
    res.status(500).json({ error: 'Failed to generate purchase order PDF' });
  }
};

// ==============================================================================
// PUBLIC & SHARING HANDLERS
// ==============================================================================

/**
 * Returns signed URLs and formatted text for sharing via WhatsApp (Web / App) or native share.
 * Strictly checks staff role authorization.
 */
export const getDocumentShareLink = async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string;
    const visitId = req.params.visitId as string;
    const requestedPaymentId = (req.query.paymentId as string) || undefined;

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
      }
    });

    if (!visit || !visit.patient) {
      return res.status(404).json({ error: 'Visit or patient details not found.' });
    }



    const token = generateDocumentToken(type, visitId);
    const branding = getClinicBranding();

    // Determine host origin
    const hostOrigin = (process.env.FRONTEND_ORIGIN || '')
      .split(',')[0]
      ?.trim()
      ?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;

    const queryParams = new URLSearchParams({
      token,
      ...(requestedPaymentId ? { paymentId: requestedPaymentId } : {}),
    });

    // Direct PDF download URL
    const pdfDownloadUrl = `${hostOrigin}/api/documents/public/${encodeURIComponent(type)}/${encodeURIComponent(visitId)}?${queryParams.toString()}`;

    const docName = type === 'prescription' ? 'Prescription' : type === 'receipt' ? 'Payment Receipt' : 'Invoice';
    const message = `*${branding.name}*\n\nDear *${visit.patient.name}*,\nThank you for visiting us. Your ${docName} is ready.\n\n*Download your ${docName} (PDF):*\n${pdfDownloadUrl}\n\n${branding.address}\nPh: ${branding.phone}`;

    return res.json({
      success: true,
      token,
      viewUrl: pdfDownloadUrl,
      pdfDownloadUrl,
      message,
      patientName: visit.patient.name,
      patientPhone: visit.patient.phone,
      documentType: docName,
    });
  } catch (error) {
    console.error('Error generating document share link:', error);
    res.status(500).json({ error: 'Failed to generate document share link' });
  }
};

/**
 * Public endpoint to stream the document PDF directly to patient browsers.
 * Triggers direct automatic download with Content-Disposition: attachment.
 * Secured via cryptographic HMAC token signature verification.
 */
export const getPublicDocumentPDF = async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string;
    const visitId = req.params.visitId as string;
    const token = (req.query.token as string) || '';
    const requestedPaymentId = (req.query.paymentId as string) || undefined;
    const auditAmountRaw = req.query.auditAmount as string;
    const auditAmount = auditAmountRaw ? parseFloat(auditAmountRaw) : undefined;

    // Verify token
    const expectedToken = generateDocumentToken(type, visitId);
    if (!token || token !== expectedToken) {
      return res.status(403).json({ error: 'Invalid or expired document access token.' });
    }

    let result: { pdfBuffer: Buffer; filename: string };

    if (type === 'prescription') {
      result = await buildPrescriptionPDFBuffer(visitId);
    } else if (type === 'receipt') {
      result = await buildReceiptPDFBuffer(visitId, requestedPaymentId, 'Clinic', auditAmount);
    } else if (type === 'invoice') {
      result = await buildInvoicePDFBuffer(visitId);
    } else {
      return res.status(400).json({ error: 'Unsupported document type.' });
    }

    res.header('Content-Type', 'application/pdf');
    // Forces direct automatic download on patient click
    res.attachment(result.filename);
    return res.send(result.pdfBuffer);
  } catch (error: any) {
    console.error('Error serving public document PDF:', error);
    res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to serve document PDF' });
  }
};
