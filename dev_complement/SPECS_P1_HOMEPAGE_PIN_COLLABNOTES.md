# MODULE P1 : Réorganisation Homepage + Feature Épingler

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature / Improvement|
|Priorité|**P1-Haute**|
|Complexité|L|
|Modules impactés|Database, Backend (notes, users), Frontend (homepage, editor, stores)|
|Estimation|4 jours-homme|

### Description

Refonte complète de la page d'accueil pour optimiser l'espace et l'ergonomie, accompagnée de l'implémentation de la fonctionnalité "épingler une note". Les modifications incluent :

1. **Réorganisation du layout** : Repositionnement des éléments pour une meilleure hiérarchie visuelle
2. **Calendrier des événements** : Widget prioritaire sous la barre de recherche (5 événements max)
3. **Notes épinglées** : Nouvelle section avec notes favorites de l'utilisateur
4. **Notes récentes** : Section enrichie avec métadonnées complètes (vues, dates, chemin)
5. **Suppression des widgets latéraux** : Statistiques et Raccourcis migrent vers la sidebar

### Critères d'acceptation

**Layout Homepage :**

- [ ] Boutons "Recherche avancée" et "Nouvelle note" positionnés en haut à droite, alignés avec la barre de recherche
- [ ] Widget Calendrier affiché directement sous la barre de recherche
- [ ] Calendrier limité à 5 événements avec bouton "Voir tout"
- [ ] Section "Notes épinglées" après le calendrier, pleine largeur
- [ ] Section "Notes récentes" (10 notes) après les épinglées, pleine largeur
- [ ] Widgets Statistiques et Raccourcis supprimés de la homepage

**Feature Épingler :**

- [ ] Un utilisateur peut épingler/désépingler une note depuis l'éditeur
- [ ] Un utilisateur peut épingler/désépingler depuis le menu contextuel (liste)
- [ ] Les notes épinglées apparaissent dans la section dédiée sur la homepage
- [ ] Pas de limite sur le nombre de notes épinglées
- [ ] L'état épinglé est persisté en base de données
- [ ] L'état épinglé est propre à chaque utilisateur (pas global)

**Données affichées :**

- [ ] Chaque note affiche : titre, date création, date modification, nombre de vues, chemin (dossier)
- [ ] Layout horizontal optimisé (pas d'empilement vertical des métadonnées)

---

## 2. Analyse technique

### 2.1 Contexte actuel

#### Layout actuel (problématique)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bienvenue, [User] | [Date]                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  [═══════════ Barre de recherche ═══════════]                               │
│  [Recherche avancée]  [Nouvelle note]           ← Position incorrecte       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                 │                           │
│  ┌─────────────────────────────────────────┐   │  ┌─────────────────────┐  │
│  │         Notes récentes                   │   │  │   Statistiques      │  │
│  │  (liste verticale)                       │   │  │   • X notes         │  │
│  │                                          │   │  │   • Y dossiers      │  │
│  └─────────────────────────────────────────┘   │  └─────────────────────┘  │
│                                                 │                           │
│                                                 │  ┌─────────────────────┐  │
│  ┌─────────────────────────────────────────┐   │  │   Raccourcis        │  │
│  │         Calendrier                       │   │  │   • Ctrl+N          │  │
│  │  (en bas, mauvaise position)             │   │  │   • Ctrl+S          │  │
│  └─────────────────────────────────────────┘   │  └─────────────────────┘  │
│                                                 │                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Solution proposée

#### Layout cible

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bienvenue, [User]                              [Rech. avancée] [+ Note]    │
│  [Date/Heure]                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  [═══════════════════ Barre de recherche ═══════════════════════════════]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 À VENIR                                                    [Voir tout →]│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 📌 Réunion équipe     │ Aujourd'hui 14h  │ Note: Réunion hebdo         ││
│  │ 📌 Deadline projet    │ Demain           │ Note: Projet Alpha          ││
│  │ 📌 Review code        │ 12 déc.          │ Note: Sprint review         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  📌 NOTES ÉPINGLÉES                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Titre          │ Créée      │ Modifiée   │ Vues │ Dossier              ││
│  │────────────────│────────────│────────────│──────│──────────────────────││
│  │ Documentation  │ 01/12/2024 │ 05/12/2024 │ 42   │ Projets/Alpha        ││
│  │ Notes réunion  │ 28/11/2024 │ 04/12/2024 │ 15   │ Équipe/Meetings      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  🕐 NOTES RÉCENTES                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Titre          │ Créée      │ Modifiée   │ Vues │ Dossier              ││
│  │────────────────│────────────│────────────│──────│──────────────────────││
│  │ Brainstorm     │ 05/12/2024 │ 05/12/2024 │ 3    │ Projets/Beta         ││
│  │ Todo list      │ 04/12/2024 │ 05/12/2024 │ 28   │ Personnel            ││
│  │ ... (10 notes max)                                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Architecture de la solution

#### Modèle de données pour l'épinglage

L'épinglage est **par utilisateur** (un user peut épingler une note, un autre non). Deux approches possibles :

**Option A : Table de jointure `UserPinnedNotes`** ✅ Retenue

- Flexible, permet d'ajouter des métadonnées (date d'épinglage, ordre)
- Requêtes simples pour lister les notes épinglées d'un user

**Option B : Champ `pinnedByUsers` sur Note**

- Moins flexible, plus complexe pour les requêtes

#### Flux de données

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              HOMEPAGE                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  useHomePageData() ─────────────────────────────────────────────────────┐│
│       │                                                                 ││
│       ├─► GET /api/v1/notes/pinned ────► PinnedNotesSection            ││
│       │                                                                 ││
│       ├─► GET /api/v1/notes/recent ────► RecentNotesSection            ││
│       │                                                                 ││
│       └─► GET /api/v1/calendar/upcoming ──► CalendarWidget             ││
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spécifications détaillées

### 3.1 Modifications Base de données

#### Schema Prisma

