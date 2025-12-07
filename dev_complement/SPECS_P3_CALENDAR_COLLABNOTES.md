# MODULE P3 : Page Calendrier Complète

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|**P3-Basse**|
|Complexité|L|
|Modules impactés|Frontend (calendar page, composants), Backend (calendar endpoints)|
|Estimation|4 jours-homme|
|Dépendances|Module P2 (Métadonnées)|

### Description

Implémentation d'une page calendrier complète permettant de visualiser et gérer les événements extraits des métadonnées des notes. Le calendrier offre plusieurs vues (mois, semaine, agenda) et permet de créer/modifier des événements directement depuis l'interface.

Cette page complète le widget calendrier de la homepage (P1) qui n'affiche que les 5 prochains événements.

### Critères d'acceptation

**Vues du calendrier :**

- [ ] Vue mensuelle avec grille de jours
- [ ] Vue hebdomadaire avec créneaux horaires
- [ ] Vue agenda (liste chronologique)
- [ ] Navigation entre les périodes (précédent/suivant/aujourd'hui)
- [ ] Sélecteur de date rapide

**Affichage des événements :**

- [ ] Événements extraits des métadonnées (`due_date`, `event_date`, `start_date`)
- [ ] Code couleur par type (deadline, event, task)
- [ ] Affichage du titre de la note ou du champ `event_title`
- [ ] Indicateur visuel pour les événements passés/futurs
- [ ] Tooltip avec détails au survol

**Interactions :**

- [ ] Clic sur un événement ouvre la note
- [ ] Clic sur un jour vide crée une nouvelle note avec date pré-remplie
- [ ] Drag & drop pour modifier la date d'un événement
- [ ] Double-clic pour création rapide

**Filtres :**

- [ ] Filtre par type d'événement (deadline, event, all)
- [ ] Filtre par tags
- [ ] Filtre par status (todo, in-progress, done)
- [ ] Filtre par dossier
- [ ] Recherche textuelle

**Responsive :**

- [ ] Adaptation mobile (vue agenda par défaut)
- [ ] Touch-friendly pour navigation

---

## 2. Analyse technique

### 2.1 Sources des événements

Les événements sont extraits des métadonnées des notes selon ces champs :

|Champ métadonnée|Type d'événement|Icône|Couleur|
|---|---|---|---|
|`due_date`|Deadline (échéance)|🎯|Rouge/Orange|
|`event_date`|Événement|📅|Bleu|
|`start_date`|Début de période|▶️|Vert|
|`end_date`|Fin de période|⏹️|Gris|

Une note peut générer plusieurs événements si elle contient plusieurs champs date.

### 2.2 Architecture de la solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CALENDAR PAGE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  HEADER                                                                 ││
│  │  ┌──────────────┐  ┌─────────────────────────┐  ┌───────────────────┐  ││
│  │  │ < Déc 2024 > │  │ Aujourd'hui             │  │ Mois│Sem│Agenda   │  ││
│  │  └──────────────┘  └─────────────────────────┘  └───────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │        SIDEBAR FILTERS             │  │       CALENDAR GRID          │  │
│  │                                    │  │                              │  │
│  │  Type d'événement                  │  │  Lu  Ma  Me  Je  Ve  Sa  Di  │  │
│  │  ☑ Deadlines                       │  │  ┌───┬───┬───┬───┬───┬───┬───┐│  │
│  │  ☑ Événements                      │  │  │   │   │   │   │   │   │ 1 ││  │
│  │  ☑ Périodes                        │  │  ├───┼───┼───┼───┼───┼───┼───┤│  │
│  │                                    │  │  │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 ││  │
│  │  Status                            │  │  │   │🎯 │   │📅 │   │   │   ││  │
│  │  ☑ À faire                         │  │  ├───┼───┼───┼───┼───┼───┼───┤│  │
│  │  ☑ En cours                        │  │  │ 9 │10 │11 │12 │13 │14 │15 ││  │
│  │  ☐ Terminé                         │  │  │📅 │   │🎯 │   │   │   │   ││  │
│  │                                    │  │  ├───┼───┼───┼───┼───┼───┼───┤│  │
│  │  Tags                              │  │  │16 │17 │18 │19 │20 │21 │22 ││  │
│  │  [meeting] [projet-x] [urgent]     │  │  │   │   │📅 │   │🎯 │   │   ││  │
│  │                                    │  │  └───┴───┴───┴───┴───┴───┴───┘│  │
│  │  Dossier                           │  │                              │  │
│  │  [▼ Tous les dossiers        ]     │  │                              │  │
│  │                                    │  │                              │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Flux de données

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Backend    │     │  CalendarStore  │     │   Components     │
│   API        │     │    (Zustand)    │     │                  │
└──────┬───────┘     └────────┬────────┘     └────────┬─────────┘
       │                      │                       │
       │  GET /calendar/      │                       │
       │  events?start&end    │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │  CalendarEvent[]     │                       │
       │─────────────────────>│                       │
       │                      │                       │
       │                      │  events, filters      │
       │                      │──────────────────────>│
       │                      │                       │
       │                      │  applyFilter()        │
       │                      │<──────────────────────│
       │                      │                       │
       │                      │  filteredEvents       │
       │                      │──────────────────────>│
       │                      │                       │
       │  PATCH /notes/:id    │  updateEventDate()    │
       │  {metadata}          │<──────────────────────│
       │<─────────────────────│                       │
       │                      │                       │
```

---

## 3. Spécifications détaillées

### 3.1 Backend (API Fastify)

#### Endpoints

|Méthode|Route|Description|Auth|
|---|---|---|---|
|GET|`/api/v1/calendar/events`|Événements dans une plage de dates|Oui|
|GET|`/api/v1/calendar/events/:id`|Détail d'un événement|Oui|
|PATCH|`/api/v1/calendar/events/:id/date`|Modifier la date d'un événement|Oui|
|POST|`/api/v1/calendar/quick-event`|Créer un événement rapide (note + metadata)|Oui|

#### calendar.controller.ts (extension)

```typescript
// apps/api/src/modules/calendar/calendar.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CalendarService } from './calendar.service';
import {
  GetEventsQuery,
  GetEventsQuerySchema,
  UpdateEventDateBody,
  UpdateEventDateBodySchema,
  CreateQuickEventBody,
  CreateQuickEventBodySchema,
  EventIdParams,
  EventIdParamsSchema
} from './calendar.schema';

export async function calendarController(fastify: FastifyInstance): Promise<void> {
  const calendarService = new CalendarService(fastify.prisma);

  // GET /api/v1/calendar/events - Liste des événements
  fastify.get<{ Querystring: GetEventsQuery }>(
    '/events',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetEventsQuerySchema },
      handler: async (request, reply) => {
        const userId = request.user.id;
        const { start, end, types, statuses, tags, folderId } = request.query;

        const events = await calendarService.getEvents(userId, {
          start,
          end,
          types: types?.split(','),
          statuses: statuses?.split(','),
          tags: tags?.split(','),
          folderId
        });

        return reply.send(events);
      }
    }
  );

  // GET /api/v1/calendar/events/:id - Détail d'un événement
  fastify.get<{ Params: EventIdParams }>(
    '/events/:id',
    {
      preHandler: [fastify.authenticate],
      schema: { params: EventIdParamsSchema },
      handler: async (request, reply) => {
        const { id } = request.params;
        const userId = request.user.id;

        const event = await calendarService.getEventById(id, userId);

        if (!event) {
          return reply.status(404).send({ error: 'Event not found' });
        }

        return reply.send(event);
      }
    }
  );

  // PATCH /api/v1/calendar/events/:id/date - Modifier la date
  fastify.patch<{ Params: EventIdParams; Body: UpdateEventDateBody }>(
    '/events/:id/date',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: EventIdParamsSchema,
        body: UpdateEventDateBodySchema
      },
      handler: async (request, reply) => {
        const { id } = request.params;
        const { newDate, field } = request.body;
        const userId = request.user.id;

        const result = await calendarService.updateEventDate(id, userId, newDate, field);

        if (!result.success) {
          return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.event);
      }
    }
  );

  // POST /api/v1/calendar/quick-event - Créer un événement rapide
  fastify.post<{ Body: CreateQuickEventBody }>(
    '/quick-event',
    {
      preHandler: [fastify.authenticate],
      schema: { body: CreateQuickEventBodySchema },
      handler: async (request, reply) => {
        const userId = request.user.id;
        const { title, date, type, folderId } = request.body;

        const result = await calendarService.createQuickEvent(userId, {
          title,
          date,
          type,
          folderId
        });

        return reply.status(201).send(result);
      }
    }
  );
}
```

#### calendar.service.ts (extension)

```typescript
// apps/api/src/modules/calendar/calendar.service.ts

