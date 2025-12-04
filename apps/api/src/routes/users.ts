// ===========================================
// Routes Utilisateurs (EP-001)
// US-003: Profil utilisateur
// US-004: Gestion utilisateurs (Admin)
// US-005: Gestion des rôles
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { createAuditLog } from '../services/audit.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  preferences: z.record(z.unknown()).optional(),
});

const updateUserSchema = z.object({
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/users - Liste des utilisateurs (Admin)
  app.get('/', {
    schema: {
      tags: ['Users'],
      summary: 'List all users (Admin only)',
      security: [{ cookieAuth: [] }],
    },
    preHandler: [app.authorizeAdmin],
  }, async (request) => {
    const { search, roleId, isActive, page = 1, limit = 20 } = request.query as {
      search?: string;
      roleId?: string;
      isActive?: string;
      page?: number;
      limit?: number;
    };

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) where.roleId = roleId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { displayName: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        ...u,
        password: undefined,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString(),
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET /api/v1/users/:id - Détail utilisateur
  app.get('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Un utilisateur ne peut voir que son propre profil, sauf admin
    if (request.user.userId !== id && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      ...user,
      password: undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };
  });

  // PATCH /api/v1/users/:id - Modifier profil
  app.patch('/:id', {
    schema: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const isAdmin = request.user.role === 'admin';
    const isSelf = request.user.userId === id;

    if (!isSelf && !isAdmin) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    // Profil personnel ou modifications admin
    if (isSelf && !isAdmin) {
      const parseResult = updateProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        });
      }

      const user = await prisma.user.update({
        where: { id },
        data: parseResult.data,
        include: { role: true },
      });

      return {
        ...user,
        password: undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    }

    // Modifications admin
    const parseResult = updateUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const oldUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    const user = await prisma.user.update({
      where: { id },
      data: parseResult.data,
      include: { role: true },
    });

    // Log des changements importants
    if (parseResult.data.roleId && parseResult.data.roleId !== oldUser?.roleId) {
      await createAuditLog({
        userId: request.user.userId,
        action: 'ROLE_CHANGED',
        resourceType: 'USER',
        resourceId: id,
        details: {
          oldRole: oldUser?.role.name,
          newRole: user.role.name,
        },
        ipAddress: request.ip,
      });
    }

    if (parseResult.data.isActive !== undefined && parseResult.data.isActive !== oldUser?.isActive) {
      await createAuditLog({
        userId: request.user.userId,
        action: parseResult.data.isActive ? 'USER_ENABLED' : 'USER_DISABLED',
        resourceType: 'USER',
        resourceId: id,
        ipAddress: request.ip,
      });

      // Invalider les sessions si désactivation
      if (!parseResult.data.isActive) {
        await prisma.session.deleteMany({ where: { userId: id } });
      }
    }

    return {
      ...user,
      password: undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  });

  // GET /api/v1/users/roles - Liste des rôles
  app.get('/roles', {
    schema: {
      tags: ['Users'],
      summary: 'List all roles',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    return { roles };
  });
};
