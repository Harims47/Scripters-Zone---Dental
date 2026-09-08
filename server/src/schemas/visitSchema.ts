import { z } from 'zod';

export const startWalkInVisitSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Invalid patient ID'),
    doctorId: z.string().optional(),
    isUrgent: z.boolean().optional(),
    reasonForVisit: z.string().optional()
  })
});

export const checkInAppointmentSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(1, 'Invalid appointment ID')
  })
});

export const updateVisitSchema = z.object({
  body: z.object({
    reasonForVisit: z.string().optional(),
    doctorId: z.string().nullable().optional(),
    isUrgent: z.boolean().optional(),
    amountDue: z.number().optional(),
  })
});

