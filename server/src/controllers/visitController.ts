import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const checkActiveVisit = async (patientId: string) => {
  const activeVisit = await prisma.visit.findFirst({
    where: {
      patientId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  });
  return activeVisit !== null;
};

export const startWalkInVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, doctorId, isUrgent, reasonForVisit } = req.body;

    // Validate relationships
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(400).json({ error: 'Patient does not exist' });

    const doctor = await prisma.staff.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(400).json({ error: 'Doctor does not exist' });

    // Validate duplicate active visit
    const hasActive = await checkActiveVisit(patientId);
    if (hasActive) return res.status(409).json({ error: 'This patient already has an active visit.' });

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const position = await tx.queueEntry.count() + 1;
      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Create Visit
      const visit = await tx.visit.create({
        data: {
          patientId,
          doctorId,
          status: 'WAITING',
          amountDue: 1500, // Matching frontend mock
          reasonForVisit,
          queueEntry: {
            create: {
              patientId,
              assignedDoctorId: doctorId,
              position,
              status: 'Waiting',
              priority: isUrgent || false,
              arrivalTime
            }
          }
        },
        include: { queueEntry: true }
      });

      return visit;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const checkInAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.body;

    // Validate appointment
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (['Cancelled', 'No Show'].includes(appointment.status)) {
      return res.status(409).json({ error: 'Cannot confirm arrival for a cancelled or no-show appointment.' });
    }

    if (appointment.status === 'Checked In') {
      return res.status(409).json({ error: 'Appointment is already checked in.' });
    }

    // Check duplicate visit for appointment
    const existingVisit = await prisma.visit.findUnique({ where: { appointmentId } });
    if (existingVisit) {
      return res.status(409).json({ error: 'A visit has already been created for this appointment.' });
    }

    // Check active visit for patient
    const hasActive = await checkActiveVisit(appointment.patientId);
    if (hasActive) {
      return res.status(409).json({ error: 'This patient already has an active visit.' });
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const position = await tx.queueEntry.count() + 1;
      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Create Visit linked to Appointment
      const visit = await tx.visit.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.providerId,
          appointmentId: appointment.id,
          status: 'WAITING',
          amountDue: 1500,
          queueEntry: {
            create: {
              patientId: appointment.patientId,
              assignedDoctorId: appointment.providerId,
              position,
              status: 'Waiting',
              priority: false,
              arrivalTime
            }
          }
        },
        include: { queueEntry: true }
      });

      // Update Appointment status
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: 'Checked In' }
      });

      return visit;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visits = await prisma.visit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        queueEntry: true,
        consultation: true,
        prescription: { include: { items: true } }
      }
    });
    return res.json(visits);
  } catch (error) {
    next(error);
  }
};

export const getVisitById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { 
        queueEntry: true,
        consultation: true,
        prescription: { include: { items: true } }
      }
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    return res.json(visit);
  } catch (error) {
    next(error);
  }
};
