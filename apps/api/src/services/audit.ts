// ===========================================
// Service Audit Log (US-112)
// ===========================================

import { prisma } from '@plumenote/database';
import type { AuditAction } from '@plumenote/types';
import { logger } from '../lib/logger.js';

export interface CreateAuditLogParams {
  userId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Crée une entrée de log d'audit
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Ne pas faire échouer l'opération principale si le log échoue
    logger.error({ err, params }, 'Failed to create audit log');
  }
}

/**
 * Récupère les logs d'audit avec filtres
 */
export async function getAuditLogs(params: {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
  } = params;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = dateFrom;
    if (dateTo) (where.createdAt as Record<string, Date>).lte = dateTo;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
