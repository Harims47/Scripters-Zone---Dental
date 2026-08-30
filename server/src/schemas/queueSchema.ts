import { z } from 'zod';

export const transitionQueueSchema = z.object({
  body: z.object({
    action: z.enum(['CALL_PATIENT', 'START_CONSULTATION'])
  })
});
