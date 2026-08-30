import { z } from 'zod';

export const adjustStockSchema = z.object({
  body: z.object({
    adjustmentAmount: z.number().int('Adjustment must be an integer')
  })
});

export const createMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    categoryId: z.string().min(1, 'Category is required'),
    unit: z.string().min(1, 'Unit is required'),
    currentStock: z.number().min(0, 'Current stock must be 0 or positive').default(0),
    stockWarningLevel: z.number().min(0, 'Minimum stock must be 0 or positive').default(10),
    unitPrice: z.number().min(0, 'Unit price must be 0 or positive').default(0),
    form: z.string().default('Tablet')
  })
});

export const updateMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    categoryId: z.string().min(1, 'Category is required').optional(),
    unit: z.string().min(1, 'Unit is required').optional(),
    currentStock: z.number().min(0, 'Current stock must be 0 or positive').optional(),
    stockWarningLevel: z.number().min(0, 'Minimum stock must be 0 or positive').optional(),
    unitPrice: z.number().min(0, 'Unit price must be 0 or positive').optional(),
    form: z.string().optional()
  })
});
