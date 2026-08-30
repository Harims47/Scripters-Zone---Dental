import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';

export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ data: staff });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, role, status, username, password, hasAccess } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staff.create({
        data: {
          name,
          phone,
          role,
          status: status || 'Active'
        }
      });

      if (hasAccess && username && password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await tx.user.create({
          data: {
            username,
            passwordHash,
            role,
            staffId: newStaff.id
          }
        });
      }

      return newStaff;
    });

    return res.status(201).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, role } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: { name, phone, role }
      });

      // Update role of associated user if it exists
      const user = await tx.user.findUnique({ where: { staffId: id } });
      if (user) {
        await tx.user.update({
          where: { id: user.id },
          data: { role }
        });
      }

      return updatedStaff;
    });

    return res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const updateStaffStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: { status }
      });

      if (status === 'Inactive') {
        // Revoke system access by deleting the associated user record
        await tx.user.deleteMany({ where: { staffId: id } });
      }

      return updatedStaff;
    });

    return res.json({ data: result });
  } catch (error) {
    next(error);
  }
};
