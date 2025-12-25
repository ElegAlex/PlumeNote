// ===========================================
// Routes Templates de Notes (Sprint 8)
// CRUD pour les templates de notes
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';

// ----- Schémas de validation -----

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: z.string(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).default('general'),
  isPublic: z.boolean().default(false),
  properties: z.record(z.unknown()).default({}),
});

const updateTemplateSchema = createTemplateSchema.partial();

// ----- Routes -----

export const templatesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/templates
   * Liste tous les templates accessibles
   */
  app.get('/', {
    schema: {
      tags: ['Templates'],
      summary: 'List all accessible templates',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const templates = await prisma.noteTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { isBuiltIn: true },
          { createdById: userId },
        ],
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Grouper par catégorie
    const grouped = templates.reduce((acc, template) => {
      const cat = template.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        id: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        isBuiltIn: template.isBuiltIn,
        isPublic: template.isPublic,
        isOwner: template.createdById === userId,
        createdBy: template.createdBy?.displayName || null,
      });
      return acc;
    }, {} as Record<string, typeof templates>);

    return { templates, grouped };
  });

  /**
   * GET /api/v1/templates/:id
   * Détail d'un template
   */
  app.get('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Get template by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const template = await prisma.noteTemplate.findFirst({
      where: {
        id,
        OR: [
          { isPublic: true },
          { isBuiltIn: true },
          { createdById: userId },
        ],
      },
    });

    if (!template) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Template non trouvé',
      });
    }

    return template;
  });

  /**
   * POST /api/v1/templates
   * Créer un nouveau template
   */
  app.post('/', {
    schema: {
      tags: ['Templates'],
      summary: 'Create a new template',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = createTemplateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const userId = request.user.userId;
    const data = parseResult.data;

    const template = await prisma.noteTemplate.create({
      data: {
        ...data,
        createdById: userId,
      },
    });

    return reply.status(201).send(template);
  });

  /**
   * PATCH /api/v1/templates/:id
   * Modifier un template
   */
  app.patch('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Update a template',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Vérifier que le template existe
    const existing = await prisma.noteTemplate.findFirst({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Template non trouvé',
      });
    }

    const parseResult = updateTemplateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const template = await prisma.noteTemplate.update({
      where: { id },
      data: parseResult.data,
    });

    return template;
  });

  /**
   * DELETE /api/v1/templates/:id
   * Supprimer un template
   */
  app.delete('/:id', {
    schema: {
      tags: ['Templates'],
      summary: 'Delete a template',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.noteTemplate.findFirst({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Template non trouvé',
      });
    }

    await prisma.noteTemplate.delete({ where: { id } });

    return reply.status(204).send();
  });
};
