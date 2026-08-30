import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getConsultationByVisitId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = req.params.visitId as string;
    const consultation = await prisma.consultation.findUnique({
      where: { visitId }
    });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found for this visit' });
    return res.json(consultation);
  } catch (error) {
    next(error);
  }
};

export const createConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, reasonForVisit, clinicalNotes, consultationFee } = req.body;
    const doctorId = (req as any).user.staffId;

    if (!doctorId) {
      return res.status(403).json({ error: 'Authenticated user is not linked to a staff record' });
    }

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    if (visit.status !== 'WITH_DOCTOR') {
      return res.status(409).json({ error: 'Visit is not in WITH_DOCTOR state' });
    }

    // Check for duplicate consultation
    const existing = await prisma.consultation.findUnique({ where: { visitId } });
    if (existing) {
      return res.status(409).json({ error: 'Consultation already exists for this visit' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          visitId,
          doctorId,
          reasonForVisit,
          clinicalNotes,
          consultationFee: consultationFee || 0,
          status: 'In Progress'
        }
      });

      // Link to Visit
      await tx.visit.update({
        where: { id: visitId },
        data: { 
          consultationFee: consultationFee || 0,
          amountDue: (consultationFee || 0) + (visit.medicineCost || 0)
        }
      });

      return consultation;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reasonForVisit, clinicalNotes, consultationFee } = req.body;
    const doctorId = (req as any).user.staffId;

    const existing = await prisma.consultation.findUnique({ where: { id }, include: { visit: true } });
    if (!existing) return res.status(404).json({ error: 'Consultation not found' });

    if (existing.doctorId !== doctorId) {
      return res.status(403).json({ error: 'You are not the owner of this consultation' });
    }

    if (existing.status === 'Completed') {
      return res.status(409).json({ error: 'Cannot edit a completed consultation' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.update({
        where: { id },
        data: { reasonForVisit, clinicalNotes, consultationFee }
      });

      if (consultationFee !== undefined) {
        await tx.visit.update({
          where: { id: existing.visitId },
          data: {
            consultationFee,
            amountDue: consultationFee + (existing.visit.medicineCost || 0)
          }
        });
      }

      return consultation;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

export const completeConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visitId = req.params.visitId as string;
    const doctorId = (req as any).user.staffId;

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: { consultation: true, prescription: true, queueEntry: true }
    });

    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    if (visit.status !== 'WITH_DOCTOR') {
      return res.status(409).json({ error: 'Visit is not in WITH_DOCTOR state' });
    }

    if (!visit.consultation) {
      return res.status(409).json({ error: 'Cannot complete visit without a consultation' });
    }

    if (visit.consultation.doctorId !== doctorId) {
      return res.status(403).json({ error: 'You are not the doctor for this consultation' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Finalize Consultation
      await tx.consultation.update({
        where: { id: visit.consultation!.id },
        data: { status: 'Completed' }
      });

      // 2. Finalize Prescription if exists
      if (visit.prescription) {
        await tx.prescription.update({
          where: { id: visit.prescription.id },
          data: { status: 'Finalized' }
        });
      }

      // 3. Transition Visit
      const updatedVisit = await tx.visit.update({
        where: { id: visitId },
        data: { status: 'READY_FOR_RECEPTION' }
      });

      // 4. Transition Queue
      if (visit.queueEntry) {
        await tx.queueEntry.update({
          where: { id: visit.queueEntry.id },
          data: { status: 'Completed' }
        });
      }

      return updatedVisit;
    });

    return res.json({ message: 'Consultation completed successfully', visit: result });
  } catch (error) {
    next(error);
  }
};
