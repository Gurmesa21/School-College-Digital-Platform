import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(65535))
    .default('4000'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  ALLOW_DEV_TENANT_OVERRIDE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  TRUST_PROXY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(envInput: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(envInput);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('Configuration validation error:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment configuration');
  }

  const data = parsed.data;

  // Strict Security Rule: Never allow dev tenant override in production or staging
  if ((data.NODE_ENV === 'production' || data.APP_ENV === 'production' || data.APP_ENV === 'staging') && data.ALLOW_DEV_TENANT_OVERRIDE) {
    console.warn('[Security Warning] ALLOW_DEV_TENANT_OVERRIDE cannot be enabled in staging or production. Forcing disabled.');
    data.ALLOW_DEV_TENANT_OVERRIDE = false;
  }

  return data;
}

export const config = loadConfig();
