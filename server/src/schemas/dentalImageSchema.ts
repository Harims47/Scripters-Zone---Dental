import { z } from 'zod';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export const createDentalImageSchema = z.object({
  body: z.object({
    type: z.enum(['OPG', 'RVG']),
    fileName: z.string().min(1, 'File name is required'),
    mimeType: z.string().refine((val) => (ALLOWED_MIME_TYPES as readonly string[]).includes(val), {
      message: 'Invalid file type. Only JPEG, PNG, and WEBP images are supported.'
    }),
    fileSize: z.number().int().positive('File size must be positive').max(
      MAX_FILE_SIZE_BYTES,
      'File size cannot exceed 2 MB'
    ),
    imageUrl: z.string().min(1, 'Image URL / payload is required'),
    toothNumber: z.number().int().nullable().optional(),
    visitId: z.string().nullable().optional(),
    title: z.string().max(150).nullable().optional(),
    notes: z.string().max(3000).nullable().optional()
  })
});

export const updateDentalImageSchema = z.object({
  body: z.object({
    title: z.string().max(150).nullable().optional(),
    notes: z.string().max(3000).nullable().optional(),
    toothNumber: z.number().int().nullable().optional(),
    visitId: z.string().nullable().optional()
  })
});
