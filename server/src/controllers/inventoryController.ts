import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(medicines);
  } catch (error) {
    next(error);
  }
};

export const getMedicine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    return res.json(medicine);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { adjustmentAmount } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Must read current stock within transaction
      const med = await tx.medicine.findUnique({ where: { id } });
      if (!med) throw { status: 404, message: 'Medicine not found' };

      const newStock = med.currentStock + adjustmentAmount;
      if (newStock < 0) {
        throw { status: 409, message: `Insufficient stock. Cannot adjust by ${adjustmentAmount}. Current stock is ${med.currentStock}.` };
      }

      return tx.medicine.update({
        where: { id },
        data: { currentStock: newStock }
      });
    });

    return res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};
