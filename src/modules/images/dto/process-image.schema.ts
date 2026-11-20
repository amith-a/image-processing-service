import { z } from 'zod';

export const transformImageSchema = z.object({
  width: z.coerce.number().int().min(1).max(4096).optional(),
  height: z.coerce.number().int().min(1).max(4096).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  rotate: z.union([z.literal(90), z.literal(180), z.literal(270)]).optional(),
  flip: z.coerce.boolean().optional(),
  flop: z.coerce.boolean().optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
  grayscale: z.coerce.boolean().optional(),
  sepia: z.coerce.boolean().optional(),
});

export type TransformImageDTO = z.infer<typeof transformImageSchema>;

