import { z } from 'zod';

export const adjustStockSchema = z.object({
  body: z.object({
    adjustmentAmount: z.number().int('Adjustment must be an integer')
  })
});
