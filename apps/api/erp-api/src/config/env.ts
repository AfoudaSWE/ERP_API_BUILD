import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().default('postgresql://erp:erp@localhost:5432/erp'),
  DB_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/).default('erp'),
  JWT_SECRET: z.string().min(32).default('local-development-secret-change-me-now'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().max(90).default(14),
  SIGNUP_TRIAL_DAYS: z.coerce.number().int().positive().max(365).default(14),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  OLLAMA_BASE_URL: z.url().optional(),
  OLLAMA_URL: z.url().optional(),
  OLLAMA_MODEL: z.string().min(1).default('qwen2.5-coder:7b'),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  PLATFORM_APPROVAL_EMAIL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') return;
  if (!process.env.DATABASE_URL) context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Required in production' });
  if (!process.env.JWT_SECRET || value.JWT_SECRET.includes('change-me') || value.JWT_SECRET.includes('replace-this')) {
    context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'A unique production secret is required' });
  }
  const origins = value.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  if (origins.some((origin) => origin === '*' || !origin.startsWith('https://'))) {
    context.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'Production origins must be explicit HTTPS URLs' });
  }
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  OLLAMA_BASE_URL: (parsed.OLLAMA_BASE_URL ?? parsed.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, ''),
};
