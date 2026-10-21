import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1000).max(65535))
    .default('4000'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadConfig(envInput: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = envSchema.safeParse(envInput);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('Configuration validation error:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const config = loadConfig();
