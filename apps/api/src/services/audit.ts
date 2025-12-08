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
  targetName?: string; // Nom/titre de la cible (conservé même si la ressource est supprimée)
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
        targetName: params.targetName,
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

/**
 * Labels lisibles pour les actions d'audit
 */
const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Connexion',
  AUTH_LOGOUT: 'Déconnexion',
  AUTH_FAILED: 'Échec de connexion',
  USER_CREATED: 'Utilisateur créé',
  USER_UPDATED: 'Utilisateur modifié',
  USER_DELETED: 'Utilisateur supprimé',
  USER_DISABLED: 'Utilisateur désactivé',
  USER_ENABLED: 'Utilisateur activé',
  ROLE_CHANGED: 'Rôle modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  NOTE_CREATED: 'Note créée',
  NOTE_UPDATED: 'Note modifiée',
  NOTE_DELETED: 'Note supprimée',
  NOTE_RESTORED: 'Note restaurée',
  FOLDER_CREATED: 'Dossier créé',
  FOLDER_UPDATED: 'Dossier modifié',
  FOLDER_DELETED: 'Dossier supprimé',
  PERMISSION_GRANTED: 'Permission accordée',
  PERMISSION_REVOKED: 'Permission révoquée',
  BACKUP_CREATED: 'Sauvegarde créée',
  BACKUP_RESTORED: 'Sauvegarde restaurée',
};

/**
 * Échappe une valeur pour l'inclure dans un CSV
 */
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  // Si la valeur contient des guillemets, virgules ou retours à la ligne, l'entourer de guillemets
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exporte les logs d'audit en CSV
 */
export async function exportAuditLogsCsv(params: {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  maxRows?: number;
}): Promise<string> {
  const { maxRows = 10000, ...queryParams } = params;

  const { logs } = await getAuditLogs({
    ...queryParams,
    limit: maxRows,
    offset: 0,
  });

  // En-têtes CSV
  const headers = [
    'Date',
    'Heure',
    'Action',
    'Utilisateur',
    'Type cible',
    'ID cible',
    'Nom cible',
    'Détails',
    'Adresse IP',
  ];

  // Lignes de données
  const rows = logs.map((log) => {
    const date = new Date(log.createdAt);
    return [
      date.toISOString().split('T')[0], // Date YYYY-MM-DD
      date.toISOString().split('T')[1]?.split('.')[0] || '', // Heure HH:mm:ss
      ACTION_LABELS[log.action] || log.action,
      log.user?.displayName || log.user?.username || 'N/A',
      log.resourceType,
      log.resourceId || '',
      log.targetName || '',
      log.details ? JSON.stringify(log.details) : '',
      log.ipAddress || '',
    ].map(escapeCsvValue);
  });

  // Assemblage du CSV
  return [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');
}