import { PrismaClient } from '@prisma/client';
import {
  CalendarEvent,
  CalendarEventDetail,
  CalendarEventType,
  GetEventsOptions,
  CreateQuickEventData
} from '@plumenote/shared-types';

export class CalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère les événements dans une plage de dates avec filtres
   */
  async getEvents(
    userId: string,
    options: GetEventsOptions
  ): Promise<CalendarEvent[]> {
    const { start, end, types, statuses, tags, folderId } = options;

    // Construire la requête de base
    const notes = await this.prisma.note.findMany({
      where: {
        AND: [
          // Accès utilisateur
          {
            OR: [
              { ownerId: userId },
              { folder: { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } } }
            ]
          },
          // Filtre par dossier
          folderId ? { folderId } : {},
          // Au moins une date dans la plage
          {
            OR: [
              {
                metadata: {
                  path: ['due_date'],
                  gte: start,
                  lte: end
                }
              },
              {
                metadata: {
                  path: ['event_date'],
                  gte: start,
                  lte: end
                }
              },
              {
                metadata: {
                  path: ['start_date'],
                  gte: start,
                  lte: end
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        metadata: true,
        folder: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Extraire les événements des notes
    let events = notes.flatMap(note => this.extractEventsFromNote(note, start, end));

    // Appliquer les filtres
    if (types && types.length > 0) {
      events = events.filter(e => types.includes(e.type));
    }

    if (statuses && statuses.length > 0) {
      events = events.filter(e => !e.status || statuses.includes(e.status));
    }

    if (tags && tags.length > 0) {
      events = events.filter(e => {
        if (!e.tags || e.tags.length === 0) return false;
        return tags.some(tag => e.tags!.includes(tag));
      });
    }

    // Trier par date
    events.sort((a, b) => {
      const dateA = new Date(a.date + (a.time ? `T${a.time}` : 'T00:00'));
      const dateB = new Date(b.date + (b.time ? `T${b.time}` : 'T00:00'));
      return dateA.getTime() - dateB.getTime();
    });

    return events;
  }

  /**
   * Récupère le détail d'un événement
   */
  async getEventById(
    eventId: string,
    userId: string
  ): Promise<CalendarEventDetail | null> {
    // L'eventId est au format "noteId-type" (ex: "abc123-due")
    const [noteId, eventType] = eventId.split('-');

    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId } } } }
        ]
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parent: { select: { name: true } }
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!note) return null;

    const metadata = note.metadata as Record<string, unknown>;
    const dateField = this.getDateFieldForType(eventType as CalendarEventType);
    const date = metadata[dateField] as string;

    if (!date) return null;

    return {
      id: eventId,
      title: (metadata.event_title as string) || note.title,
      date: date.split('T')[0],
      time: date.includes('T') ? date.split('T')[1].substring(0, 5) : undefined,
      noteId: note.id,
      noteTitle: note.title,
      type: eventType as CalendarEventType,
      description: metadata.description as string | undefined,
      status: metadata.status as string | undefined,
      priority: metadata.priority as string | undefined,
      tags: metadata.tags as string[] | undefined,
      folder: {
        id: note.folder.id,
        name: note.folder.name,
        path: note.folder.parent 
          ? `${note.folder.parent.name}/${note.folder.name}`
          : note.folder.name
      },
      owner: {
        id: note.owner.id,
        name: note.owner.name,
        email: note.owner.email
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString()
    };
  }

  /**
   * Met à jour la date d'un événement (modifie la metadata de la note)
   */
  async updateEventDate(
    eventId: string,
    userId: string,
    newDate: string,
    field?: string
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    const [noteId, eventType] = eventId.split('-');
    const dateField = field || this.getDateFieldForType(eventType as CalendarEventType);

    // Vérifier l'accès en écriture
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId, level: { in: ['write', 'admin'] } } } } }
        ]
      }
    });

    if (!note) {
      return { success: false, error: 'Note not found or access denied' };
    }

    const currentMetadata = note.metadata as Record<string, unknown>;
    const oldDate = currentMetadata[dateField] as string | undefined;

    // Préserver l'heure si elle existait
    let finalDate = newDate;
    if (oldDate && oldDate.includes('T') && !newDate.includes('T')) {
      const oldTime = oldDate.split('T')[1];
      finalDate = `${newDate}T${oldTime}`;
    }

    // Mettre à jour
    const updatedNote = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        metadata: {
          ...currentMetadata,
          [dateField]: finalDate
        }
      },
      select: {
        id: true,
        title: true,
        metadata: true
      }
    });

    const metadata = updatedNote.metadata as Record<string, unknown>;

    return {
      success: true,
      event: {
        id: eventId,
        title: (metadata.event_title as string) || updatedNote.title,
        date: finalDate.split('T')[0],
        time: finalDate.includes('T') ? finalDate.split('T')[1].substring(0, 5) : undefined,
        noteId: updatedNote.id,
        noteTitle: updatedNote.title,
        type: eventType as CalendarEventType
      }
    };
  }

  /**
   * Crée un événement rapide (nouvelle note avec metadata date)
   */
  async createQuickEvent(
    userId: string,
    data: CreateQuickEventData
  ): Promise<{ note: { id: string; title: string }; event: CalendarEvent }> {
    const { title, date, type, folderId } = data;

    // Déterminer le champ de date selon le type
    const dateField = this.getDateFieldForType(type);

    // Créer la note
    const note = await this.prisma.note.create({
      data: {
        title,
        ownerId: userId,
        folderId: folderId || await this.getDefaultFolderId(userId),
        metadata: {
          [dateField]: date,
          event_title: title
        }
      }
    });

    return {
      note: {
        id: note.id,
        title: note.title
      },
      event: {
        id: `${note.id}-${type === 'deadline' ? 'due' : type === 'event' ? 'event' : 'start'}`,
        title,
        date: date.split('T')[0],
        time: date.includes('T') ? date.split('T')[1].substring(0, 5) : undefined,
        noteId: note.id,
        noteTitle: title,
        type
      }
    };
  }

  /**
   * Extrait les événements d'une note
   */
  private extractEventsFromNote(
    note: {
      id: string;
      title: string;
      metadata: unknown;
      folder: { id: string; name: string };
    },
    startRange: string,
    endRange: string
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const meta = note.metadata as Record<string, unknown>;

    const startDate = new Date(startRange);
    const endDate = new Date(endRange);

    // Due date → deadline
    if (meta.due_date && typeof meta.due_date === 'string') {
      const dueDate = new Date(meta.due_date.split('T')[0]);
      if (dueDate >= startDate && dueDate <= endDate) {
        events.push(this.createEvent(note, meta, 'due_date', 'deadline'));
      }
    }

    // Event date → event
    if (meta.event_date && typeof meta.event_date === 'string') {
      const eventDate = new Date(meta.event_date.split('T')[0]);
      if (eventDate >= startDate && eventDate <= endDate) {
        events.push(this.createEvent(note, meta, 'event_date', 'event'));
      }
    }

    // Start date → period-start
    if (meta.start_date && typeof meta.start_date === 'string') {
      const startDateVal = new Date(meta.start_date.split('T')[0]);
      if (startDateVal >= startDate && startDateVal <= endDate) {
        events.push(this.createEvent(note, meta, 'start_date', 'period-start'));
      }
    }

    return events;
  }

  /**
   * Crée un objet CalendarEvent
   */
  private createEvent(
    note: { id: string; title: string; folder: { id: string; name: string } },
    meta: Record<string, unknown>,
    dateField: string,
    type: CalendarEventType
  ): CalendarEvent {
    const dateValue = meta[dateField] as string;
    const idSuffix = dateField.replace('_date', '');

    return {
      id: `${note.id}-${idSuffix}`,
      title: (meta.event_title as string) || note.title,
      date: dateValue.split('T')[0],
      time: dateValue.includes('T') ? dateValue.split('T')[1].substring(0, 5) : undefined,
      noteId: note.id,
      noteTitle: note.title,
      type,
      status: meta.status as string | undefined,
      priority: meta.priority as string | undefined,
      tags: meta.tags as string[] | undefined,
      folderId: note.folder.id,
      folderName: note.folder.name
    };
  }

  /**
   * Retourne le champ de date pour un type d'événement
   */
  private getDateFieldForType(type: CalendarEventType): string {
    switch (type) {
      case 'deadline': return 'due_date';
      case 'event': return 'event_date';
      case 'period-start': return 'start_date';
      case 'period-end': return 'end_date';
      default: return 'event_date';
    }
  }

  /**
   * Récupère le dossier par défaut de l'utilisateur
   */
  private async getDefaultFolderId(userId: string): Promise<string> {
    const folder = await this.prisma.folder.findFirst({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, level: 'admin' } } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!folder) {
      throw new Error('No folder available');
    }

    return folder.id;
  }
}
```

#### calendar.schema.ts

```typescript
// apps/api/src/modules/calendar/calendar.schema.ts

