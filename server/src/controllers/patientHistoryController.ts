import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getPatientHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Following frontend logic: History typically shows COMPLETED visits, but we'll fetch them all
    // and let the client filter, or we can filter here. The instruction says:
    // "If the current History UI displays completed visits only, preserve that behavior."
    // From Patients.tsx: visits.filter(v => v.patientId === selectedPatient.id && v.status === 'COMPLETED')
    const visits = await prisma.visit.findMany({
      where: { 
        patientId,
        status: 'COMPLETED'
      },
      include: {
        consultation: true,
        prescription: {
          include: { items: { include: { medicine: true } } }
        },
        dispensing: {
          include: { items: { include: { medicine: true } } }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(visits);
  } catch (error) {
    next(error);
  }
};

export const getHistoricalVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const visitId = req.params.visitId as string;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        consultation: true,
        prescription: {
          include: { items: { include: { medicine: true } } }
        },
        dispensing: {
          include: { items: { include: { medicine: true } } }
        },
        payment: true
      }
    });

    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    
    // Isolation Check
    if (visit.patientId !== patientId) {
      return res.status(404).json({ error: 'Visit does not belong to this patient' });
    }

    return res.json(visit);
  } catch (error) {
    next(error);
  }
};
