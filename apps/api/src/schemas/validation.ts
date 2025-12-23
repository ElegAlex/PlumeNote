// ===========================================
// Validation Schemas - Security Layer
// Strict validation before Prisma queries to prevent operator injection
// ===========================================

import { z } from 'zod';

/**
 * UUID validation - Prevents Prisma operator injection via malformed IDs
 * Example attack: { "not": "" } instead of a valid UUID
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Validates an array of UUIDs
 */
export const uuidArraySchema = z.array(uuidSchema);

/**
 * Safe search query - Prevents ReDoS and limits input
 */
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query is required')
    .max(200, 'Query too long')
    .regex(/^[a-zA-Z0-9À-ÿ\s\-_'.,:!?]+$/, 'Invalid characters in query'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Note creation with strict limits
 */
export const noteCreateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title too long')
    .trim(),
  content: z.string().max(10_000_000, 'Content too large'), // 10MB max
  folderId: uuidSchema.optional().nullable(),
  tags: z.array(z.string().max(50)).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Note update schema
 */
export const noteUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  content: z.string().max(10_000_000).optional(),
  folderId: uuidSchema.optional().nullable(),
  tags: z.array(z.string().max(50)).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Username validation for LDAP/local auth
 */
export const usernameSchema = z
  .string()
  .min(1, 'Username is required')
  .max(256, 'Username too long')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid username format');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format').max(320);

/**
 * Password validation with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

/**
 * Safe string for general text fields
 */
export const safeStringSchema = (maxLength = 1000) =>
  z.string().max(maxLength).trim();

/**
 * Validate and parse input, returning the validated data or throwing
 */
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate input and return a result object
 */
export function validateSafe<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