```prisma
// prisma/schema.prisma

// NOUVEAU : Table de jointure pour les notes épinglées par utilisateur
model UserPinnedNote {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  noteId    String   @map("note_id")
  pinnedAt  DateTime @default(now()) @map("pinned_at")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  note      Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  
  @@unique([userId, noteId])
  @@index([userId])
  @@index([noteId])
  @@map("user_pinned_notes")
}

// MODIFICATION : Ajouter le compteur de vues sur Note
model Note {
  id          String    @id @default(cuid())
  title       String
  content     Bytes?    // Y.Doc serialized
  folderId    String    @map("folder_id")
  ownerId     String    @map("owner_id")
  viewCount   Int       @default(0) @map("view_count")  // NOUVEAU
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  folder      Folder    @relation(fields: [folderId], references: [id])
  owner       User      @relation(fields: [ownerId], references: [id])
  pinnedBy    UserPinnedNote[]  // NOUVEAU : Relation inverse
  
  @@map("notes")
}

// MODIFICATION : Ajouter la relation sur User
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  // ... autres champs existants
  
  pinnedNotes  UserPinnedNote[]  // NOUVEAU
  
  @@map("users")
}
```

#### Migration SQL

```sql
-- Migration: add_pinned_notes_and_view_count
-- Description: Ajoute le système d'épinglage par utilisateur et le compteur de vues

-- 1. Ajouter le compteur de vues sur les notes
ALTER TABLE notes 
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- 2. Créer la table de jointure pour les notes épinglées
CREATE TABLE user_pinned_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, note_id)
);

-- 3. Index pour les performances
CREATE INDEX idx_user_pinned_notes_user_id ON user_pinned_notes(user_id);
CREATE INDEX idx_user_pinned_notes_note_id ON user_pinned_notes(note_id);
CREATE INDEX idx_notes_view_count ON notes(view_count DESC);
```

### 3.2 Backend (API Fastify)

#### Endpoints

|Méthode|Route|Description|Auth|
|---|---|---|---|
|GET|`/api/v1/notes/pinned`|Notes épinglées de l'utilisateur|Oui|
|POST|`/api/v1/notes/:id/pin`|Épingler une note|Oui|
|DELETE|`/api/v1/notes/:id/pin`|Désépingler une note|Oui|
|GET|`/api/v1/notes/recent`|Notes récentes (enrichies)|Oui|
|POST|`/api/v1/notes/:id/view`|Incrémenter le compteur de vues|Oui|
|GET|`/api/v1/calendar/upcoming`|Événements à venir (5 max)|Oui|

#### notes.controller.ts (ajouts)

```typescript
// apps/api/src/modules/notes/notes.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotesService } from './notes.service';
import { 
  NoteIdParams, 
  NoteIdParamsSchema,
  GetRecentNotesQuery,
  GetRecentNotesQuerySchema 
} from './notes.schema';

export async function notesController(fastify: FastifyInstance): Promise<void> {
  const notesService = new NotesService(fastify.prisma);

  // GET /api/v1/notes/pinned - Notes épinglées de l'utilisateur
  fastify.get('/pinned', {
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const pinnedNotes = await notesService.getPinnedNotes(userId);
      return reply.send(pinnedNotes);
    }
  });

  // POST /api/v1/notes/:id/pin - Épingler une note
  fastify.post<{ Params: NoteIdParams }>(
    '/:id/pin',
    {
      preHandler: [fastify.authenticate],
      schema: { params: NoteIdParamsSchema },
      handler: async (request, reply) => {
        const { id: noteId } = request.params;
        const userId = request.user.id;

        const result = await notesService.pinNote(noteId, userId);
        
        if (!result.success) {
          return reply.status(result.status).send({ error: result.error });
        }

        return reply.status(201).send({ message: 'Note pinned successfully' });
      }
    }
  );

  // DELETE /api/v1/notes/:id/pin - Désépingler une note
  fastify.delete<{ Params: NoteIdParams }>(
    '/:id/pin',
    {
      preHandler: [fastify.authenticate],
      schema: { params: NoteIdParamsSchema },
      handler: async (request, reply) => {
        const { id: noteId } = request.params;
        const userId = request.user.id;

        await notesService.unpinNote(noteId, userId);
        return reply.status(204).send();
      }
    }
  );

  // GET /api/v1/notes/recent - Notes récentes avec métadonnées enrichies
  fastify.get<{ Querystring: GetRecentNotesQuery }>(
    '/recent',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetRecentNotesQuerySchema },
      handler: async (request, reply) => {
        const userId = request.user.id;
        const { limit = 10 } = request.query;

        const recentNotes = await notesService.getRecentNotes(userId, limit);
        return reply.send(recentNotes);
      }
    }
  );

  // POST /api/v1/notes/:id/view - Incrémenter le compteur de vues
  fastify.post<{ Params: NoteIdParams }>(
    '/:id/view',
    {
      preHandler: [fastify.authenticate],
      schema: { params: NoteIdParamsSchema },
      handler: async (request, reply) => {
        const { id: noteId } = request.params;
        const userId = request.user.id;

        await notesService.incrementViewCount(noteId, userId);
        return reply.status(204).send();
      }
    }
  );
}
```

#### notes.service.ts (ajouts)

