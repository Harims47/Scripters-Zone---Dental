import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { staff: true }
    });

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User is inactive or deleted' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      staffId: user.staffId,
      staff: user.staff
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.clearCookie('token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
