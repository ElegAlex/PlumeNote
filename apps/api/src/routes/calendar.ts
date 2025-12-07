// ===========================================
// Routes Calendar (US-043 + P2 + P3)
// Extraction d'événements depuis le frontmatter/metadata
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import type { CalendarEvent, CalendarEventType } from '@plumenote/types';

// Types d'événements extraits
type EventType = 'event' | 'deadline' | 'task' | 'period-start' | 'period-end';

// Configuration des champs de date reconnus
const DATE_FIELD_CONFIG: Array<{
  key: string;
  type: EventType;
  priority: number;
}> = [
  // P2: Nouveaux champs standardisés
  { key: 'event_date', type: 'event', priority: 1 },
  { key: 'due_date', type: 'deadline', priority: 2 },
  { key: 'start_date', type: 'event', priority: 3 },
  { key: 'end_date', type: 'event', priority: 4 },
  // Compatibilité avec les anciens champs
  { key: 'date', type: 'event', priority: 5 },
  { key: 'due', type: 'deadline', priority: 6 },
  { key: 'deadline', type: 'deadline', priority: 7 },
  { key: 'dueDate', type: 'deadline', priority: 8 },
  { key: 'deadlineDate', type: 'deadline', priority: 9 },
];

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/calendar/events
   * US-043 + P2: Récupérer les événements depuis les métadonnées des notes
   * Extrait les champs: event_date, due_date, start_date, end_date, date, due, deadline
   */
  app.get('/events', {
    schema: {
      tags: ['Calendar'],
      summary: 'Get calendar events from notes metadata',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { from, to, type, limit = '100' } = request.query as {
      from?: string;
      to?: string;
      type?: string; // Peut être une liste séparée par virgules
      limit?: string;
    };
    const maxLimit = Math.min(parseInt(limit, 10) || 100, 500);

    // Parser les types (peut être "event,deadline,period-start")
    const allowedTypes = type ? type.split(',').map(t => t.trim()) : null;

    // Récupérer les notes avec frontmatter contenant des dates
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        frontmatter: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        frontmatter: true,
        folder: {
          select: { path: true },
        },
      },
    });

    const events: CalendarEvent[] = [];

    // Extraire les événements de chaque note
    for (const note of notes) {
      const fm = note.frontmatter as Record<string, unknown> | null;
      if (!fm) continue;

      for (const { key, type: eventType, priority } of DATE_FIELD_CONFIG) {
        const value = fm[key];
        if (!value) continue;

        // Filtrer par type si spécifié
        if (allowedTypes && !allowedTypes.includes(eventType)) continue;

        // Parser la date
        const dateResult = parseDate(value);
        if (!dateResult) continue;

        const { date, time } = dateResult;

        // Filtrer par plage
        if (from && date < new Date(from)) continue;
        if (to && date > new Date(to)) continue;

        // Extraire les métadonnées additionnelles
        const status = typeof fm.status === 'string' ? fm.status : undefined;
        const color = typeof fm.color === 'string' ? fm.color : undefined;
        const eventTitle = typeof fm.event_title === 'string' ? fm.event_title : note.title;

        events.push({
          id: `${note.id}-${key}`,
          noteId: note.id,
          noteTitle: eventTitle,
          noteSlug: note.slug,
          date: date.toISOString().split('T')[0],
          time,
          endDate: key === 'start_date' && fm.end_date
            ? parseDate(fm.end_date)?.date.toISOString().split('T')[0]
            : undefined,
          type: eventType,
          status,
          color,
        });
      }
    }

    // Trier par date puis par priorité du champ
    events.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // À date égale, prioriser par type
      const typeOrder: Record<EventType, number> = { deadline: 1, task: 2, event: 3 };
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });

    return { events: events.slice(0, maxLimit) };
  });

  /**
   * GET /api/v1/calendar/upcoming
   * P2: Récupérer les prochains événements (widget homepage)
   */
  app.get('/upcoming', {
    schema: {
      tags: ['Calendar'],
      summary: 'Get upcoming events',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { limit = '5' } = request.query as { limit?: string };
    const maxLimit = Math.min(parseInt(limit, 10) || 5, 20);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Récupérer les notes avec des dates futures
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        frontmatter: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        frontmatter: true,
      },
    });

    const events: CalendarEvent[] = [];

    for (const note of notes) {
      const fm = note.frontmatter as Record<string, unknown> | null;
      if (!fm) continue;

      for (const { key, type: eventType } of DATE_FIELD_CONFIG) {
        const value = fm[key];
        if (!value) continue;

        const dateResult = parseDate(value);
        if (!dateResult) continue;

        const dateStr = dateResult.date.toISOString().split('T')[0];
        if (dateStr < todayStr) continue;

        const eventTitle = typeof fm.event_title === 'string' ? fm.event_title : note.title;

        events.push({
          id: `${note.id}-${key}`,
          noteId: note.id,
          noteTitle: eventTitle,
          noteSlug: note.slug,
          date: dateStr,
          time: dateResult.time,
          type: eventType,
          status: typeof fm.status === 'string' ? fm.status : undefined,
        });
      }
    }

    // Trier par date et limiter
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { events: events.slice(0, maxLimit) };
  });

  /**
   * GET /api/v1/calendar/by-month/:year/:month
   * P2: Récupérer les événements d'un mois spécifique
   */
  app.get('/by-month/:year/:month', {
    schema: {
      tags: ['Calendar'],
      summary: 'Get events for a specific month',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { year, month } = request.params as { year: string; month: string };

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { error: 'Invalid year or month', events: [] };
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Réutiliser le endpoint /events avec les paramètres from/to
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        frontmatter: { not: null },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        frontmatter: true,
      },
    });

    const events: CalendarEvent[] = [];

    for (const note of notes) {
      const fm = note.frontmatter as Record<string, unknown> | null;
      if (!fm) continue;

      for (const { key, type: eventType } of DATE_FIELD_CONFIG) {
        const value = fm[key];
        if (!value) continue;

        const dateResult = parseDate(value);
        if (!dateResult) continue;

        if (dateResult.date < startDate || dateResult.date > endDate) continue;

        const eventTitle = typeof fm.event_title === 'string' ? fm.event_title : note.title;

        events.push({
          id: `${note.id}-${key}`,
          noteId: note.id,
          noteTitle: eventTitle,
          noteSlug: note.slug,
          date: dateResult.date.toISOString().split('T')[0],
          time: dateResult.time,
          type: eventType,
          status: typeof fm.status === 'string' ? fm.status : undefined,
        });
      }
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      year: yearNum,
      month: monthNum,
      events,
    };
  });

  // ===========================================
  // P3: Endpoints étendus pour le calendrier complet
  // ===========================================

  /**
   * GET /api/v1/calendar/events/:id
   * P3: Détail d'un événement
   */
  app.get('/events/:id', {
    schema: {
      tags: ['Calendar'],
      summary: 'Get event details',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // L'eventId est au format "noteId-fieldKey"
    const [noteId, fieldKey] = id.split('-');

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        isDeleted: false,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const meta = note.frontmatter as Record<string, unknown> | null;
    if (!meta) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const dateField = `${fieldKey}_date`;
    const dateValue = meta[dateField] as string | undefined;

    if (!dateValue) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const eventType = getEventTypeForField(fieldKey);

    return {
      id,
      title: (meta.event_title as string) || note.title,
      date: dateValue.split('T')[0],
      time: dateValue.includes('T') ? dateValue.split('T')[1].substring(0, 5) : undefined,
      noteId: note.id,
      noteTitle: note.title,
      type: eventType,
      description: meta.description as string | undefined,
      status: meta.status as string | undefined,
      priority: meta.priority as string | undefined,
      tags: meta.tags as string[] | undefined,
      folder: {
        id: note.folder?.id ?? '',
        name: note.folder?.name ?? '',
        path: note.folder?.path ?? '',
      },
      owner: {
        id: note.author.id,
        name: note.author.displayName,
        email: note.author.email,
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  });

  /**
   * PATCH /api/v1/calendar/events/:id/date
   * P3: Modifier la date d'un événement
   */
  app.patch('/events/:id/date', {
    schema: {
      tags: ['Calendar'],
      summary: 'Update event date',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { newDate: string; field?: string };

    const [noteId, fieldKey] = id.split('-');
    const dateField = body.field || `${fieldKey}_date`;

    const note = await prisma.note.findFirst({
      where: { id: noteId, isDeleted: false },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const currentMeta = (note.frontmatter ?? {}) as Record<string, unknown>;
    const oldDate = currentMeta[dateField] as string | undefined;

    // Préserver l'heure si elle existait
    let finalDate = body.newDate;
    if (oldDate && oldDate.includes('T') && !body.newDate.includes('T')) {
      const oldTime = oldDate.split('T')[1];
      finalDate = `${body.newDate}T${oldTime}`;
    }

    // Mettre à jour
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        frontmatter: {
          ...currentMeta,
          [dateField]: finalDate,
        },
      },
      select: {
        id: true,
        title: true,
        frontmatter: true,
      },
    });

    const meta = updatedNote.frontmatter as Record<string, unknown>;

    return {
      id,
      title: (meta.event_title as string) || updatedNote.title,
      date: finalDate.split('T')[0],
      time: finalDate.includes('T') ? finalDate.split('T')[1].substring(0, 5) : undefined,
      noteId: updatedNote.id,
      noteTitle: updatedNote.title,
      type: getEventTypeForField(fieldKey),
    };
  });

  /**
   * POST /api/v1/calendar/quick-event
   * P3: Créer un événement rapide (nouvelle note avec date)
   */
  app.post('/quick-event', {
    schema: {
      tags: ['Calendar'],
      summary: 'Create quick event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user.userId;
    const body = request.body as {
      title: string;
      date: string;
      type?: CalendarEventType;
      folderId?: string;
    };

    const eventType = body.type || 'event';
    const dateField = getDateFieldForType(eventType);

    // Trouver un dossier par défaut si non spécifié
    let folderId = body.folderId;
    if (!folderId) {
      const defaultFolder = await prisma.folder.findFirst({
        where: { createdBy: userId },
        orderBy: { createdAt: 'asc' },
      });
      folderId = defaultFolder?.id;
    }

    // Si toujours pas de dossier, prendre le premier disponible
    if (!folderId) {
      const anyFolder = await prisma.folder.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      folderId = anyFolder?.id;
    }

    if (!folderId) {
      return reply.status(400).send({ error: 'No folder available' });
    }

    // Générer un slug unique (avec timestamp pour éviter les doublons)
    const baseSlug = body.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 180);
    const slug = `${baseSlug}-${Date.now()}`;

    // Créer la note
    const note = await prisma.note.create({
      data: {
        title: body.title,
        slug,
        authorId: userId,
        folderId,
        frontmatter: {
          [dateField]: body.date,
          event_title: body.title,
        },
      },
    });

    const idSuffix = dateField.replace('_date', '');

    return reply.status(201).send({
      note: {
        id: note.id,
        title: note.title,
      },
      event: {
        id: `${note.id}-${idSuffix}`,
        title: body.title,
        date: body.date.split('T')[0],
        time: body.date.includes('T') ? body.date.split('T')[1].substring(0, 5) : undefined,
        noteId: note.id,
        noteTitle: body.title,
        type: eventType,
      },
    });
  });

  /**
   * DELETE /api/v1/calendar/events/:eventId
   * Supprimer un événement (supprime la note associée)
   */
  app.delete('/events/:eventId', {
    schema: {
      tags: ['Calendar'],
      summary: 'Delete calendar event',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { eventId } = request.params as { eventId: string };

    // L'eventId est au format: noteId-fieldKey (ex: uuid-event_date, uuid-due_date)
    // UUID = 8-4-4-4-12 caractères = 36 caractères
    // Donc on cherche le dernier tiret après le 36ème caractère
    const uuidLength = 36;
    if (eventId.length <= uuidLength) {
      return reply.status(400).send({ error: 'Invalid event ID format' });
    }

    const noteId = eventId.substring(0, uuidLength);
    const fieldKey = eventId.substring(uuidLength + 1); // +1 pour le tiret

    // Vérifier que la note existe
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, isDeleted: true },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    if (note.isDeleted) {
      return reply.status(404).send({ error: 'Note already deleted' });
    }

    // Soft delete la note
    await prisma.note.update({
      where: { id: noteId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: request.user.userId,
      },
    });

    return reply.status(200).send({ success: true });
  });
};

// ----- Helpers -----

/**
 * Retourne le type d'événement pour un champ donné
 */
function getEventTypeForField(fieldKey: string): CalendarEventType {
  switch (fieldKey) {
    case 'due':
      return 'deadline';
    case 'event':
      return 'event';
    case 'start':
      return 'period-start';
    case 'end':
      return 'period-end';
    default:
      return 'event';
  }
}

/**
 * Retourne le champ de date pour un type d'événement
 */
function getDateFieldForType(type: CalendarEventType): string {
  switch (type) {
    case 'deadline':
      return 'due_date';
    case 'event':
      return 'event_date';
    case 'period-start':
      return 'start_date';
    case 'period-end':
      return 'end_date';
    default:
      return 'event_date';
  }
}

/**
 * Parse une valeur de date depuis le frontmatter
 */
function parseDate(value: unknown): { date: Date; time?: string } | null {
  if (!value) return null;

  let dateStr: string;
  if (typeof value === 'string') {
    dateStr = value;
  } else if (value instanceof Date) {
    return { date: value };
  } else {
    return null;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  // Extraire l'heure si présente
  let time: string | undefined;
  if (dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1];
    if (timePart) {
      time = timePart.substring(0, 5); // HH:mm
    }
  }

  return { date, time };
}
