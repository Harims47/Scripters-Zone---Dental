import { Request, Response } from 'express';
import { prisma } from '../db';
import { generatePrescriptionPDF, generateReceiptPDF } from '../services/documentService';

export const getPrescriptionPDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;

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
      return res.status(404).json({ error: 'Prescription not found for this visit.' });
    }

    const staff = visit.doctorId ? await prisma.staff.findUnique({
      where: { id: visit.doctorId }
    }) : null;

    const prescriptionData = {
      clinicName: 'Rafi Dental Clinic',
      clinicAddress: '37, Dr.Venkatraman St, near Government Hospital, Gopichettipalayam, Gobichettipalayam, Tamil Nadu 638452',
      clinicPhone: '094430 23648',
      patientName: visit.patient.name,
      patientAge: visit.patient.age || '',
      patientGender: visit.patient.gender || '',
      patientId: visit.patient.id,
      patientPhone: visit.patient.phone,
      diagnosis: visit.consultation?.reasonForVisit || visit.reasonForVisit || undefined,
      visitDate: visit.createdAt.toLocaleDateString('en-IN'),
      visitId: visit.id,
      doctorName: staff ? staff.name : 'Doctor',
      items: visit.prescription.items.map((item: any) => ({
        medicineName: item.medicine?.name || 'Medicine',
        quantity: item.quantity,
        dosage: item.dosage || undefined,
        frequency: item.frequency || undefined,
        duration: item.duration || undefined,
        instructions: item.instructions || undefined
      }))
    };

    const pdfBuffer = await generatePrescriptionPDF(prescriptionData);

    res.header('Content-Type', 'application/pdf');
    res.attachment(`prescription_${visit.patient.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating prescription PDF:', error);
    res.status(500).json({ error: 'Failed to generate prescription PDF' });
  }
};

export const getReceiptPDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
        payments: true,
        consultation: true,
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
      return res.status(404).json({ error: 'Visit not found.' });
    }

    // Security Check: If visit is doctor-owned, Receptionists are prohibited from accessing receipt data
    if (visit.paymentOwner === 'DOCTOR' && req.user?.role === 'Receptionist') {
      return res.status(403).json({
        error: 'Access denied: Payment and receipt details for this doctor-owned visit are restricted from Reception.',
      });
    }

    // Fetch doctor name
    let doctorName = 'Doctor';
    if (visit.doctorId) {
      const doctorStaff = await prisma.staff.findUnique({
        where: { id: visit.doctorId }
      });
      if (doctorStaff) doctorName = doctorStaff.name;
    }

    const payment = visit.payments && visit.payments.length > 0 ? visit.payments[visit.payments.length - 1] : null;

    if (!payment || (payment.status !== 'Paid' && payment.status !== 'Completed')) {
      return res.status(400).json({ error: 'Payment is not completed. Cannot generate receipt.' });
    }

    // Calculate medicine cost (using authoritative database data)
    let medicineCost = 0;
    if (visit.dispensing && visit.dispensing.items) {
      medicineCost = visit.dispensing.items.reduce(
        (sum: number, item: any) => sum + (item.dispensedQuantity * item.medicine.unitPrice),
        0
      );
    }

    const consultationFee = Math.max(0, payment.amount - medicineCost);

    const receiptData = {
      clinicName: 'Rafi Dental Clinic',
      clinicAddress: '37, Dr.Venkatraman St, near Government Hospital, Gopichettipalayam, Gobichettipalayam, Tamil Nadu 638452',
      clinicPhone: '094430 23648',
      patientName: visit.patient.name,
      patientId: visit.patient.id,
      patientPhone: visit.patient.phone,
      visitId: visit.id,
      visitDate: visit.createdAt.toLocaleDateString(),
      doctorName: doctorName,
      consultationFee,
      medicineCost,
      totalAmount: payment.amount,
      amountPaid: payment.amount,
      paymentMethod: payment.method,
      paymentDate: new Date(payment.date).toLocaleDateString(),
      paymentStatus: payment.status,
      receiptNo: payment.id ? `RCPT-${payment.id.substring(0, 8).toUpperCase()}` : 'RCPT-001',
      receivedBy: req.user?.username || 'Staff',
    };

    const pdfBuffer = await generateReceiptPDF(receiptData as any);

    res.header('Content-Type', 'application/pdf');
    res.attachment(`receipt_${visit.patient.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    res.status(500).json({ error: 'Failed to generate receipt PDF' });
  }
};

export const getInvoicePDF = async (req: Request, res: Response) => {
  try {
    const visitId = req.params.visitId as string;

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
      return res.status(404).json({ error: 'Visit not found.' });
    }

    // Security Check: If visit is doctor-owned, Receptionists are prohibited from accessing invoice data
    if (visit.paymentOwner === 'DOCTOR' && req.user?.role === 'Receptionist') {
      return res.status(403).json({
        error: 'Access denied: Invoice and financial details for this doctor-owned visit are restricted from Reception.',
        message: 'Handled by Doctor'
      });
    }

    // Fetch doctor name
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
    const grossTotal = consultationFee + treatmentFee + medicineCost;

    const validPayments = (visit.payments || []).filter((p: any) => p.status === 'Paid' || p.status === 'Completed');
    const paidTotal = validPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const amountDue = Math.max(0, grossTotal - paidTotal);

    const treatments = (visit.completedTreatmentItems || []).map((t: any) => ({
      name: t.catalogItem?.name || 'Dental Procedure',
      category: t.catalogItem?.category,
      notes: t.notes || undefined,
    }));

    const payments = validPayments.map((p: any) => ({
      receiptNo: p.id ? `RCPT-${p.id.substring(0, 8).toUpperCase()}` : 'RCPT',
      date: p.date ? new Date(p.date).toLocaleDateString('en-IN') : new Date(p.createdAt).toLocaleDateString('en-IN'),
      method: p.method || 'Cash',
      amount: p.amount || 0
    }));

    const status = amountDue === 0 ? 'Fully Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid';
    const invoiceNumber = `INV-${visit.id.substring(0, 8).toUpperCase()}`;

    const { generateInvoicePDF } = await import('../services/documentService');
    const pdfBuffer = await generateInvoicePDF({
      clinicName: 'Rafi Dental Clinic',
      clinicAddress: '37, Dr.Venkatraman St, near Government Hospital, Gopichettipalayam, Gobichettipalayam, Tamil Nadu 638452',
      clinicPhone: '094430 23648',
      invoiceNumber,
      visitId: visit.id,
      visitDate: visit.createdAt.toLocaleDateString('en-IN'),
      patientName: visit.patient.name,
      patientId: visit.patient.id,
      patientPhone: visit.patient.phone,
      doctorName,
      consultationFee,
      treatmentFee,
      medicineCost,
      totalAmount: grossTotal,
      amountPaid: paidTotal,
      amountDue,
      status,
      treatments,
      medicines,
      payments
    });

    res.header('Content-Type', 'application/pdf');
    res.attachment(`invoice_${invoiceNumber}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
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

    const { generatePurchaseOrderPDF } = await import('../services/documentService');
    const pdfBuffer = await generatePurchaseOrderPDF({
      clinicName: 'DentalCore Dental Clinic',
      orderNumber: po.orderNumber,
      orderDate: po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
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
      expectedDate: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-IN') : undefined,
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

