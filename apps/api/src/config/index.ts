// ===========================================
// PlumeNote API - Configuration
// ===========================================

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),

  // Cookie
  COOKIE_SECRET: z.string().min(32).optional(),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // LDAP
  LDAP_ENABLED: z.string().transform(val => val === 'true').default('false'),
  LDAP_URL: z.string().optional(),
  LDAP_BIND_DN: z.string().optional(),
  LDAP_BIND_PASSWORD: z.string().optional(),
  LDAP_SEARCH_BASE: z.string().optional(),
  LDAP_SEARCH_FILTER: z.string().default('(uid={{username}})'),

  // File upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),

  // Session
  SESSION_INACTIVITY_TIMEOUT_MS: z.coerce.number().default(1800000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  port: env.API_PORT,

  // Database
  databaseUrl: env.DATABASE_URL,

  // Redis
  redisUrl: env.REDIS_URL,

  // JWT
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,

  // Cookie
  cookieSecret: env.COOKIE_SECRET || env.JWT_SECRET,

  // CORS
  corsOrigins: env.CORS_ORIGINS.split(',').map(s => s.trim()),

  // Rate limiting
  rateLimitMax: env.RATE_LIMIT_MAX,
  rateLimitWindow: env.RATE_LIMIT_WINDOW_MS,

  // LDAP
  ldap: {
    enabled: env.LDAP_ENABLED,
    url: env.LDAP_URL,
    bindDn: env.LDAP_BIND_DN,
    bindPassword: env.LDAP_BIND_PASSWORD,
    searchBase: env.LDAP_SEARCH_BASE,
    searchFilter: env.LDAP_SEARCH_FILTER,
  },

  // File upload
  uploadDir: env.UPLOAD_DIR,
  maxFileSizeMb: env.MAX_FILE_SIZE_MB,

  // Session
  sessionInactivityTimeout: env.SESSION_INACTIVITY_TIMEOUT_MS,
} as const;

export type Config = typeof config;
