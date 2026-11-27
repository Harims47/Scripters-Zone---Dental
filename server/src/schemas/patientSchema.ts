import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
    alternatePhone: z.string().optional().nullable(),
    age: z.number().int().positive('Age must be a positive number'),
    gender: z.enum(['Male', 'Female', 'Other']),
    status: z.enum(['Active', 'Inactive']).optional(),
    photoUrl: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    preferredCommunicationChannel: z.enum(['AUTO', 'WHATSAPP', 'SMS', 'EMAIL']).optional(),
  }),
});

export const updatePatientSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    phone: z.string().min(1, 'Phone cannot be empty').optional().nullable(),
    alternatePhone: z.string().optional().nullable(),
    age: z.number().int().positive('Age must be a positive number').optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
    photoUrl: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    preferredCommunicationChannel: z.enum(['AUTO', 'WHATSAPP', 'SMS', 'EMAIL']).optional(),
  }),
});
