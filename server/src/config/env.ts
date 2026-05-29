import 'dotenv/config';
import { z } from 'zod';

const stringBool = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('30d'),

  MOCK_OTP: stringBool.default(true),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),

  EMAIL_PROVIDER: z.enum(['brevo', 'resend']).default('brevo'),
  EMAIL_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Samaj Connect <noreply@example.com>'),

  ADMIN_CONTACT_PHONE: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
