// ===========================================
// Service Cache Redis (US-052)
// Cache des permissions pour optimiser les performances
// ===========================================

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../lib/logger';

// ===========================================
// Configuration Redis
// ===========================================

let redis: Redis | null = null;

/**
 * Initialise la connexion Redis
 */
export async function initRedis(): Promise<void> {
  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('[Cache] Redis connection failed, running without cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    await redis.connect();
    logger.info('[Cache] Redis connected successfully');

    redis.on('error', (err) => {
      logger.error({ err }, '[Cache] Redis error');
    });

    redis.on('reconnecting', () => {
      logger.info('[Cache] Redis reconnecting...');
    });
  } catch (error) {
    logger.warn({ error }, '[Cache] Failed to connect to Redis, running without cache');
    redis = null;
  }
}

/**
 * Ferme la connexion Redis
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('[Cache] Redis connection closed');
  }
}

/**
 * Vérifie si Redis est disponible
 */
export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

// ===========================================
// Cache générique
// ===========================================

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Récupère une valeur du cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error({ error, key }, '[Cache] Error getting value');
    return null;
  }
}

/**
 * Stocke une valeur dans le cache
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error({ error, key }, '[Cache] Error setting value');
  }
}

/**
 * Supprime une valeur du cache
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    logger.error({ error, key }, '[Cache] Error deleting value');
  }
}

/**
 * Supprime toutes les clés correspondant à un pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug({ pattern, count: keys.length }, '[Cache] Deleted keys by pattern');
    }
  } catch (error) {
    logger.error({ error, pattern }, '[Cache] Error deleting by pattern');
  }
}

// ===========================================
// Cache des permissions (US-052)
// ===========================================

const PERMISSION_CACHE_TTL = 60; // 1 minute (permissions sensibles = TTL court)

/**
 * Clé de cache pour une permission utilisateur sur une ressource
 */
function permissionCacheKey(userId: string, resourceType: string, resourceId: string): string {
  return `perm:${userId}:${resourceType}:${resourceId}`;
}

/**
 * Clé de cache pour les permissions effectives d'un utilisateur
 */
function effectivePermissionsCacheKey(userId: string, resourceType?: string): string {
  return `perm:effective:${userId}:${resourceType || 'all'}`;
}

/**
 * Récupère une permission du cache
 */
export async function getCachedPermission(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean | null> {
  const key = permissionCacheKey(userId, resourceType, resourceId);
  return cacheGet<boolean>(key);
}

/**
 * Stocke une permission dans le cache
 */
export async function setCachedPermission(
  userId: string,
  resourceType: string,
  resourceId: string,
  hasPermission: boolean
): Promise<void> {
  const key = permissionCacheKey(userId, resourceType, resourceId);
  await cacheSet(key, hasPermission, PERMISSION_CACHE_TTL);
}

/**
 * Récupère les permissions effectives du cache
 */
export async function getCachedEffectivePermissions<T>(
  userId: string,
  resourceType?: string
): Promise<T[] | null> {
  const key = effectivePermissionsCacheKey(userId, resourceType);
  return cacheGet<T[]>(key);
}

/**
 * Stocke les permissions effectives dans le cache
 */
export async function setCachedEffectivePermissions<T>(
  userId: string,
  permissions: T[],
  resourceType?: string
): Promise<void> {
  const key = effectivePermissionsCacheKey(userId, resourceType);
  await cacheSet(key, permissions, PERMISSION_CACHE_TTL);
}

/**
 * Invalide le cache des permissions pour un utilisateur
 * À appeler quand les permissions changent
 */
export async function invalidateUserPermissionCache(userId: string): Promise<void> {
  await cacheDeletePattern(`perm:${userId}:*`);
  await cacheDeletePattern(`perm:effective:${userId}:*`);
  logger.debug({ userId }, '[Cache] Invalidated user permission cache');
}

/**
 * Invalide le cache des permissions pour une ressource
 * À appeler quand les permissions sur une ressource changent
 */
export async function invalidateResourcePermissionCache(
  resourceType: string,
  resourceId: string
): Promise<void> {
  await cacheDeletePattern(`perm:*:${resourceType}:${resourceId}`);
  logger.debug({ resourceType, resourceId }, '[Cache] Invalidated resource permission cache');
}

/**
 * Invalide tout le cache des permissions
 * À utiliser avec précaution (impact performance)
 */
export async function invalidateAllPermissionCache(): Promise<void> {
  await cacheDeletePattern('perm:*');
  logger.info('[Cache] Invalidated all permission cache');
}
