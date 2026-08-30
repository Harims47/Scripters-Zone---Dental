import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { patient: true, visit: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id as string },
      include: { patient: true, visit: true }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    return res.json(payment);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, amount, method } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        include: { patient: true, payment: true, prescription: true }
      });

      if (!visit) throw { status: 404, message: 'Visit not found' };

      // Ensure no duplicate payment exists
      if (visit.payment) {
        throw { status: 409, message: 'Payment already completed for this visit.' };
      }

      // Check state readiness
      if (visit.status === 'READY_FOR_RECEPTION') {
        // If there's a prescription but no dispensing, it's not ready
        if (visit.prescription) {
          const disp = await tx.dispensing.findUnique({ where: { visitId } });
          if (!disp) {
            throw { status: 409, message: 'Visit requires dispensing before payment can be collected.' };
          }
        }
      } else if (visit.status !== 'READY_FOR_PAYMENT') {
        throw { status: 409, message: `Cannot process payment for visit in status: ${visit.status}` };
      }

      // Validate Amount (Authoritative DB check)
      const expectedAmount = visit.amountDue || 0;
      if (amount !== expectedAmount) {
        throw { status: 400, message: `Incorrect payment amount. Expected ${expectedAmount}, but received ${amount}.` };
      }

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          amount,
          method,
          status: 'Completed',
          date: new Date().toISOString()
        }
      });

      // Update Visit Status
      const updatedVisit = await tx.visit.update({
        where: { id: visit.id },
        data: { status: 'COMPLETED' }
      });

      // Note: Do NOT touch stock here. It was deducted in Dispensing.

      return { payment, visit: updatedVisit };
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};
