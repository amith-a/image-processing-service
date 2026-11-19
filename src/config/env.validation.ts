import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  // S3 / Object Storage
  S3_ENDPOINT: z.string().min(1).optional(), // Optional if targeting real AWS S3
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true), // true for MinIO/LocalStack
});

// Parse and validate process.env
export function validate(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