```typescript
// apps/api/src/modules/notes/notes.service.ts

import { PrismaClient } from '@prisma/client';
import { 
  NoteWithMetadata, 
  PinNoteResult 
} from '@plumenote/shared-types';

export class NotesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère les notes épinglées par l'utilisateur avec métadonnées complètes
   */
  async getPinnedNotes(userId: string): Promise<NoteWithMetadata[]> {
    const pinnedNotes = await this.prisma.userPinnedNote.findMany({
      where: { userId },
      orderBy: { pinnedAt: 'desc' },
      include: {
        note: {
          include: {
            folder: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    return pinnedNotes.map(pin => this.mapNoteToMetadata(pin.note, true));
  }

  /**
   * Épingle une note pour un utilisateur
   */
  async pinNote(noteId: string, userId: string): Promise<PinNoteResult> {
    // Vérifier que la note existe et que l'utilisateur y a accès
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } } }
        ]
      }
    });

    if (!note) {
      return { success: false, status: 404, error: 'Note not found or access denied' };
    }

    // Vérifier si déjà épinglée
    const existing = await this.prisma.userPinnedNote.findUnique({
      where: { userId_noteId: { userId, noteId } }
    });

    if (existing) {
      return { success: false, status: 409, error: 'Note already pinned' };
    }

    // Créer l'épinglage
    await this.prisma.userPinnedNote.create({
      data: { userId, noteId }
    });

    return { success: true };
  }

  /**
   * Désépingle une note pour un utilisateur
   */
  async unpinNote(noteId: string, userId: string): Promise<void> {
    await this.prisma.userPinnedNote.deleteMany({
      where: { userId, noteId }
    });
  }

  /**
   * Vérifie si une note est épinglée par l'utilisateur
   */
  async isNotePinned(noteId: string, userId: string): Promise<boolean> {
    const pin = await this.prisma.userPinnedNote.findUnique({
      where: { userId_noteId: { userId, noteId } }
    });
    return !!pin;
  }

  /**
   * Récupère les notes récentes avec métadonnées enrichies
   */
  async getRecentNotes(userId: string, limit: number = 10): Promise<NoteWithMetadata[]> {
    const notes = await this.prisma.note.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } } }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parent: {
              select: { id: true, name: true }
            }
          }
        },
        pinnedBy: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    return notes.map(note => this.mapNoteToMetadata(note, note.pinnedBy.length > 0));
  }

  /**
   * Incrémente le compteur de vues d'une note
   * Note: On pourrait ajouter une logique anti-spam (1 vue par user par heure)
   */
  async incrementViewCount(noteId: string, userId: string): Promise<void> {
    // Option simple : incrémenter directement
    await this.prisma.note.update({
      where: { id: noteId },
      data: { viewCount: { increment: 1 } }
    });

    // TODO: Pour une logique plus fine, créer une table NoteView
    // avec (noteId, visitorId, viewedAt) et dédupliquer
  }

  /**
   * Transforme une note Prisma en DTO avec métadonnées
   */
  private mapNoteToMetadata(
    note: {
      id: string;
      title: string;
      viewCount: number;
      createdAt: Date;
      updatedAt: Date;
      folder: {
        id: string;
        name: string;
        parent: { id: string; name: string } | null;
      };
    },
    isPinned: boolean
  ): NoteWithMetadata {
    // Construire le chemin du dossier
    const folderPath = note.folder.parent
      ? `${note.folder.parent.name}/${note.folder.name}`
      : note.folder.name;

    return {
      id: note.id,
      title: note.title,
      viewCount: note.viewCount,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      folderPath,
      folderId: note.folder.id,
      isPinned
    };
  }
}
```

#### notes.schema.ts (ajouts)

```typescript
// apps/api/src/modules/notes/notes.schema.ts

import { z } from 'zod';

export const NoteIdParamsSchema = z.object({
  id: z.string().cuid()
});

export type NoteIdParams = z.infer<typeof NoteIdParamsSchema>;

export const GetRecentNotesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10)
});

export type GetRecentNotesQuery = z.infer<typeof GetRecentNotesQuerySchema>;
```

#### calendar.controller.ts (nouveau module)

```typescript
// apps/api/src/modules/calendar/calendar.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CalendarService } from './calendar.service';
import { GetUpcomingEventsQuery, GetUpcomingEventsQuerySchema } from './calendar.schema';

export async function calendarController(fastify: FastifyInstance): Promise<void> {
  const calendarService = new CalendarService(fastify.prisma);

  // GET /api/v1/calendar/upcoming - Événements à venir
  fastify.get<{ Querystring: GetUpcomingEventsQuery }>(
    '/upcoming',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetUpcomingEventsQuerySchema },
      handler: async (request, reply) => {
        const userId = request.user.id;
        const { limit = 5 } = request.query;

        const events = await calendarService.getUpcomingEvents(userId, limit);
        return reply.send(events);
      }
    }
  );
}
```

#### calendar.service.ts

```typescript
// apps/api/src/modules/calendar/calendar.service.ts

import { PrismaClient } from '@prisma/client';
import { CalendarEvent } from '@plumenote/shared-types';

export class CalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère les événements à venir basés sur les métadonnées des notes
   * Note: Nécessite le module P2 (métadonnées) pour fonctionner pleinement
   * En attendant, retourne un tableau vide ou des données mockées
   */
  async getUpcomingEvents(userId: string, limit: number = 5): Promise<CalendarEvent[]> {
    // TODO: Implémenter quand le système de métadonnées sera en place
    // Pour l'instant, retourner un placeholder
    
    // Future implémentation :
    // const notes = await this.prisma.note.findMany({
    //   where: {
    //     metadata: { path: ['dueDate'], not: null },
    //     OR: [
    //       { ownerId: userId },
    //       { folder: { permissions: { some: { userId } } } }
    //     ]
    //   },
    //   orderBy: { metadata: { path: ['dueDate'], sort: 'asc' } },
    //   take: limit
    // });

    return [];
  }
}
```

#### calendar.schema.ts

```typescript
// apps/api/src/modules/calendar/calendar.schema.ts

import { z } from 'zod';

export const GetUpcomingEventsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(20).optional().default(5)
});

export type GetUpcomingEventsQuery = z.infer<typeof GetUpcomingEventsQuerySchema>;
```

### 3.3 Frontend (React)

#### Types/Interfaces

```typescript
// packages/shared-types/src/note.ts

export interface NoteWithMetadata {
  id: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  folderPath: string;
  folderId: string;
  isPinned: boolean;
}

export interface PinNoteResult {
  success: boolean;
  status?: number;
  error?: string;
}

// packages/shared-types/src/calendar.ts

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;           // ISO date
  time?: string;          // HH:mm (optionnel)
  noteId: string;
  noteTitle: string;
  type: 'deadline' | 'meeting' | 'reminder' | 'event';
}
```

#### Store Zustand - Homepage

