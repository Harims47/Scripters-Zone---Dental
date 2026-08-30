import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });
    return res.json(appointments);
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    return res.json(appointment);
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    
    // Validate Patient exists
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) {
      return res.status(400).json({ error: 'Invalid patient ID: Patient does not exist' });
    }

    // Validate Provider exists (must be a valid staff member)
    const provider = await prisma.staff.findUnique({ where: { id: data.providerId } });
    if (!provider) {
      return res.status(400).json({ error: 'Invalid provider ID: Staff member does not exist' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        providerId: data.providerId,
        date: data.date,
        time: data.time,
        type: data.type,
        status: data.status || 'Scheduled',
        notes: data.notes,
        photoUrl: data.photoUrl
      }
    });
    return res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Creating an appointment does NOT create a visit automatically.
    // The instructions say "Do not prematurely implement Visit/Queue creation".

    const appointment = await prisma.appointment.update({
      where: { id },
      data
    });
    return res.json(appointment);
  } catch (error) {
    next(error);
  }
};
