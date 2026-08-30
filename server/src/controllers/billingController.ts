import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getBillingQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: { in: ['READY_FOR_RECEPTION', 'READY_FOR_PAYMENT', 'COMPLETED'] }
      },
      include: {
        patient: true,
        prescription: {
          include: { items: true }
        },
        dispensing: true,
        payment: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json(visits);
  } catch (error) {
    next(error);
  }
};