```typescript
// apps/web/src/stores/homepageStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { NoteWithMetadata, CalendarEvent } from '@plumenote/shared-types';
import { notesApi } from '@/services/notesApi';
import { calendarApi } from '@/services/calendarApi';

interface HomepageState {
  // État
  pinnedNotes: NoteWithMetadata[];
  recentNotes: NoteWithMetadata[];
  upcomingEvents: CalendarEvent[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHomepageData: () => Promise<void>;
  pinNote: (noteId: string) => Promise<void>;
  unpinNote: (noteId: string) => Promise<void>;
  refreshPinnedNotes: () => Promise<void>;
  refreshRecentNotes: () => Promise<void>;
}

export const useHomepageStore = create<HomepageState>()(
  devtools(
    (set, get) => ({
      pinnedNotes: [],
      recentNotes: [],
      upcomingEvents: [],
      isLoading: false,
      error: null,

      loadHomepageData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const [pinnedNotes, recentNotes, upcomingEvents] = await Promise.all([
            notesApi.getPinnedNotes(),
            notesApi.getRecentNotes(10),
            calendarApi.getUpcomingEvents(5)
          ]);

          set({
            pinnedNotes,
            recentNotes,
            upcomingEvents,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load homepage data',
            isLoading: false
          });
        }
      },

      pinNote: async (noteId: string) => {
        try {
          await notesApi.pinNote(noteId);
          
          // Mettre à jour l'état local
          const { recentNotes, pinnedNotes } = get();
          
          // Trouver la note dans recentNotes
          const note = recentNotes.find(n => n.id === noteId);
          if (note) {
            const updatedNote = { ...note, isPinned: true };
            
            set({
              pinnedNotes: [updatedNote, ...pinnedNotes],
              recentNotes: recentNotes.map(n => 
                n.id === noteId ? updatedNote : n
              )
            });
          } else {
            // Rafraîchir si la note n'est pas dans la liste
            await get().refreshPinnedNotes();
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to pin note' });
        }
      },

      unpinNote: async (noteId: string) => {
        try {
          await notesApi.unpinNote(noteId);
          
          const { pinnedNotes, recentNotes } = get();
          
          set({
            pinnedNotes: pinnedNotes.filter(n => n.id !== noteId),
            recentNotes: recentNotes.map(n =>
              n.id === noteId ? { ...n, isPinned: false } : n
            )
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to unpin note' });
        }
      },

      refreshPinnedNotes: async () => {
        try {
          const pinnedNotes = await notesApi.getPinnedNotes();
          set({ pinnedNotes });
        } catch (error) {
          console.error('Failed to refresh pinned notes:', error);
        }
      },

      refreshRecentNotes: async () => {
        try {
          const recentNotes = await notesApi.getRecentNotes(10);
          set({ recentNotes });
        } catch (error) {
          console.error('Failed to refresh recent notes:', error);
        }
      }
    }),
    { name: 'homepage-store' }
  )
);
```

#### API Clients

```typescript
// apps/web/src/services/notesApi.ts (ajouts)

import { api } from './api';
import { NoteWithMetadata } from '@plumenote/shared-types';

export const notesApi = {
  // ... existing methods ...

  async getPinnedNotes(): Promise<NoteWithMetadata[]> {
    const response = await api.get<NoteWithMetadata[]>('/notes/pinned');
    return response.data;
  },

  async getRecentNotes(limit: number = 10): Promise<NoteWithMetadata[]> {
    const response = await api.get<NoteWithMetadata[]>('/notes/recent', {
      params: { limit }
    });
    return response.data;
  },

  async pinNote(noteId: string): Promise<void> {
    await api.post(`/notes/${noteId}/pin`);
  },

  async unpinNote(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}/pin`);
  },

  async recordView(noteId: string): Promise<void> {
    await api.post(`/notes/${noteId}/view`);
  }
};

// apps/web/src/services/calendarApi.ts

import { api } from './api';
import { CalendarEvent } from '@plumenote/shared-types';

export const calendarApi = {
  async getUpcomingEvents(limit: number = 5): Promise<CalendarEvent[]> {
    const response = await api.get<CalendarEvent[]>('/calendar/upcoming', {
      params: { limit }
    });
    return response.data;
  }
};
```

#### Composants Homepage

##### HomePage.tsx (refonte complète)

```typescript
// apps/web/src/components/homepage/HomePage.tsx

import { useEffect } from 'react';
import { useHomepageStore } from '@/stores/homepageStore';
import { HomeHeader } from './HomeHeader';
import { SearchBar } from './SearchBar';
import { CalendarWidget } from './CalendarWidget';
import { PinnedNotesSection } from './PinnedNotesSection';
import { RecentNotesSection } from './RecentNotesSection';
import { Skeleton } from '@/components/ui/skeleton';

export function HomePage() {
  const { isLoading, error, loadHomepageData } = useHomepageStore();

  useEffect(() => {
    loadHomepageData();
  }, [loadHomepageData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={loadHomepageData}
            className="text-primary hover:underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage flex flex-col h-full overflow-auto">
      {/* Header avec boutons d'action */}
      <HomeHeader />

      {/* Contenu principal */}
      <main className="flex-1 px-6 py-4 space-y-6 max-w-5xl mx-auto w-full">
        {/* Barre de recherche */}
        <SearchBar />

        {/* Widget Calendrier */}
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <CalendarWidget />
        )}

        {/* Notes épinglées */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <PinnedNotesSection />
        )}

        {/* Notes récentes */}
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <RecentNotesSection />
        )}
      </main>
    </div>
  );
}
```

##### HomeHeader.tsx

```typescript
// apps/web/src/components/homepage/HomeHeader.tsx

