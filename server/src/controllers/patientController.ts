import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(patients);
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const patient = await prisma.patient.findUnique({
      where: { id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    return res.json(patient);
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const patient = await prisma.patient.create({
      data: {
        name: data.name,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        status: data.status || 'Active',
        photoUrl: data.photoUrl
      }
    });
    return res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    
    // Check if patient exists
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = await prisma.patient.update({
      where: { id },
      data
    });
    return res.json(patient);
  } catch (error) {
    next(error);
  }
};
