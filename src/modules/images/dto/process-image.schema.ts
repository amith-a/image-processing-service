import { z } from 'zod';

export const imageSchema = z.object({
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.coerce.number().int().min(1).max(100).optional(),
  width: z.coerce.number().int().min(1).max(4096).optional(),
  height: z.coerce.number().int().min(1).max(4096).optional(),
});

export type ImageDTO = z.infer<typeof imageSchema>;