import { z } from 'zod';

export const GetEventsQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  types: z.string().optional(), // comma-separated: deadline,event,period-start
  statuses: z.string().optional(), // comma-separated: todo,in-progress,done
  tags: z.string().optional(), // comma-separated
  folderId: z.string().optional()
});

export type GetEventsQuery = z.infer<typeof GetEventsQuerySchema>;

export const EventIdParamsSchema = z.object({
  id: z.string() // format: noteId-type
});

export type EventIdParams = z.infer<typeof EventIdParamsSchema>;

export const UpdateEventDateBodySchema = z.object({
  newDate: z.string(), // ISO date or datetime
  field: z.enum(['due_date', 'event_date', 'start_date', 'end_date']).optional()
});

export type UpdateEventDateBody = z.infer<typeof UpdateEventDateBodySchema>;

export const CreateQuickEventBodySchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string(), // ISO date or datetime
  type: z.enum(['deadline', 'event', 'period-start']).default('event'),
  folderId: z.string().optional()
});

export type CreateQuickEventBody = z.infer<typeof CreateQuickEventBodySchema>;
```

### 3.2 Types partagés

```typescript
// packages/shared-types/src/calendar.ts

export type CalendarEventType = 'deadline' | 'event' | 'period-start' | 'period-end';

export type CalendarViewMode = 'month' | 'week' | 'agenda';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  noteId: string;
  noteTitle: string;
  type: CalendarEventType;
  status?: string;
  priority?: string;
  tags?: string[];
  folderId?: string;
  folderName?: string;
}

export interface CalendarEventDetail extends CalendarEvent {
  description?: string;
  folder: {
    id: string;
    name: string;
    path: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetEventsOptions {
  start: string;
  end: string;
  types?: string[];
  statuses?: string[];
  tags?: string[];
  folderId?: string;
}

export interface CreateQuickEventData {
  title: string;
  date: string;
  type: CalendarEventType;
  folderId?: string;
}

export interface CalendarFilters {
  types: CalendarEventType[];
  statuses: string[];
  tags: string[];
  folderId: string | null;
  search: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarWeek[];
}
```

### 3.3 Frontend - Store

```typescript
// apps/web/src/stores/calendarStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  CalendarEvent,
  CalendarEventDetail,
  CalendarFilters,
  CalendarViewMode,
  CalendarMonth,
  CalendarEventType
} from '@plumenote/shared-types';
import { calendarApi } from '@/services/calendarApi';
import { 
  buildCalendarMonth, 
  getMonthRange, 
  getWeekRange,
  addMonths,
  addWeeks
} from '@/lib/calendarUtils';

interface CalendarState {
  // Vue courante
  viewMode: CalendarViewMode;
  currentDate: Date;
  
  // Données
  events: CalendarEvent[];
  selectedEvent: CalendarEventDetail | null;
  
  // Filtres
  filters: CalendarFilters;
  availableTags: string[];
  
  // État
  isLoading: boolean;
  error: string | null;
  
  // Données calculées
  calendarMonth: CalendarMonth | null;

  // Actions - Navigation
  setViewMode: (mode: CalendarViewMode) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToDate: (date: Date) => void;

  // Actions - Données
  loadEvents: () => Promise<void>;
  loadEventDetail: (eventId: string) => Promise<void>;
  clearSelectedEvent: () => void;

  // Actions - Filtres
  setFilter: <K extends keyof CalendarFilters>(key: K, value: CalendarFilters[K]) => void;
  toggleTypeFilter: (type: CalendarEventType) => void;
  toggleStatusFilter: (status: string) => void;
  toggleTagFilter: (tag: string) => void;
  clearFilters: () => void;

  // Actions - Modifications
  updateEventDate: (eventId: string, newDate: string) => Promise<void>;
  createQuickEvent: (title: string, date: string, type?: CalendarEventType) => Promise<void>;