import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export function HomeHeader() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const greeting = getGreeting();
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {/* Gauche : Salutation et date */}
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {user?.name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </div>

        {/* Droite : Boutons d'action */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Recherche avancée
          </Button>
          
          <Button 
            size="sm"
            onClick={() => navigate('/notes/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle note
          </Button>
        </div>
      </div>
    </header>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
```

##### CalendarWidget.tsx

```typescript
// apps/web/src/components/homepage/CalendarWidget.tsx

import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock } from 'lucide-react';
import { useHomepageStore } from '@/stores/homepageStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeDate } from '@/lib/dateUtils';
import type { CalendarEvent } from '@plumenote/shared-types';

export function CalendarWidget() {
  const navigate = useNavigate();
  const { upcomingEvents } = useHomepageStore();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Calendar className="h-5 w-5 text-primary" />
          À venir
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/calendar')}
          className="text-sm"
        >
          Voir tout
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      
      <CardContent className="pt-0">
        {upcomingEvents.length === 0 ? (
          <EmptyCalendar />
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.slice(0, 5).map(event => (
              <CalendarEventItem key={event.id} event={event} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarEventItem({ event }: { event: CalendarEvent }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/notes/${event.noteId}`);
  };

  return (
    <li 
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      {/* Indicateur de type */}
      <div className={`w-1 h-10 rounded-full ${getEventTypeColor(event.type)}`} />
      
      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{event.title}</p>
        <p className="text-sm text-muted-foreground truncate">
          Note : {event.noteTitle}
        </p>
      </div>

      {/* Date/Heure */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formatRelativeDate(event.date)}</span>
        {event.time && <span>• {event.time}</span>}
      </div>
    </li>
  );
}

function EmptyCalendar() {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Aucun événement à venir</p>
      <p className="text-xs mt-1">
        Ajoutez des dates dans vos notes pour les voir ici
      </p>
    </div>
  );
}

function getEventTypeColor(type: CalendarEvent['type']): string {
  switch (type) {
    case 'deadline': return 'bg-red-500';
    case 'meeting': return 'bg-blue-500';
    case 'reminder': return 'bg-amber-500';
    case 'event': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
}
```

##### PinnedNotesSection.tsx

```typescript
// apps/web/src/components/homepage/PinnedNotesSection.tsx

import { Pin } from 'lucide-react';
import { useHomepageStore } from '@/stores/homepageStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NoteTable } from './NoteTable';

export function PinnedNotesSection() {
  const { pinnedNotes } = useHomepageStore();

  if (pinnedNotes.length === 0) {
    return null; // Ne pas afficher la section si aucune note épinglée
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Pin className="h-5 w-5 text-primary" />
          Notes épinglées
          <span className="text-muted-foreground font-normal text-sm">
            ({pinnedNotes.length})
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <NoteTable notes={pinnedNotes} showPinAction />
      </CardContent>
    </Card>
  );
}
```

##### RecentNotesSection.tsx

```typescript
// apps/web/src/components/homepage/RecentNotesSection.tsx

import { Clock } from 'lucide-react';
import { useHomepageStore } from '@/stores/homepageStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { NoteTable } from './NoteTable';

export function RecentNotesSection() {
  const { recentNotes } = useHomepageStore();

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Clock className="h-5 w-5 text-primary" />
          Notes récentes
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {recentNotes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Aucune note récente</p>
            <p className="text-xs mt-1">
              Vos notes modifiées récemment apparaîtront ici
            </p>
          </div>
        ) : (
          <NoteTable notes={recentNotes} showPinAction />
        )}
      </CardContent>
    </Card>
  );
}
```

##### NoteTable.tsx (composant partagé)

```typescript
// apps/web/src/components/homepage/NoteTable.tsx

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, PinOff, Eye, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHomepageStore } from '@/stores/homepageStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate, formatRelativeDate } from '@/lib/dateUtils';
import type { NoteWithMetadata } from '@plumenote/shared-types';

interface NoteTableProps {
  notes: NoteWithMetadata[];
  showPinAction?: boolean;
}

export const NoteTable = memo(function NoteTable({ 
  notes, 
  showPinAction = true 
}: NoteTableProps) {
  const navigate = useNavigate();
  const { pinNote, unpinNote } = useHomepageStore();

  const handleRowClick = useCallback((noteId: string) => {
    navigate(`/notes/${noteId}`);
  }, [navigate]);

  const handlePinToggle = useCallback(async (
    e: React.MouseEvent, 
    note: NoteWithMetadata
  ) => {
    e.stopPropagation(); // Empêcher la navigation
    
    if (note.isPinned) {
      await unpinNote(note.id);
    } else {
      await pinNote(note.id);
    }
  }, [pinNote, unpinNote]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Titre</th>
            <th className="pb-2 pr-4 font-medium whitespace-nowrap">Créée</th>
            <th className="pb-2 pr-4 font-medium whitespace-nowrap">Modifiée</th>
            <th className="pb-2 pr-4 font-medium text-center">Vues</th>
            <th className="pb-2 pr-4 font-medium">Dossier</th>
            {showPinAction && <th className="pb-2 font-medium w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {notes.map(note => (
            <tr 
              key={note.id}
              onClick={() => handleRowClick(note.id)}
              className={cn(
                "border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                "group"
              )}
            >
              {/* Titre */}
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  {note.isPinned && (
                    <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                  )}
                  <span className="font-medium truncate max-w-xs">
                    {note.title}
                  </span>
                </div>
              </td>

              {/* Date création */}
              <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{formatRelativeDate(note.createdAt)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDate(note.createdAt, 'full')}
                  </TooltipContent>
                </Tooltip>
              </td>

              {/* Date modification */}
              <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{formatRelativeDate(note.updatedAt)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatDate(note.updatedAt, 'full')}
                  </TooltipContent>
                </Tooltip>
              </td>

              {/* Nombre de vues */}
              <td className="py-3 pr-4 text-sm text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>{note.viewCount}</span>
                </div>
              </td>

              {/* Dossier */}
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 truncate max-w-[200px]">
                  <Folder className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{note.folderPath}</span>
                </div>
              </td>

              {/* Action épingler */}
              {showPinAction && (
                <td className="py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handlePinToggle(e, note)}
                      >
                        {note.isPinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {note.isPinned ? 'Désépingler' : 'Épingler'}
                    </TooltipContent>
                  </Tooltip>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
```

#### Utilitaires de date

```typescript
// apps/web/src/lib/dateUtils.ts

/**
 * Formate une date de manière relative (il y a 2 heures, hier, etc.)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'À l\'instant';
  }
  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`;
  }
  if (diffDays === 1) {
    return 'Hier';
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }
  
  return formatDate(dateString, 'short');
}

/**
 * Formate une date selon différents formats
 */
export function formatDate(
  dateString: string, 
  format: 'short' | 'medium' | 'full' = 'medium'
): string {
  const date = new Date(dateString);
  
  const options: Record<typeof format, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    full: { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return new Intl.DateTimeFormat('fr-FR', options[format]).format(date);
}
```

#### Bouton Pin dans l'éditeur

```typescript
// apps/web/src/components/editor/EditorToolbar.tsx (ajout)

import { Pin, PinOff } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { useHomepageStore } from '@/stores/homepageStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PinButtonProps {
  noteId: string;
  isPinned: boolean;
}

export function PinButton({ noteId, isPinned }: PinButtonProps) {
  const { pinNote, unpinNote } = useHomepageStore();
  const { updateNote } = useNoteStore();

  const handleToggle = async () => {
    if (isPinned) {
      await unpinNote(noteId);
      updateNote(noteId, { isPinned: false });
    } else {
      await pinNote(noteId);
      updateNote(noteId, { isPinned: true });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className={isPinned ? 'text-primary' : ''}
        >
          {isPinned ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPinned ? 'Désépingler cette note' : 'Épingler cette note'}
      </TooltipContent>
    </Tooltip>
  );
}
```

#### Hook pour tracker les vues

```typescript
// apps/web/src/hooks/useNoteView.ts

import { useEffect, useRef } from 'react';
import { notesApi } from '@/services/notesApi';

/**
 * Hook pour enregistrer une vue de note
 * Déclenche l'API après un délai pour éviter les vues accidentelles
 */
export function useNoteView(noteId: string | undefined) {
  const hasRecorded = useRef(false);

  useEffect(() => {
    if (!noteId || hasRecorded.current) return;

    // Attendre 3 secondes avant d'enregistrer la vue
    const timeoutId = setTimeout(async () => {
      try {
        await notesApi.recordView(noteId);
        hasRecorded.current = true;
      } catch (error) {
        console.error('Failed to record view:', error);
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [noteId]);

  // Reset si la note change
  useEffect(() => {
    hasRecorded.current = false;
  }, [noteId]);
}
```

---

## 4. Tests

### 4.1 Tests unitaires Backend

```typescript
// apps/api/src/modules/notes/__tests__/notes.service.pin.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesService } from '../notes.service';
import { prismaMock } from '@/test/prisma-mock';

describe('NotesService - Pinning', () => {
  let service: NotesService;

  beforeEach(() => {
    service = new NotesService(prismaMock);
    vi.clearAllMocks();
  });

  describe('pinNote', () => {
    it('should pin a note successfully', async () => {
      prismaMock.note.findFirst.mockResolvedValue({ id: 'note-1' });
      prismaMock.userPinnedNote.findUnique.mockResolvedValue(null);
      prismaMock.userPinnedNote.create.mockResolvedValue({ id: 'pin-1' });

      const result = await service.pinNote('note-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prismaMock.userPinnedNote.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', noteId: 'note-1' }
      });
    });

    it('should return 404 when note not found', async () => {
      prismaMock.note.findFirst.mockResolvedValue(null);

      const result = await service.pinNote('nonexistent', 'user-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should return 409 when already pinned', async () => {
      prismaMock.note.findFirst.mockResolvedValue({ id: 'note-1' });
      prismaMock.userPinnedNote.findUnique.mockResolvedValue({ id: 'existing' });

      const result = await service.pinNote('note-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(409);
    });
  });

  describe('unpinNote', () => {
    it('should unpin a note', async () => {
      prismaMock.userPinnedNote.deleteMany.mockResolvedValue({ count: 1 });

      await service.unpinNote('note-1', 'user-1');

      expect(prismaMock.userPinnedNote.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', noteId: 'note-1' }
      });
    });
  });

  describe('getPinnedNotes', () => {
    it('should return pinned notes with metadata', async () => {
      prismaMock.userPinnedNote.findMany.mockResolvedValue([
        {
          note: {
            id: 'note-1',
            title: 'Test Note',
            viewCount: 10,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
            folder: {
              id: 'folder-1',
              name: 'Projects',
              parent: { id: 'root', name: 'Work' }
            }
          }
        }
      ]);

      const result = await service.getPinnedNotes('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'note-1',
        title: 'Test Note',
        viewCount: 10,
        folderPath: 'Work/Projects',
        isPinned: true
      });
    });
  });

  describe('getRecentNotes', () => {
    it('should return recent notes with correct ordering', async () => {
      const mockNotes = [
        {
          id: 'note-2',
          title: 'Recent',
          viewCount: 5,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-20'),
          folder: { id: 'f1', name: 'Folder', parent: null },
          pinnedBy: []
        },
        {
          id: 'note-1',
          title: 'Older',
          viewCount: 20,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          folder: { id: 'f1', name: 'Folder', parent: null },
          pinnedBy: [{ id: 'pin-1' }]
        }
      ];

      prismaMock.note.findMany.mockResolvedValue(mockNotes);

      const result = await service.getRecentNotes('user-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('note-2'); // Plus récent en premier
      expect(result[1].isPinned).toBe(true);
    });
  });
});
```

### 4.2 Tests unitaires Frontend

```typescript
// apps/web/src/components/homepage/__tests__/NoteTable.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NoteTable } from '../NoteTable';
import { useHomepageStore } from '@/stores/homepageStore';

vi.mock('@/stores/homepageStore');

const mockNotes = [
  {
    id: 'note-1',
    title: 'Test Note',
    viewCount: 42,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    folderPath: 'Projects/Alpha',
    folderId: 'folder-1',
    isPinned: false
  },
  {
    id: 'note-2',
    title: 'Pinned Note',
    viewCount: 100,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
    folderPath: 'Work',
    folderId: 'folder-2',
    isPinned: true
  }
];

describe('NoteTable', () => {
  const mockPinNote = vi.fn();
  const mockUnpinNote = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useHomepageStore as unknown as vi.Mock).mockReturnValue({
      pinNote: mockPinNote,
      unpinNote: mockUnpinNote
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <NoteTable notes={mockNotes} showPinAction />
      </BrowserRouter>
    );
  };

  it('should render all notes', () => {
    renderComponent();
    
    expect(screen.getByText('Test Note')).toBeInTheDocument();
    expect(screen.getByText('Pinned Note')).toBeInTheDocument();
  });

  it('should display view count', () => {
    renderComponent();
    
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display folder path', () => {
    renderComponent();
    
    expect(screen.getByText('Projects/Alpha')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('should show pin icon for pinned notes', () => {
    renderComponent();
    
    // La note épinglée doit avoir l'icône Pin dans le titre
    const pinnedRow = screen.getByText('Pinned Note').closest('tr');
    expect(pinnedRow).toBeInTheDocument();
  });

  it('should call pinNote when clicking pin button on unpinned note', async () => {
    renderComponent();
    
    // Trouver le bouton pin pour la note non épinglée
    const rows = screen.getAllByRole('row');
    const unpinnedRow = rows.find(row => row.textContent?.includes('Test Note'));
    const pinButton = unpinnedRow?.querySelector('button');
    
    if (pinButton) {
      fireEvent.click(pinButton);
      expect(mockPinNote).toHaveBeenCalledWith('note-1');
    }
  });

  it('should call unpinNote when clicking unpin button on pinned note', async () => {
    renderComponent();
    
    const rows = screen.getAllByRole('row');
    const pinnedRow = rows.find(row => row.textContent?.includes('Pinned Note'));
    const unpinButton = pinnedRow?.querySelector('button');
    
    if (unpinButton) {
      fireEvent.click(unpinButton);
      expect(mockUnpinNote).toHaveBeenCalledWith('note-2');
    }
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/homepage.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should display header with greeting and action buttons', async ({ page }) => {
    // Vérifier le header
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bonjour|Bon après-midi|Bonsoir/);
    
    // Vérifier les boutons
    await expect(page.getByRole('button', { name: /recherche avancée/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle note/i })).toBeVisible();
  });

  test('should display calendar widget', async ({ page }) => {
    const calendarSection = page.getByText('À venir');
    await expect(calendarSection).toBeVisible();
    
    // Vérifier le bouton "Voir tout"
    await expect(page.getByRole('button', { name: /voir tout/i })).toBeVisible();
  });

  test('should navigate to calendar on "Voir tout" click', async ({ page }) => {
    await page.getByRole('button', { name: /voir tout/i }).click();
    await expect(page).toHaveURL('/calendar');
  });

  test('should display recent notes section', async ({ page }) => {
    const recentSection = page.getByText('Notes récentes');
    await expect(recentSection).toBeVisible();
  });

  test('should navigate to note on row click', async ({ page }) => {
    // Créer une note via l'API ou fixture
    
    // Cliquer sur une ligne de note
    const noteRow = page.locator('tr').filter({ hasText: 'Test Note' });
    await noteRow.click();
    
    await expect(page).toHaveURL(/\/notes\/[a-z0-9]+$/);
  });
});

test.describe('Pin functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should pin a note from homepage', async ({ page }) => {
    // Trouver une note non épinglée
    const noteRow = page.locator('tr').filter({ hasText: 'Test Note' }).first();
    
    // Hover pour afficher le bouton
    await noteRow.hover();
    
    // Cliquer sur le bouton épingler
    const pinButton = noteRow.locator('button');
    await pinButton.click();
    
    // Vérifier que la section "Notes épinglées" apparaît
    await expect(page.getByText('Notes épinglées')).toBeVisible();
  });

  test('should unpin a note', async ({ page }) => {
    // Supposer qu'il y a déjà une note épinglée
    const pinnedSection = page.getByText('Notes épinglées').locator('..');
    const pinnedNote = pinnedSection.locator('tr').first();
    
    await pinnedNote.hover();
    const unpinButton = pinnedNote.locator('button');
    await unpinButton.click();
    
    // La note ne devrait plus être dans la section épinglée
    await expect(pinnedNote).not.toBeVisible();
  });

  test('should pin note from editor toolbar', async ({ page }) => {
    // Ouvrir une note
    await page.goto('/notes/test-note-id');
    
    // Cliquer sur le bouton épingler dans la toolbar
    const pinButton = page.locator('[data-testid="pin-button"]');
    await pinButton.click();
    
    // Vérifier l'état visuel
    await expect(pinButton).toHaveClass(/text-primary/);
  });
});

test.describe('Note metadata display', () => {
  test('should display all metadata columns', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier les en-têtes de colonnes
    await expect(page.getByText('Titre')).toBeVisible();
    await expect(page.getByText('Créée')).toBeVisible();
    await expect(page.getByText('Modifiée')).toBeVisible();
    await expect(page.getByText('Vues')).toBeVisible();
    await expect(page.getByText('Dossier')).toBeVisible();
  });

  test('should show view count for each note', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier qu'il y a des compteurs de vues
    const eyeIcons = page.locator('svg.lucide-eye');
    await expect(eyeIcons.first()).toBeVisible();
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Database : Créer la migration**
    
    - Ajouter le champ `viewCount` sur `Note`
    - Créer la table `UserPinnedNote`
    - Créer les index
2. [ ] **Backend : Implémenter les endpoints de pinning**
    
    - `POST /notes/:id/pin`
    - `DELETE /notes/:id/pin`
    - `GET /notes/pinned`
3. [ ] **Backend : Enrichir l'endpoint notes/recent**
    
    - Ajouter `viewCount`, `folderPath`, `isPinned`
    - Inclure les jointures nécessaires
4. [ ] **Backend : Implémenter le compteur de vues**
    
    - `POST /notes/:id/view`
5. [ ] **Backend : Créer le module calendar**
    
    - Endpoint placeholder `/calendar/upcoming`
    - À compléter avec le module P2 (métadonnées)
6. [ ] **Shared-types : Définir les interfaces**
    
    - `NoteWithMetadata`, `CalendarEvent`
    - Build du package
7. [ ] **Frontend : Créer le store homepage**
    
    - Actions pour charger les données
    - Actions pour pin/unpin
8. [ ] **Frontend : Refactorer HomeHeader**
    
    - Déplacer les boutons en haut à droite
9. [ ] **Frontend : Créer CalendarWidget**
    
    - Affichage des 5 prochains événements
    - Bouton "Voir tout"
10. [ ] **Frontend : Créer PinnedNotesSection**
    
    - Tableau avec métadonnées complètes
11. [ ] **Frontend : Créer RecentNotesSection**
    
    - Réutilisation du NoteTable
12. [ ] **Frontend : Créer NoteTable**
    
    - Composant partagé avec colonnes configurables
    - Actions pin/unpin intégrées
13. [ ] **Frontend : Ajouter PinButton à l'éditeur**
    
    - Dans la toolbar de l'éditeur
14. [ ] **Frontend : Implémenter useNoteView**
    
    - Hook pour enregistrer les vues
15. [ ] **Tests : Suite complète**
    
    - Tests unitaires backend
    - Tests composants frontend
    - Tests E2E

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Performance avec beaucoup de notes épinglées|Faible|Faible|Pas de limite technique, UI peut scroller|
|Désynchronisation état pin entre pages|Moyenne|Moyen|Store global + invalidation après action|
|Compteur de vues exploité (spam)|Moyenne|Faible|Délai 3s + possible dédoublonnage par user|
|Calendrier vide sans métadonnées|Élevée|Moyen|Message explicatif + dépend du module P2|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Créer la migration Prisma
cd /path/to/plumenote
npx prisma migrate dev --name add_pinned_notes_and_view_count

# 2. Générer le client Prisma
npx prisma generate

# 3. Créer les types partagés
cd packages/shared-types
# Ajouter NoteWithMetadata, CalendarEvent dans src/
npm run build

# 4. Implémenter le backend
cd ../../apps/api
# Modifier src/modules/notes/
# Créer src/modules/calendar/
npm run test -- notes calendar

# 5. Implémenter le frontend
cd ../web
# Créer les fichiers dans src/components/homepage/
# Créer src/stores/homepageStore.ts
npm run test -- homepage

# 6. Tests E2E
cd ../..
npm run test:e2e -- homepage
```

### Points d'attention

- **Tri des notes** : Le tri `updatedAt DESC` doit être fait côté Prisma, pas côté frontend
- **FolderPath** : Construire le chemin complet en incluant le parent du dossier (2 niveaux max)
- **Performance** : Utiliser `Promise.all` pour charger les 3 sections en parallèle
- **Optimistic UI** : Mettre à jour l'état local immédiatement lors du pin/unpin
- **Calendrier** : Le widget sera vide tant que le module P2 (métadonnées) n'est pas implémenté
- **Compteur de vues** : Le hook `useNoteView` doit être appelé dans la page/composant de note

### Dépendances npm à installer (si nécessaire)

```bash
# Frontend (si pas déjà installées)
npm install date-fns  # Alternative pour les dates si besoin

# Aucune nouvelle dépendance majeure requise
```

---

## 7. Annexes

### A. Arborescence des fichiers à créer/modifier

```
plumenote/
├── prisma/
│   ├── schema.prisma                           # [MODIFIER] Ajouter UserPinnedNote, viewCount
│   └── migrations/
│       └── YYYYMMDD_add_pinned_notes/          # [CRÉER] Migration
│
├── packages/
│   └── shared-types/
│       └── src/
│           ├── note.ts                         # [MODIFIER] Ajouter NoteWithMetadata
│           └── calendar.ts                     # [CRÉER] CalendarEvent
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── modules/
│   │           ├── notes/
│   │           │   ├── notes.controller.ts     # [MODIFIER] Ajouter endpoints pin
│   │           │   ├── notes.service.ts        # [MODIFIER] Logique pin + recent
│   │           │   ├── notes.schema.ts         # [MODIFIER] Schemas validation
│   │           │   └── __tests__/
│   │           │       └── notes.service.pin.test.ts # [CRÉER]
│   │           └── calendar/                   # [CRÉER] Nouveau module
│   │               ├── calendar.controller.ts
│   │               ├── calendar.service.ts
│   │               └── calendar.schema.ts
│   │
│   └── web/
│       └── src/
│           ├── stores/
│           │   └── homepageStore.ts            # [CRÉER]
│           ├── services/
│           │   ├── notesApi.ts                 # [MODIFIER] Ajouter méthodes pin
│           │   └── calendarApi.ts              # [CRÉER]
│           ├── components/
│           │   ├── homepage/
│           │   │   ├── HomePage.tsx            # [MODIFIER] Refonte layout
│           │   │   ├── HomeHeader.tsx          # [CRÉER]
│           │   │   ├── CalendarWidget.tsx      # [CRÉER]
│           │   │   ├── PinnedNotesSection.tsx  # [CRÉER]
│           │   │   ├── RecentNotesSection.tsx  # [CRÉER]
│           │   │   ├── NoteTable.tsx           # [CRÉER]
│           │   │   └── __tests__/
│           │   │       └── NoteTable.test.tsx  # [CRÉER]
│           │   └── editor/
│           │       └── EditorToolbar.tsx       # [MODIFIER] Ajouter PinButton
│           ├── hooks/
│           │   └── useNoteView.ts              # [CRÉER]
│           └── lib/
│               └── dateUtils.ts                # [CRÉER]
│
└── e2e/
    └── homepage.spec.ts                        # [CRÉER]
```

### B. Checklist de validation

Avant de considérer ce module comme terminé :

**Layout Homepage :**

- [ ] Boutons "Recherche avancée" et "Nouvelle note" en haut à droite
- [ ] Widget Calendrier visible sous la barre de recherche
- [ ] Section "Notes épinglées" visible (si notes épinglées)
- [ ] Section "Notes récentes" affiche 10 notes max
- [ ] Plus de widgets latéraux (Statistiques, Raccourcis supprimés)

**Feature Épingler :**

- [ ] On peut épingler depuis la homepage (bouton au hover)
- [ ] On peut épingler depuis l'éditeur (toolbar)
- [ ] On peut désépingler de la même manière
- [ ] L'état est persisté après refresh
- [ ] L'épinglage est propre à chaque utilisateur

**Données :**

- [ ] Chaque note affiche : titre, date création, date modif, vues, dossier
- [ ] Les dates sont formatées de manière relative
- [ ] Le chemin du dossier inclut le parent si existant

**Tests :**

- [ ] Tests unitaires backend passent
- [ ] Tests composants frontend passent
- [ ] Tests E2E passent
- [ ] Aucune régression