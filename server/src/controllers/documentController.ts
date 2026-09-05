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

    const staff = await prisma.staff.findUnique({
      where: { id: visit.doctorId }
    });

    const prescriptionData = {
      clinicName: 'DentalCore Dental Clinic',
      patientName: visit.patient.name,
      patientAge: visit.patient.age || '',
      patientGender: visit.patient.gender || '',
      patientId: visit.patient.id,
      patientPhone: visit.patient.phone,
      visitDate: visit.createdAt.toLocaleDateString('en-IN'),
      visitId: visit.id,
      doctorName: staff ? staff.name : 'Unknown',
      items: visit.prescription.items.map((item: any) => ({
        medicineName: item.medicine.name,
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
      clinicName: 'DentalCore Dental Clinic',
      patientName: visit.patient.name,
      patientPhone: visit.patient.phone,
      visitDate: visit.createdAt.toLocaleDateString(),
      doctorName: doctorName,
      consultationFee,
      medicineCost,
      totalAmount: payment.amount,
      amountPaid: payment.amount,
      paymentMethod: payment.method,
      paymentDate: new Date(payment.date).toLocaleDateString(),
      paymentStatus: payment.status
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