  // Helpers
  getFilteredEvents: () => CalendarEvent[];
}

const defaultFilters: CalendarFilters = {
  types: ['deadline', 'event', 'period-start'],
  statuses: ['todo', 'in-progress'],
  tags: [],
  folderId: null,
  search: ''
};

export const useCalendarStore = create<CalendarState>()(
  devtools(
    (set, get) => ({
      viewMode: 'month',
      currentDate: new Date(),
      events: [],
      selectedEvent: null,
      filters: { ...defaultFilters },
      availableTags: [],
      isLoading: false,
      error: null,
      calendarMonth: null,

      // === Navigation ===

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      goToToday: () => {
        set({ currentDate: new Date() });
        get().loadEvents();
      },

      goToPrevious: () => {
        const { viewMode, currentDate } = get();
        const newDate = viewMode === 'month' 
          ? addMonths(currentDate, -1)
          : addWeeks(currentDate, -1);
        set({ currentDate: newDate });
        get().loadEvents();
      },

      goToNext: () => {
        const { viewMode, currentDate } = get();
        const newDate = viewMode === 'month'
          ? addMonths(currentDate, 1)
          : addWeeks(currentDate, 1);
        set({ currentDate: newDate });
        get().loadEvents();
      },

      goToDate: (date) => {
        set({ currentDate: date });
        get().loadEvents();
      },

      // === Données ===

      loadEvents: async () => {
        const { viewMode, currentDate, filters } = get();
        set({ isLoading: true, error: null });

        try {
          const range = viewMode === 'month'
            ? getMonthRange(currentDate)
            : getWeekRange(currentDate);

          const events = await calendarApi.getEvents({
            start: range.start,
            end: range.end,
            types: filters.types.length > 0 ? filters.types.join(',') : undefined,
            statuses: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
            tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
            folderId: filters.folderId ?? undefined
          });

          // Extraire les tags uniques
          const allTags = new Set<string>();
          events.forEach(e => e.tags?.forEach(t => allTags.add(t)));

          // Construire le calendrier du mois
          const calendarMonth = buildCalendarMonth(currentDate, events);

          set({
            events,
            availableTags: Array.from(allTags).sort(),
            calendarMonth,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load events',
            isLoading: false
          });
        }
      },

      loadEventDetail: async (eventId) => {
        try {
          const event = await calendarApi.getEventById(eventId);
          set({ selectedEvent: event });
        } catch (error) {
          console.error('Failed to load event detail:', error);
        }
      },

      clearSelectedEvent: () => {
        set({ selectedEvent: null });
      },

      // === Filtres ===

      setFilter: (key, value) => {
        set(state => ({
          filters: { ...state.filters, [key]: value }
        }));
        get().loadEvents();
      },

      toggleTypeFilter: (type) => {
        set(state => {
          const types = state.filters.types.includes(type)
            ? state.filters.types.filter(t => t !== type)
            : [...state.filters.types, type];
          return { filters: { ...state.filters, types } };
        });
        get().loadEvents();
      },

      toggleStatusFilter: (status) => {
        set(state => {
          const statuses = state.filters.statuses.includes(status)
            ? state.filters.statuses.filter(s => s !== status)
            : [...state.filters.statuses, status];
          return { filters: { ...state.filters, statuses } };
        });
        get().loadEvents();
      },

      toggleTagFilter: (tag) => {
        set(state => {
          const tags = state.filters.tags.includes(tag)
            ? state.filters.tags.filter(t => t !== tag)
            : [...state.filters.tags, tag];
          return { filters: { ...state.filters, tags } };
        });
        get().loadEvents();
      },

      clearFilters: () => {
        set({ filters: { ...defaultFilters } });
        get().loadEvents();
      },

      // === Modifications ===

      updateEventDate: async (eventId, newDate) => {
        try {
          await calendarApi.updateEventDate(eventId, newDate);
          // Recharger les événements
          get().loadEvents();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update event'
          });
        }
      },

      createQuickEvent: async (title, date, type = 'event') => {
        try {
          await calendarApi.createQuickEvent({ title, date, type });
          // Recharger les événements
          get().loadEvents();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create event'
          });
        }
      },

      // === Helpers ===

      getFilteredEvents: () => {
        const { events, filters } = get();
        
        return events.filter(event => {
          // Filtre par recherche
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            if (!event.title.toLowerCase().includes(searchLower) &&
                !event.noteTitle.toLowerCase().includes(searchLower)) {
              return false;
            }
          }

          return true;
        });
      }
    }),
    { name: 'calendar-store' }
  )
);
```

### 3.4 Frontend - API Client

```typescript
// apps/web/src/services/calendarApi.ts

import { api } from './api';
import {
  CalendarEvent,
  CalendarEventDetail,
  CreateQuickEventData
} from '@plumenote/shared-types';

interface GetEventsParams {
  start: string;
  end: string;
  types?: string;
  statuses?: string;
  tags?: string;
  folderId?: string;
}

export const calendarApi = {
  async getEvents(params: GetEventsParams): Promise<CalendarEvent[]> {
    const response = await api.get<CalendarEvent[]>('/calendar/events', { params });
    return response.data;
  },

  async getEventById(eventId: string): Promise<CalendarEventDetail> {
    const response = await api.get<CalendarEventDetail>(`/calendar/events/${eventId}`);
    return response.data;
  },

  async updateEventDate(eventId: string, newDate: string, field?: string): Promise<void> {
    await api.patch(`/calendar/events/${eventId}/date`, { newDate, field });
  },

  async createQuickEvent(data: CreateQuickEventData): Promise<{ note: { id: string }; event: CalendarEvent }> {
    const response = await api.post('/calendar/quick-event', data);
    return response.data;
  }
};
```

### 3.5 Frontend - Utilitaires

```typescript
// apps/web/src/lib/calendarUtils.ts

import {
  CalendarEvent,
  CalendarMonth,
  CalendarWeek,
  CalendarDay
} from '@plumenote/shared-types';

/**
 * Construit la structure du calendrier pour un mois donné
 */
export function buildCalendarMonth(date: Date, events: CalendarEvent[]): CalendarMonth {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Trouver le premier jour à afficher (lundi de la semaine du 1er)
  const startDay = new Date(firstDayOfMonth);
  const dayOfWeek = startDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi = 0
  startDay.setDate(startDay.getDate() - daysToSubtract);

  // Trouver le dernier jour à afficher (dimanche de la semaine du dernier jour)
  const endDay = new Date(lastDayOfMonth);
  const lastDayOfWeek = endDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endDay.setDate(endDay.getDate() + daysToAdd);

  // Créer un index des événements par date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const dateKey = event.date;
    const existing = eventsByDate.get(dateKey) ?? [];
    existing.push(event);
    eventsByDate.set(dateKey, existing);
  }

  // Construire les semaines
  const weeks: CalendarWeek[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDay = new Date(startDay);
  
  while (currentDay <= endDay) {
    const week: CalendarDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dateKey = formatDateKey(currentDay);
      const dayOfWeekNum = currentDay.getDay();
      
      week.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.getTime() === today.getTime(),
        isWeekend: dayOfWeekNum === 0 || dayOfWeekNum === 6,
        events: eventsByDate.get(dateKey) ?? []
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    weeks.push({ days: week });
  }

  return { year, month, weeks };
}

/**
 * Retourne la plage de dates pour un mois (incluant les jours visibles des mois adjacents)
 */
export function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Premier jour du mois
  const firstDay = new Date(year, month, 1);
  // Reculer au lundi précédent
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  firstDay.setDate(firstDay.getDate() - daysToSubtract);

  // Dernier jour du mois
  const lastDay = new Date(year, month + 1, 0);
  // Avancer au dimanche suivant
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  lastDay.setDate(lastDay.getDate() + daysToAdd);

  return {
    start: formatDateKey(firstDay),
    end: formatDateKey(lastDay)
  };
}

/**
 * Retourne la plage de dates pour une semaine
 */
export function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysToMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    start: formatDateKey(start),
    end: formatDateKey(end)
  };
}

/**
 * Ajoute des mois à une date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Ajoute des semaines à une date
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Formate une date en YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date pour l'affichage
 */
export function formatMonthYear(date: Date, locale: string = 'fr-FR'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Retourne les noms des jours de la semaine
 */
export function getWeekDayNames(locale: string = 'fr-FR', format: 'short' | 'narrow' = 'short'): string[] {
  const days: string[] = [];
  const baseDate = new Date(2024, 0, 1); // Un lundi
  
  for (let i = 0; i < 7; i++) {
    days.push(baseDate.toLocaleDateString(locale, { weekday: format }));
    baseDate.setDate(baseDate.getDate() + 1);
  }
  
  return days;
}

/**
 * Retourne la couleur pour un type d'événement
 */
export function getEventTypeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'deadline':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    case 'event':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
    case 'period-start':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    case 'period-end':
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
    default:
      return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' };
  }
}

/**
 * Retourne l'icône pour un type d'événement
 */
export function getEventTypeIcon(type: string): string {
  switch (type) {
    case 'deadline': return '🎯';
    case 'event': return '📅';
    case 'period-start': return '▶️';
    case 'period-end': return '⏹️';
    default: return '📌';
  }
}
```

### 3.6 Frontend - Composants

#### CalendarPage.tsx

```typescript
// apps/web/src/components/calendar/CalendarPage.tsx

