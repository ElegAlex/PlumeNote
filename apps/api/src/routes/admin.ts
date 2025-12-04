// ===========================================
// Routes Administration (EP-012)
// US-110: Configuration générale
// US-112: Logs et audit
// US-113: Backup et restauration
// US-114: Statistiques d'usage
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { getAuditLogs, createAuditLog } from '../services/audit.js';

const configUpdateSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Toutes les routes admin nécessitent le rôle admin
  app.addHook('preHandler', app.authorizeAdmin);

  /**
   * GET /api/v1/admin/config
   * US-110: Récupérer la configuration
   */
  app.get('/config', {
    schema: {
      tags: ['Admin'],
      summary: 'Get system configuration',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const configs = await prisma.systemConfig.findMany();

    const configMap: Record<string, unknown> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    return { config: configMap };
  });

  /**
   * PUT /api/v1/admin/config
   * Mettre à jour la configuration
   */
  app.put('/config', {
    schema: {
      tags: ['Admin'],
      summary: 'Update system configuration',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = configUpdateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { key, value } = parseResult.data;

    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });

    return { success: true };
  });

  /**
   * GET /api/v1/admin/audit
   * US-112: Récupérer les logs d'audit
   */
  app.get('/audit', {
    schema: {
      tags: ['Admin'],
      summary: 'Get audit logs',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const {
      userId,
      action,
      resourceType,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
    } = request.query as {
      userId?: string;
      action?: string;
      resourceType?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    };

    const result = await getAuditLogs({
      userId,
      action: action as any,
      resourceType,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit,
      offset,
    });

    return {
      logs: result.logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
      total: result.total,
    };
  });

  /**
   * POST /api/v1/admin/backup
   * US-113: Créer un backup
   */
  app.post('/backup', {
    schema: {
      tags: ['Admin'],
      summary: 'Create a backup',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    // Récupérer toutes les données
    const [users, roles, folders, notes, tags, permissions] = await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true, email: true, displayName: true, roleId: true } }),
      prisma.role.findMany(),
      prisma.folder.findMany(),
      prisma.note.findMany({ where: { isDeleted: false } }),
      prisma.tag.findMany(),
      prisma.permission.findMany(),
    ]);

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        users: users.length,
        roles: roles.length,
        folders: folders.length,
        notes: notes.length,
        tags: tags.length,
        permissions: permissions.length,
      },
      // Dans une vraie implémentation, on génèrerait un fichier ZIP
      content: {
        roles,
        folders,
        notes: notes.map((n) => ({
          ...n,
          content: n.content, // En vrai, on exporterait les fichiers .md séparément
        })),
        tags,
      },
    };

    await createAuditLog({
      userId,
      action: 'BACKUP_CREATED',
      resourceType: 'SYSTEM',
      details: backup.data,
      ipAddress: request.ip,
    });

    return backup;
  });

  /**
   * GET /api/v1/admin/stats
   * US-114: Statistiques d'usage
   */
  app.get('/stats', {
    schema: {
      tags: ['Admin'],
      summary: 'Get usage statistics',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsersDay,
      activeUsersWeek,
      activeUsersMonth,
      totalNotes,
      notesCreatedWeek,
      notesModifiedWeek,
      totalFolders,
      topNotes,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { lastLoginAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
      prisma.note.count({ where: { isDeleted: false } }),
      prisma.note.count({ where: { createdAt: { gte: weekAgo }, isDeleted: false } }),
      prisma.note.count({ where: { updatedAt: { gte: weekAgo }, isDeleted: false } }),
      prisma.folder.count(),
      // Top notes les plus consultées (basé sur les versions/modifications comme proxy)
      prisma.note.findMany({
        where: { isDeleted: false },
        include: {
          _count: { select: { versions: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Calculer l'espace disque (approximatif)
    const contentSize = await prisma.note.aggregate({
      _sum: {
        // Pas de champ size, on utilise la longueur du contenu
      },
    });

    return {
      users: {
        total: totalUsers,
        activeDay: activeUsersDay,
        activeWeek: activeUsersWeek,
        activeMonth: activeUsersMonth,
      },
      content: {
        totalNotes,
        totalFolders,
        notesCreatedWeek,
        notesModifiedWeek,
      },
      topNotes: topNotes.map((n) => ({
        id: n.id,
        title: n.title,
        versionsCount: n._count.versions,
        updatedAt: n.updatedAt.toISOString(),
      })),
      generated: now.toISOString(),
    };
  });

  /**
   * GET /api/v1/admin/trash
   * Voir la corbeille
   */
  app.get('/trash', {
    schema: {
      tags: ['Admin'],
      summary: 'Get deleted notes',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const deletedNotes = await prisma.note.findMany({
      where: { isDeleted: true },
      include: {
        author: { select: { displayName: true } },
        deletedBy: { select: { displayName: true } },
        folder: { select: { path: true, name: true } },
      },
      orderBy: { deletedAt: 'desc' },
      take: 100,
    });

    return {
      notes: deletedNotes.map((n) => ({
        id: n.id,
        title: n.title,
        folderPath: `${n.folder.path}${n.folder.name}`,
        authorName: n.author.displayName,
        deletedBy: n.deletedBy?.displayName,
        deletedAt: n.deletedAt?.toISOString(),
      })),
    };
  });

  /**
   * DELETE /api/v1/admin/trash/:id
   * Supprimer définitivement une note
   */
  app.delete('/trash/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Permanently delete a note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || !note.isDeleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note not found in trash',
      });
    }

    // Suppression définitive
    await prisma.note.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'NOTE_DELETED',
      resourceType: 'NOTE',
      resourceId: id,
      details: { permanent: true, title: note.title },
      ipAddress: request.ip,
    });

    return { success: true };
  });

  /**
   * DELETE /api/v1/admin/trash
   * Vider la corbeille
   */
  app.delete('/trash', {
    schema: {
      tags: ['Admin'],
      summary: 'Empty trash',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const count = await prisma.note.count({ where: { isDeleted: true } });

    await prisma.note.deleteMany({ where: { isDeleted: true } });

    await createAuditLog({
      userId,
      action: 'NOTE_DELETED',
      resourceType: 'SYSTEM',
      details: { permanent: true, count },
      ipAddress: request.ip,
    });

    return { success: true, deletedCount: count };
  });
};
