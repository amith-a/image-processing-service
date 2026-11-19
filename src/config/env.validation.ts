import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  //   DATABASE_URL: z.string().url(),
});

// Parse and validate process.env
export function validate(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