import { useEffect } from 'react';
import { useCalendarStore } from '@/stores/calendarStore';
import { CalendarHeader } from './CalendarHeader';
import { CalendarFilters } from './CalendarFilters';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarAgendaView } from './CalendarAgendaView';
import { EventDetailModal } from './EventDetailModal';
import { QuickEventModal } from './QuickEventModal';
import { Skeleton } from '@/components/ui/skeleton';

export function CalendarPage() {
  const { 
    viewMode,
    isLoading,
    error,
    loadEvents,
    selectedEvent,
    clearSelectedEvent
  } = useCalendarStore();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="calendar-page h-full flex flex-col">
      {/* Header */}
      <CalendarHeader />

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filtres (desktop) */}
        <aside className="hidden lg:block w-64 border-r p-4 overflow-y-auto">
          <CalendarFilters />
        </aside>

        {/* Zone calendrier */}
        <main className="flex-1 overflow-auto p-4">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
                <button 
                  onClick={() => loadEvents()}
                  className="text-primary hover:underline"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <CalendarSkeleton viewMode={viewMode} />
          ) : (
            <>
              {viewMode === 'month' && <CalendarMonthView />}
              {viewMode === 'week' && <CalendarWeekView />}
              {viewMode === 'agenda' && <CalendarAgendaView />}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={clearSelectedEvent}
      />
      
      <QuickEventModal />
    </div>
  );
}

