// ===========================================
// Routes Events autonomes
// Événements calendrier découplés des notes
// avec relation many-to-many vers les notes
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import type { EventType as PrismaEventType } from '@prisma/client';

// ----- Schémas de validation -----

const eventTypeSchema = z.enum(['DEADLINE', 'EVENT', 'PERIOD']);

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  type: eventTypeSchema.default('EVENT'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  allDay: z.boolean().optional().default(true),
}).refine(
  (data) => {
    // Pour les périodes, endDate est obligatoire
    if (data.type === 'PERIOD') {
      return !!data.endDate;
    }
    return true;
  },
  { message: 'endDate is required for PERIOD type', path: ['endDate'] }
).refine(
  (data) => {
    // endDate doit être >= startDate
    if (data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  { message: 'endDate must be after or equal to startDate', path: ['endDate'] }
);

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: eventTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  allDay: z.boolean().optional(),
});

const linkNoteSchema = z.object({
  noteId: z.string().uuid(),
});

const eventParamsSchema = z.object({
  id: z.string().uuid(),
});

const unlinkNoteParamsSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid(),
});

const getEventsQuerySchema = z.object({
  from: z.string().optional(), // Format YYYY-MM-DD ou ISO datetime
  to: z.string().optional(),   // Format YYYY-MM-DD ou ISO datetime
  type: z.string().optional(), // Peut être "EVENT,DEADLINE,PERIOD"
  limit: z.string().optional().default('100'),
});

// ----- Types -----

type CreateEventInput = z.infer<typeof createEventSchema>;
type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ----- Helpers -----

function formatEventResponse(event: {
  id: string;
  title: string;
  description: string | null;
  type: PrismaEventType;
  startDate: Date;
  endDate: Date | null;
  color: string | null;
  allDay: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; displayName: string; email: string };
  linkedNotes?: Array<{
    id: string;
    noteId: string;
    linkedAt: Date;
    note: { id: string; title: string; slug: string; updatedAt: Date };
  }>;
}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type.toLowerCase() as 'deadline' | 'event' | 'period',
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    color: event.color,
    allDay: event.allDay,
    createdById: event.createdById,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    createdBy: event.createdBy ? {
      id: event.createdBy.id,
      name: event.createdBy.displayName,
      email: event.createdBy.email,
    } : undefined,
    linkedNotes: event.linkedNotes?.map((ln) => ({
      id: ln.id,
      noteId: ln.noteId,
      linkedAt: ln.linkedAt.toISOString(),
      note: {
        id: ln.note.id,
        title: ln.note.title,
        slug: ln.note.slug,
        updatedAt: ln.note.updatedAt.toISOString(),
      },
    })),
  };
}

