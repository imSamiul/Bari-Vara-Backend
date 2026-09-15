import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Local: `.env.development` (gitignored). Production (Render) injects
 * process.env — dotenv does not override existing keys, and a missing file is fine.
 */
dotenv.config({ path: '.env.development' });

/**
 * Integrations are optional in development and test so the API can boot from a
 * bare clone, but they are mandatory in production.
 */
const productionRequired = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
] as const;

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().default('/api/v1'),

    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

    CORS_ORIGIN: z.string().min(1),
    COOKIE_DOMAIN: z.string().optional(),

    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('Bari Vara <no-reply@bari-vara.local>'),

    // Optional everywhere: without it the Google route answers 503 and the
    // frontend hides its button, so a missing key never blocks a deploy.
    GOOGLE_CLIENT_ID: z.string().optional(),

    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

    FLAT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;

    for (const key of productionRequired) {
      if (!value[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when NODE_ENV=production`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) =>
  origin.trim(),
);

export const accessTokenTtlSeconds = env.ACCESS_TOKEN_TTL_MINUTES * 60;
export const refreshTokenTtlSeconds = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
