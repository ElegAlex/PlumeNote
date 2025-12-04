// ===========================================
// Routes Tags (EP-007)
// US-062: Recherche par tags
// US-063: Nuage de tags
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const tagsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/tags
   * Liste tous les tags avec comptage
   */
  app.get('/', {
    schema: {
      tags: ['Tags'],
      summary: 'List all tags with usage count',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        noteCount: t._count.notes,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /api/v1/tags/cloud
   * US-063: Nuage de tags
   */
  app.get('/cloud', {
    schema: {
      tags: ['Tags'],
      summary: 'Get tag cloud data',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: {
        notes: { _count: 'desc' },
      },
      take: 50,
    });

    // Calculer les poids pour le nuage
    const maxCount = Math.max(...tags.map((t) => t._count.notes), 1);
    const minCount = Math.min(...tags.map((t) => t._count.notes), 0);
    const range = maxCount - minCount || 1;

    return {
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: t._count.notes,
        weight: ((t._count.notes - minCount) / range) * 4 + 1, // 1-5 scale
      })),
    };
  });

  /**
   * GET /api/v1/tags/:id/notes
   * Notes avec un tag spécifique
   */
  app.get('/:id/notes', {
    schema: {
      tags: ['Tags'],
      summary: 'Get notes with specific tag',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = request.query as {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    };

    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Tag not found',
      });
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: {
          isDeleted: false,
          tags: { some: { tagId: id } },
        },
        include: {
          author: { select: { displayName: true } },
          folder: { select: { path: true, name: true } },
        },
        orderBy: { [sort]: order },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.note.count({
        where: {
          isDeleted: false,
          tags: { some: { tagId: id } },
        },
      }),
    ]);

    return {
      tag,
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        folderPath: `${n.folder.path}${n.folder.name}`,
        authorName: n.author.displayName,
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  /**
   * POST /api/v1/tags
   * Créer un tag
   */
  app.post('/', {
    schema: {
      tags: ['Tags'],
      summary: 'Create a new tag',
      security: [{ cookieAuth: [] }],
    },
    preHandler: [app.authorizeEditor],
  }, async (request, reply) => {
    const parseResult = createTagSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { name, color } = parseResult.data;

    // Vérifier l'unicité
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return reply.status(409).send({
        error: 'CONFLICT',
        message: 'Tag already exists',
      });
    }

    const tag = await prisma.tag.create({
      data: { name, color },
    });

    return reply.status(201).send(tag);
  });

  /**
   * PATCH /api/v1/tags/:id
   * Modifier un tag
   */
  app.patch('/:id', {
    schema: {
      tags: ['Tags'],
      summary: 'Update tag',
      security: [{ cookieAuth: [] }],
    },
    preHandler: [app.authorizeAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parseResult = createTagSchema.partial().safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: parseResult.data,
    });

    return tag;
  });

  /**
   * DELETE /api/v1/tags/:id
   * Supprimer un tag
   */
  app.delete('/:id', {
    schema: {
      tags: ['Tags'],
      summary: 'Delete tag',
      security: [{ cookieAuth: [] }],
    },
    preHandler: [app.authorizeAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.tag.delete({ where: { id } });

    return { success: true };
  });
};