function CalendarSkeleton({ viewMode }: { viewMode: string }) {
  if (viewMode === 'agenda') {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {[...Array(35)].map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}
```

#### CalendarHeader.tsx

```typescript
// apps/web/src/components/calendar/CalendarHeader.tsx

import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { CalendarFilters } from './CalendarFilters';
import { formatMonthYear } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

export function CalendarHeader() {
  const {
    viewMode,
    currentDate,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext
  } = useCalendarStore();

  const title = viewMode === 'month'
    ? formatMonthYear(currentDate)
    : viewMode === 'week'
      ? `Semaine du ${currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
      : 'Agenda';

  return (
    <header className="px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={goToToday}>
            Aujourd'hui
          </Button>

          <h1 className="text-xl font-semibold ml-4 capitalize">
            {title}
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle vue */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as typeof viewMode)}
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="month" aria-label="Vue mois">
              Mois
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Vue semaine">
              Semaine
            </ToggleGroupItem>
            <ToggleGroupItem value="agenda" aria-label="Vue agenda">
              Agenda
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Filtres mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <CalendarFilters />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
```

#### CalendarFilters.tsx

```typescript
// apps/web/src/components/calendar/CalendarFilters.tsx

import { Search, X } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getEventTypeColor } from '@/lib/calendarUtils';

const EVENT_TYPES = [
  { id: 'deadline', label: 'Deadlines', icon: '🎯' },
  { id: 'event', label: 'Événements', icon: '📅' },
  { id: 'period-start', label: 'Périodes', icon: '▶️' }
] as const;

const STATUSES = [
  { id: 'todo', label: 'À faire' },
  { id: 'in-progress', label: 'En cours' },
  { id: 'done', label: 'Terminé' }
] as const;

export function CalendarFilters() {
  const {
    filters,
    availableTags,
    setFilter,
    toggleTypeFilter,
    toggleStatusFilter,
    toggleTagFilter,
    clearFilters
  } = useCalendarStore();

  const hasActiveFilters = 
    filters.types.length < 3 ||
    filters.statuses.length < 2 ||
    filters.tags.length > 0 ||
    filters.folderId ||
    filters.search;

  return (
    <div className="space-y-6">
      {/* Recherche */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Recherche
        </Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Types d'événements */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Type d'événement
        </Label>
        <div className="mt-2 space-y-2">
          {EVENT_TYPES.map(type => {
            const colors = getEventTypeColor(type.id);
            return (
              <div key={type.id} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={filters.types.includes(type.id)}
                  onCheckedChange={() => toggleTypeFilter(type.id)}
                />
                <label
                  htmlFor={`type-${type.id}`}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Status
        </Label>
        <div className="mt-2 space-y-2">
          {STATUSES.map(status => (
            <div key={status.id} className="flex items-center gap-2">
              <Checkbox
                id={`status-${status.id}`}
                checked={filters.statuses.includes(status.id)}
                onCheckedChange={() => toggleStatusFilter(status.id)}
              />
              <label
                htmlFor={`status-${status.id}`}
                className="text-sm cursor-pointer"
              >
                {status.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Tags
          </Label>
          <div className="mt-2 flex flex-wrap gap-1">
            {availableTags.map(tag => (
              <Badge
                key={tag}
                variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Réinitialiser */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
```

#### CalendarMonthView.tsx

```typescript
// apps/web/src/components/calendar/CalendarMonthView.tsx

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { CalendarEventChip } from './CalendarEventChip';
import { getWeekDayNames, formatDateKey } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

const MAX_EVENTS_VISIBLE = 3;

export function CalendarMonthView() {
  const navigate = useNavigate();
  const { calendarMonth, loadEventDetail } = useCalendarStore();
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDayNames('fr-FR', 'short'), []);

  if (!calendarMonth) return null;

  const handleDayClick = (date: Date) => {
    // TODO: Ouvrir modal création rapide
    console.log('Create event on', date);
  };

  const handleEventClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    loadEventDetail(eventId);
  };

  return (
    <div className="calendar-month h-full flex flex-col">
      {/* En-têtes des jours */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-sm font-medium text-muted-foreground",
              index >= 5 && "text-muted-foreground/60"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {calendarMonth.weeks.map((week, weekIndex) => (
          week.days.map((day, dayIndex) => {
            const dateKey = formatDateKey(day.date);
            const isHovered = hoveredDay === dateKey;
            const hasMoreEvents = day.events.length > MAX_EVENTS_VISIBLE;
            const visibleEvents = day.events.slice(0, MAX_EVENTS_VISIBLE);

            return (
              <div
                key={dateKey}
                className={cn(
                  "border-b border-r p-1 min-h-[100px] transition-colors cursor-pointer",
                  "hover:bg-muted/30",
                  !day.isCurrentMonth && "bg-muted/20",
                  day.isToday && "bg-primary/5",
                  day.isWeekend && day.isCurrentMonth && "bg-muted/10"
                )}
                onMouseEnter={() => setHoveredDay(dateKey)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => handleDayClick(day.date)}
              >
                {/* Numéro du jour */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      day.isToday && "bg-primary text-primary-foreground",
                      !day.isCurrentMonth && "text-muted-foreground"
                    )}
                  >
                    {day.date.getDate()}
                  </span>

                  {/* Bouton ajouter (visible au hover) */}
                  {isHovered && (
                    <button
                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayClick(day.date);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Événements */}
                <div className="space-y-0.5">
                  {visibleEvents.map(event => (
                    <CalendarEventChip
                      key={event.id}
                      event={event}
                      onClick={(e) => handleEventClick(event.id, e)}
                    />
                  ))}

                  {hasMoreEvents && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground w-full text-left pl-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Afficher tous les événements du jour
                      }}
                    >
                      +{day.events.length - MAX_EVENTS_VISIBLE} autres
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
```

#### CalendarWeekView.tsx

```typescript
// apps/web/src/components/calendar/CalendarWeekView.tsx

import { useMemo } from 'react';
import { useCalendarStore } from '@/stores/calendarStore';
import { CalendarEventChip } from './CalendarEventChip';
import { getWeekRange, formatDateKey } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView() {
  const { currentDate, events, loadEventDetail } = useCalendarStore();

  // Construire les jours de la semaine
  const weekDays = useMemo(() => {
    const { start } = getWeekRange(currentDate);
    const startDate = new Date(start);
    const days: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Grouper les événements par jour et heure
  const eventsByDayAndHour = useMemo(() => {
    const map = new Map<string, Map<number, typeof events>>();
    
    for (const day of weekDays) {
      const dateKey = formatDateKey(day);
      map.set(dateKey, new Map());
    }

    for (const event of events) {
      const hourMap = map.get(event.date);
      if (!hourMap) continue;

      const hour = event.time ? parseInt(event.time.split(':')[0]) : 0;
      const existing = hourMap.get(hour) ?? [];
      existing.push(event);
      hourMap.set(hour, existing);
    }

    return map;
  }, [weekDays, events]);

  const today = formatDateKey(new Date());

  return (
    <div className="calendar-week h-full overflow-auto">
      {/* En-tête avec jours */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-8">
          {/* Colonne heures */}
          <div className="w-16 border-r" />
          
          {/* Jours */}
          {weekDays.map(day => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === today;
            
            return (
              <div
                key={dateKey}
                className={cn(
                  "py-2 text-center border-r",
                  isToday && "bg-primary/5"
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p className={cn(
                  "text-lg font-semibold",
                  isToday && "text-primary"
                )}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grille heures/jours */}
      <div className="grid grid-cols-8">
        {HOURS.map(hour => (
          <div key={hour} className="contents">
            {/* Colonne heure */}
            <div className="w-16 border-r border-b py-4 text-xs text-muted-foreground text-right pr-2">
              {hour.toString().padStart(2, '0')}:00
            </div>

            {/* Cellules jours */}
            {weekDays.map(day => {
              const dateKey = formatDateKey(day);
              const hourEvents = eventsByDayAndHour.get(dateKey)?.get(hour) ?? [];
              const isToday = dateKey === today;

              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className={cn(
                    "border-r border-b min-h-[60px] p-1",
                    isToday && "bg-primary/5"
                  )}
                >
                  {hourEvents.map(event => (
                    <CalendarEventChip
                      key={event.id}
                      event={event}
                      showTime
                      onClick={() => loadEventDetail(event.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### CalendarAgendaView.tsx

```typescript
// apps/web/src/components/calendar/CalendarAgendaView.tsx

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Folder } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import { Badge } from '@/components/ui/badge';
import { getEventTypeColor, getEventTypeIcon } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

export function CalendarAgendaView() {
  const navigate = useNavigate();
  const { events, loadEventDetail } = useCalendarStore();

  // Grouper les événements par date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    
    for (const event of events) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }

    // Trier les dates
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [events]);

  const today = new Date().toISOString().split('T')[0];

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Aucun événement pour cette période
      </div>
    );
  }

  return (
    <div className="calendar-agenda space-y-6">
      {Array.from(eventsByDate.entries()).map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        const isToday = dateStr === today;
        const isPast = dateStr < today;

        return (
          <div key={dateStr}>
            {/* En-tête de date */}
            <div className={cn(
              "sticky top-0 bg-background py-2 border-b mb-2",
              isToday && "bg-primary/5"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex flex-col items-center justify-center",
                  isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <span className="text-xs font-medium">
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    isToday && "text-primary"
                  )}>
                    {isToday ? "Aujourd'hui" : date.toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dayEvents.length} événement{dayEvents.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des événements */}
            <div className="space-y-2 pl-4">
              {dayEvents.map(event => {
                const colors = getEventTypeColor(event.type);
                const icon = getEventTypeIcon(event.type);

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer",
                      "hover:bg-muted/50 transition-colors",
                      isPast && "opacity-60"
                    )}
                    onClick={() => loadEventDetail(event.id)}
                  >
                    {/* Indicateur type */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                      colors.bg
                    )}>
                      {icon}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {event.noteTitle}
                          </p>
                        </div>

                        {/* Heure */}
                        {event.time && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </div>
                        )}
                      </div>

                      {/* Métadonnées */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {event.folderName && (
                          <Badge variant="outline" className="text-xs">
                            <Folder className="h-3 w-3 mr-1" />
                            {event.folderName}
                          </Badge>
                        )}
                        
                        {event.status && (
                          <Badge variant="secondary" className="text-xs">
                            {event.status}
                          </Badge>
                        )}

                        {event.tags?.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### CalendarEventChip.tsx

```typescript
// apps/web/src/components/calendar/CalendarEventChip.tsx

import { memo } from 'react';
import { CalendarEvent } from '@plumenote/shared-types';
import { getEventTypeColor, getEventTypeIcon } from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface CalendarEventChipProps {
  event: CalendarEvent;
  showTime?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const CalendarEventChip = memo(function CalendarEventChip({
  event,
  showTime = false,
  onClick
}: CalendarEventChipProps) {
  const colors = getEventTypeColor(event.type);
  const icon = getEventTypeIcon(event.type);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "w-full text-left text-xs px-1.5 py-0.5 rounded truncate",
              "hover:ring-1 hover:ring-offset-1 transition-all",
              colors.bg,
              colors.text,
              colors.border
            )}
            onClick={onClick}
          >
            <span className="mr-1">{icon}</span>
            {showTime && event.time && (
              <span className="text-[10px] opacity-75 mr-1">{event.time}</span>
            )}
            <span>{event.title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              Note: {event.noteTitle}
            </p>
            {event.time && (
              <p className="text-xs">🕐 {event.time}</p>
            )}
            {event.folderName && (
              <p className="text-xs">📁 {event.folderName}</p>
            )}
            {event.status && (
              <p className="text-xs">Status: {event.status}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
```

#### EventDetailModal.tsx

```typescript
// apps/web/src/components/calendar/EventDetailModal.tsx

import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Clock, Folder, User, Tag } from 'lucide-react';
import { CalendarEventDetail } from '@plumenote/shared-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getEventTypeColor, getEventTypeIcon } from '@/lib/calendarUtils';
import { formatRelativeDate } from '@/lib/dateUtils';

interface EventDetailModalProps {
  event: CalendarEventDetail | null;
  open: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, open, onClose }: EventDetailModalProps) {
  const navigate = useNavigate();

  if (!event) return null;

  const colors = getEventTypeColor(event.type);
  const icon = getEventTypeIcon(event.type);

  const handleOpenNote = () => {
    onClose();
    navigate(`/notes/${event.noteId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colors.bg}`}>
              {icon}
            </div>
            <div>
              <DialogTitle>{event.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{event.noteTitle}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date et heure */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(event.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            {event.time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{event.time}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Métadonnées */}
          <div className="space-y-3">
            {/* Dossier */}
            <div className="flex items-center gap-2 text-sm">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>{event.folder.path}</span>
            </div>

            {/* Propriétaire */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{event.owner.name}</span>
            </div>

            {/* Status et priorité */}
            <div className="flex items-center gap-2">
              {event.status && (
                <Badge variant="secondary">{event.status}</Badge>
              )}
              {event.priority && (
                <Badge variant="outline">{event.priority}</Badge>
              )}
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {event.tags.map(tag => (
                  <Badge key={tag} variant="outline">#{tag}</Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>

          <Separator />

          {/* Dates système */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Créé {formatRelativeDate(event.createdAt)}</p>
            <p>Modifié {formatRelativeDate(event.updatedAt)}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleOpenNote}>
              <FileText className="h-4 w-4 mr-2" />
              Ouvrir la note
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### QuickEventModal.tsx

```typescript
// apps/web/src/components/calendar/QuickEventModal.tsx

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useCalendarStore } from '@/stores/calendarStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CalendarEventType } from '@plumenote/shared-types';
import { formatDateKey } from '@/lib/calendarUtils';

export function QuickEventModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(formatDateKey(new Date()));
  const [time, setTime] = useState('');
  const [type, setType] = useState<CalendarEventType>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createQuickEvent } = useCalendarStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    
    try {
      const dateTime = time ? `${date}T${time}:00` : date;
      await createQuickEvent(title, dateTime, type);
      
      // Reset et fermer
      setTitle('');
      setDate(formatDateKey(new Date()));
      setTime('');
      setType('event');
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 shadow-lg" size="lg">
          <CalendarPlus className="h-5 w-5 mr-2" />
          Nouvel événement
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un événement rapide</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Réunion d'équipe..."
              autoFocus
            />
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Heure (optionnel)</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">📅 Événement</SelectItem>
                <SelectItem value="deadline">🎯 Deadline</SelectItem>
                <SelectItem value="period-start">▶️ Début de période</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.7 Routing et Sidebar

```typescript
// apps/web/src/App.tsx ou routes.tsx (modification)

import { CalendarPage } from '@/components/calendar/CalendarPage';

// La route existe probablement déjà, sinon l'ajouter :
<Route path="/calendar" element={<CalendarPage />} />
```

```typescript
// apps/web/src/components/sidebar/Sidebar.tsx (vérifier que le lien existe)

import { Calendar } from 'lucide-react';

const navItems = [
  // ...
  { path: '/calendar', label: 'Calendrier', icon: Calendar },
  // ...
];
```

---

## 4. Tests

### 4.1 Tests unitaires Backend

```typescript
// apps/api/src/modules/calendar/__tests__/calendar.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from '../calendar.service';
import { prismaMock } from '@/test/prisma-mock';

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    service = new CalendarService(prismaMock);
    vi.clearAllMocks();
  });

  describe('getEvents', () => {
    it('should extract events from notes with date metadata', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Meeting',
          metadata: { 
            event_date: '2024-12-15T10:00:00',
            event_title: 'Team Sync'
          },
          folder: { id: 'folder-1', name: 'Work' }
        },
        {
          id: 'note-2',
          title: 'Report Due',
          metadata: { 
            due_date: '2024-12-20',
            status: 'in-progress'
          },
          folder: { id: 'folder-1', name: 'Work' }
        }
      ]);

      const events = await service.getEvents('user-1', {
        start: '2024-12-01',
        end: '2024-12-31'
      });

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('event');
      expect(events[0].title).toBe('Team Sync');
      expect(events[0].time).toBe('10:00');
      expect(events[1].type).toBe('deadline');
      expect(events[1].status).toBe('in-progress');
    });

    it('should filter by event type', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Event',
          metadata: { event_date: '2024-12-15' },
          folder: { id: 'f1', name: 'F' }
        },
        {
          id: 'note-2',
          title: 'Deadline',
          metadata: { due_date: '2024-12-20' },
          folder: { id: 'f1', name: 'F' }
        }
      ]);

      const events = await service.getEvents('user-1', {
        start: '2024-12-01',
        end: '2024-12-31',
        types: ['deadline']
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('deadline');
    });
  });

  describe('updateEventDate', () => {
    it('should update the metadata date field', async () => {
      prismaMock.note.findFirst.mockResolvedValue({
        id: 'note-1',
        title: 'Event',
        metadata: { event_date: '2024-12-15T10:00:00' }
      });

      prismaMock.note.update.mockResolvedValue({
        id: 'note-1',
        title: 'Event',
        metadata: { event_date: '2024-12-20T10:00:00' }
      });

      const result = await service.updateEventDate(
        'note-1-event',
        'user-1',
        '2024-12-20'
      );

      expect(result.success).toBe(true);
      expect(result.event?.date).toBe('2024-12-20');
      // L'heure devrait être préservée
      expect(prismaMock.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            metadata: { event_date: '2024-12-20T10:00:00' }
          }
        })
      );
    });
  });

  describe('createQuickEvent', () => {
    it('should create a note with date metadata', async () => {
      prismaMock.folder.findFirst.mockResolvedValue({
        id: 'default-folder'
      });

      prismaMock.note.create.mockResolvedValue({
        id: 'new-note',
        title: 'Quick Event',
        metadata: { event_date: '2024-12-15', event_title: 'Quick Event' }
      });

      const result = await service.createQuickEvent('user-1', {
        title: 'Quick Event',
        date: '2024-12-15',
        type: 'event'
      });

      expect(result.note.title).toBe('Quick Event');
      expect(result.event.type).toBe('event');
    });
  });
});
```

### 4.2 Tests unitaires Frontend

```typescript
// apps/web/src/lib/__tests__/calendarUtils.test.ts

import { describe, it, expect } from 'vitest';
import {
  buildCalendarMonth,
  getMonthRange,
  getWeekRange,
  formatDateKey,
  getEventTypeColor
} from '../calendarUtils';

describe('calendarUtils', () => {
  describe('buildCalendarMonth', () => {
    it('should build correct number of weeks', () => {
      const result = buildCalendarMonth(new Date(2024, 11, 1), []);
      
      // Décembre 2024 commence un dimanche, donc 5-6 semaines
      expect(result.weeks.length).toBeGreaterThanOrEqual(5);
      expect(result.weeks.length).toBeLessThanOrEqual(6);
    });

    it('should mark today correctly', () => {
      const today = new Date();
      const result = buildCalendarMonth(today, []);

      const todayCell = result.weeks
        .flatMap(w => w.days)
        .find(d => d.isToday);

      expect(todayCell).toBeDefined();
      expect(todayCell!.date.getDate()).toBe(today.getDate());
    });

    it('should assign events to correct days', () => {
      const events = [
        { id: '1', title: 'Event', date: '2024-12-15', noteId: 'n1', noteTitle: 'N', type: 'event' as const }
      ];

      const result = buildCalendarMonth(new Date(2024, 11, 1), events);

      const day15 = result.weeks
        .flatMap(w => w.days)
        .find(d => d.date.getDate() === 15 && d.isCurrentMonth);

      expect(day15?.events).toHaveLength(1);
      expect(day15?.events[0].title).toBe('Event');
    });
  });

  describe('getMonthRange', () => {
    it('should include padding days from adjacent months', () => {
      // Décembre 2024 commence un dimanche
      const range = getMonthRange(new Date(2024, 11, 1));

      // Le range devrait commencer le lundi 25 novembre
      expect(range.start).toBe('2024-11-25');
      // Et finir après le 31 décembre
      expect(range.end >= '2024-12-31').toBe(true);
    });
  });

  describe('getWeekRange', () => {
    it('should return Monday to Sunday', () => {
      // Mercredi 18 décembre 2024
      const range = getWeekRange(new Date(2024, 11, 18));

      expect(range.start).toBe('2024-12-16'); // Lundi
      expect(range.end).toBe('2024-12-22'); // Dimanche
    });
  });

  describe('formatDateKey', () => {
    it('should format date as YYYY-MM-DD', () => {
      const result = formatDateKey(new Date(2024, 11, 5));
      expect(result).toBe('2024-12-05');
    });
  });

  describe('getEventTypeColor', () => {
    it('should return correct colors for each type', () => {
      expect(getEventTypeColor('deadline').bg).toContain('red');
      expect(getEventTypeColor('event').bg).toContain('blue');
      expect(getEventTypeColor('period-start').bg).toContain('green');
    });
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/calendar.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should display calendar in month view by default', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier que la grille du mois est visible
    await expect(page.locator('.calendar-month')).toBeVisible();
    
    // Vérifier les en-têtes de jours
    await expect(page.getByText('lun.')).toBeVisible();
    await expect(page.getByText('dim.')).toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    await page.goto('/calendar');

    const header = page.locator('h1');
    const initialMonth = await header.textContent();

    // Aller au mois suivant
    await page.click('button:has(svg.lucide-chevron-right)');
    
    const newMonth = await header.textContent();
    expect(newMonth).not.toBe(initialMonth);

    // Revenir à aujourd'hui
    await page.click('text=Aujourd\'hui');
    
    const currentMonth = await header.textContent();
    expect(currentMonth).toBe(initialMonth);
  });

  test('should switch between views', async ({ page }) => {
    await page.goto('/calendar');

    // Vue semaine
    await page.click('text=Semaine');
    await expect(page.locator('.calendar-week')).toBeVisible();

    // Vue agenda
    await page.click('text=Agenda');
    await expect(page.locator('.calendar-agenda')).toBeVisible();

    // Retour vue mois
    await page.click('text=Mois');
    await expect(page.locator('.calendar-month')).toBeVisible();
  });

  test('should filter events by type', async ({ page }) => {
    await page.goto('/calendar');

    // Décocher les deadlines
    await page.click('label:has-text("Deadlines")');

    // Les événements deadline ne devraient plus être visibles
    // (dépend des données de test)
  });

  test('should open event detail on click', async ({ page }) => {
    await page.goto('/calendar');

    // Trouver et cliquer sur un événement (si présent)
    const eventChip = page.locator('.calendar-month button').first();
    
    if (await eventChip.isVisible()) {
      await eventChip.click();
      
      // La modal devrait s'ouvrir
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Ouvrir la note')).toBeVisible();
    }
  });

  test('should create quick event', async ({ page }) => {
    await page.goto('/calendar');

    // Cliquer sur le bouton nouvel événement
    await page.click('text=Nouvel événement');

    // Remplir le formulaire
    await page.fill('input#title', 'Test Event');
    
    // Soumettre
    await page.click('button:has-text("Créer")');

    // La modal devrait se fermer
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/calendar');

    // Vérifier sur mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // La sidebar filtres devrait être cachée
    await expect(page.locator('aside')).not.toBeVisible();

    // Le bouton filtres devrait apparaître
    await expect(page.locator('button:has(svg.lucide-filter)')).toBeVisible();
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Backend : Étendre calendar.schema.ts**
    
    - Schémas Zod pour les nouveaux endpoints
2. [ ] **Backend : Étendre calendar.service.ts**
    
    - `getEvents` avec filtres complets
    - `getEventById` pour détails
    - `updateEventDate` pour drag & drop
    - `createQuickEvent` pour création rapide
3. [ ] **Backend : Étendre calendar.controller.ts**
    
    - Nouveaux endpoints
4. [ ] **Shared-types : Compléter calendar.ts**
    
    - Tous les types nécessaires
5. [ ] **Frontend : calendarUtils.ts**
    
    - Fonctions utilitaires
6. [ ] **Frontend : calendarStore.ts**
    
    - Store Zustand complet
7. [ ] **Frontend : calendarApi.ts**
    
    - Client API
8. [ ] **Frontend : CalendarPage.tsx**
    
    - Layout principal
9. [ ] **Frontend : CalendarHeader.tsx**
    
    - Navigation et contrôles
10. [ ] **Frontend : CalendarFilters.tsx**
    
    - Panneau de filtres
11. [ ] **Frontend : CalendarMonthView.tsx**
    
    - Vue grille mensuelle
12. [ ] **Frontend : CalendarWeekView.tsx**
    
    - Vue hebdomadaire avec heures
13. [ ] **Frontend : CalendarAgendaView.tsx**
    
    - Vue liste chronologique
14. [ ] **Frontend : CalendarEventChip.tsx**
    
    - Composant événement compact
15. [ ] **Frontend : EventDetailModal.tsx**
    
    - Modal détails événement
16. [ ] **Frontend : QuickEventModal.tsx**
    
    - Modal création rapide
17. [ ] **Tests : Suite complète**
    

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Performance avec beaucoup d'événements|Moyenne|Moyen|Pagination côté API, virtualisation UI|
|Complexité drag & drop|Moyenne|Faible|Commencer sans, ajouter en v2|
|Conflits de dates avec timezones|Faible|Moyen|Toujours utiliser UTC côté serveur|
|UX mobile complexe|Moyenne|Moyen|Vue agenda par défaut sur mobile|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Types partagés
cd /path/to/plumenote/packages/shared-types
# Compléter src/calendar.ts
npm run build

# 2. Backend
cd ../../apps/api
# Étendre src/modules/calendar/
npm run test -- calendar

# 3. Frontend
cd ../web
# Créer src/components/calendar/
# Créer src/stores/calendarStore.ts
npm run test -- calendar

# 4. Tests E2E
cd ../..
npm run test:e2e -- calendar
```

### Points d'attention

- **Timezones** : Stocker les dates en UTC, convertir à l'affichage
- **Performance** : Limiter la plage de dates chargée
- **Mobile** : La vue agenda est plus adaptée aux petits écrans
- **Accessibilité** : Navigation au clavier dans la grille
- **Couleurs** : Utiliser des couleurs distinctes pour chaque type

### Dépendances npm

Aucune nouvelle dépendance requise. Utilise les composants UI existants (Radix, shadcn/ui).

---

## 7. Annexes

### A. Arborescence des fichiers

```
plumenote/
├── packages/
│   └── shared-types/
│       └── src/
│           └── calendar.ts                     # [COMPLÉTER]
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── modules/
│   │           └── calendar/
│   │               ├── calendar.controller.ts  # [ÉTENDRE]
│   │               ├── calendar.service.ts     # [ÉTENDRE]
│   │               ├── calendar.schema.ts      # [ÉTENDRE]
│   │               └── __tests__/
│   │                   └── calendar.service.test.ts # [COMPLÉTER]
│   │
│   └── web/
│       └── src/
│           ├── stores/
│           │   └── calendarStore.ts            # [CRÉER]
│           ├── services/
│           │   └── calendarApi.ts              # [CRÉER]
│           ├── lib/
│           │   └── calendarUtils.ts            # [CRÉER]
│           └── components/
│               └── calendar/                   # [CRÉER]
│                   ├── CalendarPage.tsx
│                   ├── CalendarHeader.tsx
│                   ├── CalendarFilters.tsx
│                   ├── CalendarMonthView.tsx
│                   ├── CalendarWeekView.tsx
│                   ├── CalendarAgendaView.tsx
│                   ├── CalendarEventChip.tsx
│                   ├── EventDetailModal.tsx
│                   ├── QuickEventModal.tsx
│                   └── __tests__/
│
└── e2e/
    └── calendar.spec.ts                        # [CRÉER]
```

### B. Couleurs par type d'événement

|Type|Background|Text|Border|Icône|
|---|---|---|---|---|
|`deadline`|`bg-red-100`|`text-red-800`|`border-red-300`|🎯|
|`event`|`bg-blue-100`|`text-blue-800`|`border-blue-300`|📅|
|`period-start`|`bg-green-100`|`text-green-800`|`border-green-300`|▶️|
|`period-end`|`bg-gray-100`|`text-gray-800`|`border-gray-300`|⏹️|

### C. Checklist de validation

- [ ] La page /calendar s'affiche correctement
- [ ] La navigation entre mois fonctionne
- [ ] Le bouton "Aujourd'hui" revient à la date courante
- [ ] Les 3 vues (mois, semaine, agenda) fonctionnent
- [ ] Les événements s'affichent sur les bons jours
- [ ] Le code couleur par type est appliqué
- [ ] Les filtres par type fonctionnent
- [ ] Les filtres par status fonctionnent
- [ ] Le clic sur un événement ouvre la modal détail
- [ ] Le bouton "Ouvrir la note" navigue vers l'éditeur
- [ ] La création rapide d'événement fonctionne
- [ ] L'interface est responsive sur mobile
- [ ] Les tests passent à 100%