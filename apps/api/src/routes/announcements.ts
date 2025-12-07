// ===========================================
// Routes Announcements (US-045)
// Annonces admin affichées sur la homepage
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';

// Schema de validation
const createAnnouncementSchema = z.object({
  message: z.string().min(1).max(500),
  type: z.enum(['info', 'warning', 'danger']).default('info'),
  dismissible: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/announcements
   * US-045: Liste des annonces actives
   */
  app.get('/', {
    schema: {
      tags: ['Announcements'],
      summary: 'Get active announcements',
      security: [{ cookieAuth: [] }],
    },
  }, async () => {
    const now = new Date();

    // Vérifier si la table existe, sinon retourner un tableau vide
    try {
      const announcements = await prisma.announcement.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        announcements: announcements.map((a) => ({
          id: a.id,
          message: a.message,
          type: a.type,
          dismissible: a.dismissible,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    } catch {
      // Table n'existe pas encore, retourner vide
      return { announcements: [] };
    }
  });

  /**
   * POST /api/v1/announcements
   * US-045: Créer une annonce (admin uniquement)
   */
  app.post('/', {
    schema: {
      tags: ['Announcements'],
      summary: 'Create announcement (admin only)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    // Vérifier que l'utilisateur est admin
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Only admins can create announcements',
      });
    }

    const parseResult = createAnnouncementSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid announcement data',
        details: parseResult.error.flatten(),
      });
    }

    try {
      const announcement = await prisma.announcement.create({
        data: {
          message: parseResult.data.message,
          type: parseResult.data.type,
          dismissible: parseResult.data.dismissible,
          expiresAt: parseResult.data.expiresAt
            ? new Date(parseResult.data.expiresAt)
            : null,
          createdById: request.user.userId,
        },
      });

      return reply.status(201).send({
        id: announcement.id,
        message: announcement.message,
        type: announcement.type,
        dismissible: announcement.dismissible,
        createdAt: announcement.createdAt.toISOString(),
      });
    } catch {
      return reply.status(500).send({
        error: 'SERVER_ERROR',
        message: 'Failed to create announcement',
      });
    }
  });

  /**
   * DELETE /api/v1/announcements/:id
   * US-045: Supprimer une annonce (admin uniquement)
   */
  app.delete('/:id', {
    schema: {
      tags: ['Announcements'],
      summary: 'Delete announcement (admin only)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Only admins can delete announcements',
      });
    }

    const { id } = request.params as { id: string };

    try {
      await prisma.announcement.delete({
        where: { id },
      });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Announcement not found',
      });
    }
  });
};
