// ===========================================
// Routes Permissions (EP-008)
// US-070: Permissions dossier
// US-071: Permissions note
// US-072: Visualisation accès
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import type { ResourceType, PermissionLevel } from '@plumenote/types';
import { checkPermission, grantPermission, revokePermission } from '../services/permissions.js';
import { createAuditLog } from '../services/audit.js';

const setPermissionSchema = z.object({
  principalType: z.enum(['USER', 'ROLE']),
  principalId: z.string().uuid(),
  level: z.enum(['NONE', 'READ', 'WRITE', 'ADMIN']),
});

export const permissionsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/permissions/:resourceType/:resourceId
   * US-072: Voir les permissions d'une ressource
   */
  app.get('/:resourceType/:resourceId', {
    schema: {
      tags: ['Permissions'],
      summary: 'Get permissions for a resource',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { resourceType, resourceId } = request.params as {
      resourceType: string;
      resourceId: string;
    };

    const type = resourceType.toUpperCase() as ResourceType;
    const userId = request.user.userId;

    // Vérifier que l'utilisateur peut voir les permissions
    const hasPermission = await checkPermission(userId, type, resourceId, 'ADMIN');
    if (!hasPermission && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas accès aux permissions de cette ressource",
      });
    }

    const permissions = await prisma.permission.findMany({
      where: {
        resourceType: type,
        resourceId,
      },
      include: {
        grantedByUser: {
          select: { displayName: true },
        },
      },
    });

    // Enrichir avec les infos du principal
    const enriched = await Promise.all(
      permissions.map(async (p) => {
        let principalName = '';

        if (p.principalType === 'USER') {
          const user = await prisma.user.findUnique({
            where: { id: p.principalId },
            select: { displayName: true, username: true },
          });
          principalName = user?.displayName || user?.username || 'Unknown';
        } else {
          const role = await prisma.role.findUnique({
            where: { id: p.principalId },
            select: { name: true },
          });
          principalName = role?.name || 'Unknown';
        }

        return {
          id: p.id,
          principalType: p.principalType,
          principalId: p.principalId,
          principalName,
          level: p.level,
          inherited: p.inherited,
          grantedBy: p.grantedByUser.displayName,
          grantedAt: p.grantedAt.toISOString(),
        };
      })
    );

    return { permissions: enriched };
  });

  /**
   * POST /api/v1/permissions/:resourceType/:resourceId
   * Attribuer une permission
   */
  app.post('/:resourceType/:resourceId', {
    schema: {
      tags: ['Permissions'],
      summary: 'Grant permission on a resource',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { resourceType, resourceId } = request.params as {
      resourceType: string;
      resourceId: string;
    };

    const type = resourceType.toUpperCase() as ResourceType;
    const userId = request.user.userId;

    // Vérifier que l'utilisateur peut modifier les permissions
    const hasPermission = await checkPermission(userId, type, resourceId, 'ADMIN');
    if (!hasPermission && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas le droit de modifier les permissions",
      });
    }

    const parseResult = setPermissionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { principalType, principalId, level } = parseResult.data;

    await grantPermission({
      resourceType: type,
      resourceId,
      principalType,
      principalId,
      level: level as PermissionLevel,
      grantedBy: userId,
    });

    await createAuditLog({
      userId,
      action: 'PERMISSION_GRANTED',
      resourceType: type,
      resourceId,
      details: { principalType, principalId, level },
      ipAddress: request.ip,
    });

    return { success: true };
  });

  /**
   * DELETE /api/v1/permissions/:resourceType/:resourceId/:principalType/:principalId
   * Révoquer une permission
   */
  app.delete('/:resourceType/:resourceId/:principalType/:principalId', {
    schema: {
      tags: ['Permissions'],
      summary: 'Revoke permission',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { resourceType, resourceId, principalType, principalId } = request.params as {
      resourceType: string;
      resourceId: string;
      principalType: string;
      principalId: string;
    };

    const type = resourceType.toUpperCase() as ResourceType;
    const pType = principalType.toUpperCase() as 'USER' | 'ROLE';
    const userId = request.user.userId;

    // Vérifier que l'utilisateur peut modifier les permissions
    const hasPermission = await checkPermission(userId, type, resourceId, 'ADMIN');
    if (!hasPermission && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas le droit de modifier les permissions",
      });
    }

    await revokePermission({
      resourceType: type,
      resourceId,
      principalType: pType,
      principalId,
    });

    await createAuditLog({
      userId,
      action: 'PERMISSION_REVOKED',
      resourceType: type,
      resourceId,
      details: { principalType: pType, principalId },
      ipAddress: request.ip,
    });

    return { success: true };
  });

  /**
   * GET /api/v1/permissions/my-access
   * US-072: Voir mes propres permissions
   */
  app.get('/my-access', {
    schema: {
      tags: ['Permissions'],
      summary: 'Get current user effective permissions',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    // Permissions directes
    const directPermissions = await prisma.permission.findMany({
      where: {
        OR: [
          { principalType: 'USER', principalId: userId },
          { principalType: 'ROLE', principalId: user?.roleId },
        ],
      },
    });

    // Grouper par ressource
    const byResource = new Map<string, { type: ResourceType; level: PermissionLevel }>();

    for (const p of directPermissions) {
      const key = `${p.resourceType}:${p.resourceId}`;
      const existing = byResource.get(key);

      // Garder le niveau le plus élevé
      if (!existing || compareLevel(p.level as PermissionLevel, existing.level) > 0) {
        byResource.set(key, {
          type: p.resourceType as ResourceType,
          level: p.level as PermissionLevel,
        });
      }
    }

    return {
      role: user?.role.name,
      isAdmin: user?.role.name === 'admin',
      permissions: Array.from(byResource.entries()).map(([key, value]) => {
        const [resourceType, resourceId] = key.split(':');
        return { resourceType, resourceId, level: value.level };
      }),
    };
  });
};

function compareLevel(a: PermissionLevel, b: PermissionLevel): number {
  const order: Record<PermissionLevel, number> = {
    NONE: 0,
    READ: 1,
    WRITE: 2,
    ADMIN: 3,
  };
  return order[a] - order[b];
}