// ----- Routes -----

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/events/upcoming
   * Récupérer les prochains événements (widget homepage)
   * Note: Cette route doit être avant /:id pour éviter collision
   */
  app.get('/upcoming', {
    schema: {
      tags: ['Events'],
      summary: 'Get upcoming events',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { limit = '5' } = request.query as { limit?: string };
    const maxLimit = Math.min(parseInt(limit, 10) || 5, 20);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await prisma.event.findMany({
      where: {
        startDate: { gte: today },
      },
      include: {
        linkedNotes: {
          include: {
            note: {
              select: { id: true, title: true, slug: true, updatedAt: true },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: maxLimit,
    });

    return {
      events: events.map(formatEventResponse),
    };
  });

  /**
   * GET /api/v1/events
   * Récupérer les événements autonomes avec filtres optionnels
   */
  app.get('/', {
    schema: {
      tags: ['Events'],
      summary: 'List autonomous calendar events',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const query = getEventsQuerySchema.parse(request.query);
    const maxLimit = Math.min(parseInt(query.limit, 10) || 100, 500);

    // Parser les types (peut être "EVENT,DEADLINE,PERIOD")
    const allowedTypes = query.type
      ? query.type.split(',').map((t) => t.trim().toUpperCase() as PrismaEventType)
      : undefined;

    const where: Parameters<typeof prisma.event.findMany>[0]['where'] = {};

    if (query.from) {
      where.startDate = { gte: new Date(query.from) };
    }
    if (query.to) {
      where.startDate = {
        ...where.startDate,
        lte: new Date(query.to),
      };
    }
    if (allowedTypes && allowedTypes.length > 0) {
      where.type = { in: allowedTypes };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        linkedNotes: {
          include: {
            note: {
              select: { id: true, title: true, slug: true, updatedAt: true },
            },
          },
          orderBy: { linkedAt: 'desc' },
        },
      },
      orderBy: { startDate: 'asc' },
      take: maxLimit,
    });

    return {
      events: events.map(formatEventResponse),
    };
  });

  /**
   * GET /api/v1/events/:id
   * Récupérer un événement avec ses notes liées
   */
  app.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Get event details with linked notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = eventParamsSchema.parse(request.params);

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        linkedNotes: {
          include: {
            note: {
              select: { id: true, title: true, slug: true, updatedAt: true },
            },
          },
          orderBy: { linkedAt: 'desc' },
        },
      },
    });

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    return formatEventResponse(event);
  });

  /**
   * POST /api/v1/events
   * Créer un événement autonome
   */
  app.post('/', {
    schema: {
      tags: ['Events'],
      summary: 'Create autonomous event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const data = createEventSchema.parse(request.body);
    const userId = request.user.userId;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        color: data.color ?? '#3b82f6',
        allDay: data.allDay,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        linkedNotes: {
          include: {
            note: {
              select: { id: true, title: true, slug: true, updatedAt: true },
            },
          },
        },
      },
    });

    return reply.status(201).send(formatEventResponse(event));
  });

  /**
   * PUT /api/v1/events/:id
   * Modifier un événement
   */
  app.put<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Update event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = eventParamsSchema.parse(request.params);
    const data = updateEventSchema.parse(request.body);

    // Vérifier que l'event existe
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Construire les données de mise à jour
    const updateData: Parameters<typeof prisma.event.update>[0]['data'] = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.allDay !== undefined) updateData.allDay = data.allDay;

    // Validation: période nécessite endDate
    const finalType = data.type ?? existingEvent.type;
    const finalEndDate = data.endDate !== undefined
      ? (data.endDate ? new Date(data.endDate) : null)
      : existingEvent.endDate;

    if (finalType === 'PERIOD' && !finalEndDate) {
      return reply.status(400).send({ error: 'endDate is required for PERIOD type' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        linkedNotes: {
          include: {
            note: {
              select: { id: true, title: true, slug: true, updatedAt: true },
            },
          },
        },
      },
    });

    return formatEventResponse(event);
  });

  /**
   * DELETE /api/v1/events/:id
   * Supprimer un événement
   */
  app.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['Events'],
      summary: 'Delete event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = eventParamsSchema.parse(request.params);

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    await prisma.event.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  /**
   * POST /api/v1/events/:id/notes
   * Lier une note à un événement
   */
  app.post<{ Params: { id: string } }>('/:id/notes', {
    schema: {
      tags: ['Events'],
      summary: 'Link note to event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = eventParamsSchema.parse(request.params);
    const { noteId } = linkNoteSchema.parse(request.body);
    const userId = request.user.userId;

    // Vérifier que l'event existe
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Vérifier que la note existe
    const note = await prisma.note.findFirst({
      where: { id: noteId, isDeleted: false },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Vérifier que la liaison n'existe pas déjà
    const existingLink = await prisma.eventNote.findUnique({
      where: { eventId_noteId: { eventId: id, noteId } },
    });

    if (existingLink) {
      return reply.status(409).send({ error: 'Note is already linked to this event' });
    }

    const eventNote = await prisma.eventNote.create({
      data: {
        eventId: id,
        noteId,
        linkedById: userId,
      },
      include: {
        note: {
          select: { id: true, title: true, slug: true, updatedAt: true },
        },
      },
    });

    return reply.status(201).send({
      id: eventNote.id,
      eventId: eventNote.eventId,
      noteId: eventNote.noteId,
      linkedAt: eventNote.linkedAt.toISOString(),
      note: {
        id: eventNote.note.id,
        title: eventNote.note.title,
        slug: eventNote.note.slug,
        updatedAt: eventNote.note.updatedAt.toISOString(),
      },
    });
  });

  /**
   * DELETE /api/v1/events/:id/notes/:noteId
   * Délier une note d'un événement
   */
  app.delete<{ Params: { id: string; noteId: string } }>('/:id/notes/:noteId', {
    schema: {
      tags: ['Events'],
      summary: 'Unlink note from event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id, noteId } = unlinkNoteParamsSchema.parse(request.params);

    const existingLink = await prisma.eventNote.findUnique({
      where: { eventId_noteId: { eventId: id, noteId } },
    });

    if (!existingLink) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    await prisma.eventNote.delete({
      where: { eventId_noteId: { eventId: id, noteId } },
    });

    return reply.status(204).send();
  });
};

// ----- Routes additionnelles pour les notes -----

/**
 * Routes à ajouter dans notes.ts ou noteEvents.ts
 * GET /api/v1/notes/:id/events - Récupérer les events liés à une note
 */
export const noteEventsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/notes/:noteId/events
   * Récupérer les événements liés à une note
   */
  app.get<{ Params: { noteId: string } }>('/:noteId/events', {
    schema: {
      tags: ['Notes', 'Events'],
      summary: 'Get events linked to a note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { noteId } = request.params;

    // Vérifier que la note existe
    const note = await prisma.note.findFirst({
      where: { id: noteId, isDeleted: false },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const eventNotes = await prisma.eventNote.findMany({
      where: { noteId },
      include: {
        event: {
          include: {
            createdBy: {
              select: { id: true, displayName: true, email: true },
            },
          },
        },
      },
      orderBy: { event: { startDate: 'asc' } },
    });

    return {
      events: eventNotes.map((en) => formatEventResponse(en.event)),
    };
  });
};
