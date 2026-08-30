import { z } from 'zod';

export const startWalkInVisitSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Invalid patient ID'),
    doctorId: z.string().min(1, 'Invalid doctor ID'),
    isUrgent: z.boolean().optional(),
    reasonForVisit: z.string().optional()
  })
});

export const checkInAppointmentSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(1, 'Invalid appointment ID')
  })
});
