# Spécifications Techniques - CollabNotes Améliorations v2

## Vue d'ensemble des demandes

| #   | Demande                                             | Type          | Priorité    | Complexité |
| --- | --------------------------------------------------- | ------------- | ----------- | ---------- |
| 1   | Assouplissement/Suppression Rate Limiting           | Configuration | P0-Critique | S          |
| 2   | Synchronisation temps réel sidebar (création notes) | Bugfix        | P0-Critique | M          |
| 3   | Coloration syntaxique des blocs de code             | Feature       | P2-Moyenne  | M          |
| 4   | Gestion des assets/images locaux                    | Feature       | P1-Haute    | XL         |
| 5   | Coloration visuelle des dossiers                    | Feature       | P2-Moyenne  | M          |
| 6   | Bouton sortie Split View                            | Bugfix        | P1-Haute    | S          |
| 7   | Audit/Correction raccourcis clavier                 | Évaluation    | P2-Moyenne  | M          |

---

# 1. ASSOUPLISSEMENT RATE LIMITING

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Configuration / Refactor|
|Priorité|P0-Critique|
|Complexité|S|
|Modules impactés|Backend (middleware, config)|
|Estimation|0.5 jour|

### Description

Le rate limiting actuel est trop restrictif pour un usage collaboratif multi-utilisateurs (plusieurs dizaines simultanément). La solution consiste à soit supprimer le rate limiting pour les utilisateurs authentifiés, soit l'augmenter très significativement avec des limites différenciées par type d'opération.

### Critères d'acceptation

- [ ] Les utilisateurs authentifiés peuvent effectuer au minimum 1000 requêtes/minute
- [ ] Les opérations de lecture (GET) ont des limites plus hautes que les écritures
- [ ] Le rate limiting reste actif pour les routes d'authentification (protection brute force)
- [ ] Un système de logging permet de monitorer les abus potentiels
- [ ] La configuration est externalisée (variables d'environnement)

---

## 2. Analyse technique

### 2.1 Contexte actuel

Le rate limiting est probablement implémenté via un plugin Fastify (`@fastify/rate-limit`) avec des limites uniformes trop basses pour un contexte collaboratif.

### 2.2 Solution proposée

Implémenter un rate limiting différencié :

- **Routes publiques/auth** : Limites strictes (10-20 req/min) pour protection brute force
- **Routes authentifiées lecture** : Limites très hautes ou désactivées (10000 req/min)
- **Routes authentifiées écriture** : Limites hautes (1000 req/min)
- **WebSocket** : Pas de rate limiting (géré par Hocuspocus)

---

## 3. Spécifications détaillées

### 3.1 Configuration

#### Fichier: `apps/api/src/config/rate-limit.config.ts`

```typescript
export interface RateLimitConfig {
  enabled: boolean;
  public: {
    max: number;
    timeWindow: string;
  };
  authenticated: {
    read: {
      max: number;
      timeWindow: string;
    };
    write: {
      max: number;
      timeWindow: string;
    };
  };
  auth: {
    max: number;
    timeWindow: string;
  };
}

export const rateLimitConfig: RateLimitConfig = {
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  public: {
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_PUBLIC_WINDOW || '1 minute',
  },
  authenticated: {
    read: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_READ_MAX || '10000', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_READ_WINDOW || '1 minute',
    },
    write: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_WRITE_MAX || '1000', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_WRITE_WINDOW || '1 minute',
    },
  },
  auth: {
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    timeWindow: process.env.RATE_LIMIT_AUTH_WINDOW || '1 minute',
  },
};
```

### 3.2 Middleware Rate Limit

#### Fichier: `apps/api/src/shared/middleware/rate-limit.middleware.ts`

```typescript
import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { rateLimitConfig } from '../../config/rate-limit.config';

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export async function registerRateLimitMiddleware(app: FastifyInstance): Promise<void> {
  if (!rateLimitConfig.enabled) {
    app.log.warn('Rate limiting is DISABLED');
    return;
  }

  // Rate limit global avec configuration dynamique
  await app.register(fastifyRateLimit, {
    global: true,
    max: (request: FastifyRequest) => {
      // Routes d'authentification : limites strictes
      if (request.url.startsWith('/api/v1/auth')) {
        return rateLimitConfig.auth.max;
      }
      
      // Utilisateur authentifié
      if (request.user) {
        return READ_METHODS.includes(request.method)
          ? rateLimitConfig.authenticated.read.max
          : rateLimitConfig.authenticated.write.max;
      }
      
      // Requêtes non authentifiées
      return rateLimitConfig.public.max;
    },
    timeWindow: (request: FastifyRequest) => {
      if (request.url.startsWith('/api/v1/auth')) {
        return rateLimitConfig.auth.timeWindow;
      }
      
      if (request.user) {
        return READ_METHODS.includes(request.method)
          ? rateLimitConfig.authenticated.read.timeWindow
          : rateLimitConfig.authenticated.write.timeWindow;
      }
      
      return rateLimitConfig.public.timeWindow;
    },
    keyGenerator: (request: FastifyRequest) => {
      // Clé basée sur l'utilisateur si authentifié, sinon IP
      return request.user?.id || request.ip;
    },
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
      retryAfter: context.after,
    }),
    onExceeded: (request, key) => {
      request.log.warn({ key, url: request.url }, 'Rate limit exceeded');
    },
  });
}
```

### 3.3 Variables d'environnement

#### Fichier: `.env.example` (ajouts)

```bash
# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PUBLIC_MAX=100
RATE_LIMIT_PUBLIC_WINDOW=1 minute
RATE_LIMIT_AUTH_READ_MAX=10000
RATE_LIMIT_AUTH_READ_WINDOW=1 minute
RATE_LIMIT_AUTH_WRITE_MAX=1000
RATE_LIMIT_AUTH_WRITE_WINDOW=1 minute
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=1 minute
```

---

## 4. Tests

### 4.1 Tests unitaires

```typescript
// Fichier: apps/api/src/shared/middleware/__tests__/rate-limit.middleware.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../../app';

describe('Rate Limit Middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ testing: true });
  });

  it('should allow authenticated users high request volume', async () => {
    const token = await getAuthToken(app);
    
    // Simuler 100 requêtes rapides
    const requests = Array(100).fill(null).map(() =>
      app.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    
    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.statusCode === 200).length;
    
    expect(successCount).toBe(100);
  });

  it('should strictly limit auth routes', async () => {
    const requests = Array(15).fill(null).map(() =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'test@test.com', password: 'wrong' },
      })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.statusCode === 429).length;
    
    expect(rateLimited).toBeGreaterThan(0);
  });
});
```

---

## 5. Plan d'implémentation

1. [ ] Créer le fichier de configuration `rate-limit.config.ts`
2. [ ] Modifier/créer le middleware `rate-limit.middleware.ts`
3. [ ] Mettre à jour `.env.example` avec les nouvelles variables
4. [ ] Mettre à jour la documentation
5. [ ] Tester en charge

---

# 2. SYNCHRONISATION TEMPS RÉEL SIDEBAR (CRÉATION NOTES)

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Bugfix / Amélioration|
|Priorité|P0-Critique|
|Complexité|M|
|Modules impactés|Backend (WebSocket events), Frontend (stores, sidebar)|
|Estimation|1.5 jours|

### Description

Actuellement, lors de la création d'une note dans un dossier, celle-ci n'apparaît pas immédiatement dans l'arborescence sidebar. La note doit être visible en moins de 2 secondes pour tous les utilisateurs connectés ayant accès à ce dossier.

### Critères d'acceptation

- [ ] Une note créée apparaît dans la sidebar en < 2 secondes pour le créateur
- [ ] Une note créée apparaît dans la sidebar en < 2 secondes pour tous les utilisateurs connectés ayant accès
- [ ] L'arborescence se met à jour sans refresh manuel
- [ ] Le comportement est identique pour les dossiers personnels et partagés
- [ ] La note créée est automatiquement développée/visible dans l'arborescence

---

## 2. Analyse technique

### 2.1 Contexte actuel

La création de note passe par l'API REST mais la mise à jour de l'arborescence sidebar ne bénéficie pas d'un système de notification temps réel. Le store Zustand n'est pas notifié des changements effectués par d'autres utilisateurs.

### 2.2 Solution proposée

Implémenter un système d'événements WebSocket pour les opérations CRUD sur les notes et dossiers :

1. Le backend émet un événement WebSocket lors de la création/modification/suppression
2. Le frontend écoute ces événements et met à jour le store en conséquence
3. Utiliser les rooms WebSocket pour cibler uniquement les utilisateurs ayant accès

### 2.3 Diagramme de séquence

```
┌─────────┐          ┌─────────┐          ┌──────────┐          ┌─────────┐
│ User A  │          │   API   │          │ WebSocket│          │ User B  │
└────┬────┘          └────┬────┘          └────┬─────┘          └────┬────┘
     │                    │                    │                     │
     │ POST /notes        │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ emit('note:created')                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │   201 Created      │                    │ broadcast to room   │
     │<───────────────────│                    │────────────────────>│
     │                    │                    │                     │
     │ Update local store │                    │   Update store      │
     │                    │                    │                     │
```

---

## 3. Spécifications détaillées

### 3.1 Backend - Service d'événements

#### Fichier: `apps/api/src/infrastructure/websocket/events.service.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Note, Folder } from '@prisma/client';

export interface TreeEvent {
  type: 'note:created' | 'note:updated' | 'note:deleted' | 'note:moved' |
        'folder:created' | 'folder:updated' | 'folder:deleted' | 'folder:moved';
  payload: {
    id: string;
    parentId: string | null;
    workspaceId: string;
    data?: Partial<Note | Folder>;
  };
  timestamp: number;
  userId: string;
}

export class TreeEventsService {
  constructor(private io: SocketIOServer) {}

  emitNoteCreated(note: Note, userId: string): void {
    const event: TreeEvent = {
      type: 'note:created',
      payload: {
        id: note.id,
        parentId: note.folderId,
        workspaceId: note.workspaceId,
        data: {
          id: note.id,
          title: note.title,
          folderId: note.folderId,
          workspaceId: note.workspaceId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      },
      timestamp: Date.now(),
      userId,
    };

    // Émettre à la room du workspace
    this.io.to(`workspace:${note.workspaceId}`).emit('tree:event', event);
    
    // Si dans un dossier personnel, émettre aussi à la room personnelle
    if (note.isPersonal) {
      this.io.to(`user:${note.ownerId}:personal`).emit('tree:event', event);
    }
  }

  emitNoteDeleted(noteId: string, workspaceId: string, folderId: string | null, userId: string): void {
    const event: TreeEvent = {
      type: 'note:deleted',
      payload: {
        id: noteId,
        parentId: folderId,
        workspaceId,
      },
      timestamp: Date.now(),
      userId,
    };

    this.io.to(`workspace:${workspaceId}`).emit('tree:event', event);
  }

  emitNoteMoved(note: Note, previousFolderId: string | null, userId: string): void {
    const event: TreeEvent = {
      type: 'note:moved',
      payload: {
        id: note.id,
        parentId: note.folderId,
        workspaceId: note.workspaceId,
        data: {
          previousFolderId,
          newFolderId: note.folderId,
        },
      },
      timestamp: Date.now(),
      userId,
    };

    this.io.to(`workspace:${note.workspaceId}`).emit('tree:event', event);
  }

  // Méthodes similaires pour folders...
  emitFolderCreated(folder: Folder, userId: string): void {
    const event: TreeEvent = {
      type: 'folder:created',
      payload: {
        id: folder.id,
        parentId: folder.parentId,
        workspaceId: folder.workspaceId,
        data: {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          workspaceId: folder.workspaceId,
        },
      },
      timestamp: Date.now(),
      userId,
    };

    this.io.to(`workspace:${folder.workspaceId}`).emit('tree:event', event);
  }
}
```

### 3.2 Backend - Intégration dans le service Notes

#### Fichier: `apps/api/src/modules/notes/notes.service.ts` (modification)

```typescript
import { TreeEventsService } from '../../infrastructure/websocket/events.service';

export class NotesService {
  constructor(
    private repository: NotesRepository,
    private treeEvents: TreeEventsService,
  ) {}

  async createNote(data: CreateNoteInput, userId: string): Promise<Note> {
    const note = await this.repository.create({
      ...data,
      ownerId: userId,
    });

    // Émettre l'événement temps réel
    this.treeEvents.emitNoteCreated(note, userId);

    return note;
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await this.repository.findById(noteId);
    if (!note) throw new NotFoundError('Note not found');

    await this.repository.delete(noteId);

    // Émettre l'événement temps réel
    this.treeEvents.emitNoteDeleted(noteId, note.workspaceId, note.folderId, userId);
  }

  async moveNote(noteId: string, targetFolderId: string | null, userId: string): Promise<Note> {
    const note = await this.repository.findById(noteId);
    if (!note) throw new NotFoundError('Note not found');

    const previousFolderId = note.folderId;
    const updatedNote = await this.repository.update(noteId, { folderId: targetFolderId });

    // Émettre l'événement temps réel
    this.treeEvents.emitNoteMoved(updatedNote, previousFolderId, userId);

    return updatedNote;
  }
}
```

### 3.3 Frontend - Hook WebSocket pour les événements tree

#### Fichier: `apps/web/src/hooks/useTreeEvents.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useFolderStore } from '../stores/folderStore';
import { useNoteStore } from '../stores/noteStore';
import { TreeEvent } from '@collabnotes/shared-types';

export function useTreeEvents(workspaceId: string | null): void {
  const socket = useSocket();
  const { addNote, removeNote, updateNote, moveNote } = useNoteStore();
  const { addFolder, removeFolder, updateFolder } = useFolderStore();

  const handleTreeEvent = useCallback((event: TreeEvent) => {
    switch (event.type) {
      case 'note:created':
        if (event.payload.data) {
          addNote(event.payload.data as NoteTreeItem);
        }
        break;
      
      case 'note:deleted':
        removeNote(event.payload.id);
        break;
      
      case 'note:moved':
        moveNote(
          event.payload.id,
          event.payload.data?.previousFolderId as string | null,
          event.payload.parentId
        );
        break;
      
      case 'note:updated':
        if (event.payload.data) {
          updateNote(event.payload.id, event.payload.data);
        }
        break;

      case 'folder:created':
        if (event.payload.data) {
          addFolder(event.payload.data as FolderTreeItem);
        }
        break;

      case 'folder:deleted':
        removeFolder(event.payload.id);
        break;

      default:
        console.warn('Unknown tree event type:', event.type);
    }
  }, [addNote, removeNote, updateNote, moveNote, addFolder, removeFolder, updateFolder]);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    // Rejoindre la room du workspace
    socket.emit('join:workspace', workspaceId);

    // Écouter les événements
    socket.on('tree:event', handleTreeEvent);

    return () => {
      socket.off('tree:event', handleTreeEvent);
      socket.emit('leave:workspace', workspaceId);
    };
  }, [socket, workspaceId, handleTreeEvent]);
}
```

### 3.4 Frontend - Modification du Store Notes

#### Fichier: `apps/web/src/stores/noteStore.ts` (modification)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface NoteTreeItem {
  id: string;
  title: string;
  folderId: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteStoreState {
  notes: Map<string, NoteTreeItem>;
  notesByFolder: Map<string | null, Set<string>>;
}

interface NoteStoreActions {
  addNote: (note: NoteTreeItem) => void;
  removeNote: (noteId: string) => void;
  updateNote: (noteId: string, data: Partial<NoteTreeItem>) => void;
  moveNote: (noteId: string, fromFolderId: string | null, toFolderId: string | null) => void;
  setNotes: (notes: NoteTreeItem[]) => void;
}

export const useNoteStore = create<NoteStoreState & NoteStoreActions>()(
  immer((set, get) => ({
    notes: new Map(),
    notesByFolder: new Map(),

    addNote: (note) => {
      set((state) => {
        // Ajouter la note
        state.notes.set(note.id, note);
        
        // Mettre à jour l'index par dossier
        const folderId = note.folderId;
        if (!state.notesByFolder.has(folderId)) {
          state.notesByFolder.set(folderId, new Set());
        }
        state.notesByFolder.get(folderId)!.add(note.id);
      });
    },

    removeNote: (noteId) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (note) {
          // Retirer de l'index par dossier
          state.notesByFolder.get(note.folderId)?.delete(noteId);
          // Supprimer la note
          state.notes.delete(noteId);
        }
      });
    },

    updateNote: (noteId, data) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (note) {
          state.notes.set(noteId, { ...note, ...data });
        }
      });
    },

    moveNote: (noteId, fromFolderId, toFolderId) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (note) {
          // Retirer de l'ancien dossier
          state.notesByFolder.get(fromFolderId)?.delete(noteId);
          
          // Ajouter au nouveau dossier
          if (!state.notesByFolder.has(toFolderId)) {
            state.notesByFolder.set(toFolderId, new Set());
          }
          state.notesByFolder.get(toFolderId)!.add(noteId);
          
          // Mettre à jour la note
          state.notes.set(noteId, { ...note, folderId: toFolderId });
        }
      });
    },

    setNotes: (notes) => {
      set((state) => {
        state.notes = new Map(notes.map(n => [n.id, n]));
        state.notesByFolder = new Map();
        
        notes.forEach(note => {
          if (!state.notesByFolder.has(note.folderId)) {
            state.notesByFolder.set(note.folderId, new Set());
          }
          state.notesByFolder.get(note.folderId)!.add(note.id);
        });
      });
    },
  }))
);
```

### 3.5 Frontend - Intégration dans la Sidebar

#### Fichier: `apps/web/src/components/sidebar/Sidebar.tsx` (modification)

```typescript
import { useTreeEvents } from '../../hooks/useTreeEvents';
import { useWorkspace } from '../../hooks/useWorkspace';

export function Sidebar() {
  const { currentWorkspace } = useWorkspace();
  
  // Activer la synchronisation temps réel des événements tree
  useTreeEvents(currentWorkspace?.id ?? null);

  // ... reste du composant
}
```

---

## 4. Tests

### 4.1 Tests d'intégration WebSocket

```typescript
// Fichier: apps/api/src/infrastructure/websocket/__tests__/tree-events.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';
import { buildApp } from '../../../app';

describe('Tree Events WebSocket', () => {
  let app: FastifyInstance;
  let clientA: Socket;
  let clientB: Socket;

  beforeAll(async () => {
    app = await buildApp({ testing: true });
    await app.listen({ port: 0 });
    
    const address = app.server.address();
    const port = typeof address === 'object' ? address?.port : 3000;
    
    clientA = ioClient(`http://localhost:${port}`, { auth: { token: 'tokenA' } });
    clientB = ioClient(`http://localhost:${port}`, { auth: { token: 'tokenB' } });
    
    await Promise.all([
      new Promise(resolve => clientA.on('connect', resolve)),
      new Promise(resolve => clientB.on('connect', resolve)),
    ]);
  });

  afterAll(async () => {
    clientA.close();
    clientB.close();
    await app.close();
  });

  it('should broadcast note creation to all users in workspace room', async () => {
    const workspaceId = 'test-workspace';
    
    // Les deux clients rejoignent le workspace
    clientA.emit('join:workspace', workspaceId);
    clientB.emit('join:workspace', workspaceId);
    
    // Attendre que les rooms soient jointes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Créer une promesse pour recevoir l'événement sur clientB
    const eventPromise = new Promise<TreeEvent>(resolve => {
      clientB.on('tree:event', resolve);
    });

    // Créer une note via l'API (simulé par émission directe)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notes',
      payload: { title: 'Test Note', workspaceId },
      headers: { Authorization: 'Bearer tokenA' },
    });

    expect(response.statusCode).toBe(201);

    // Vérifier que clientB reçoit l'événement
    const event = await eventPromise;
    expect(event.type).toBe('note:created');
    expect(event.payload.data.title).toBe('Test Note');
  });

  it('should receive event within 2 seconds', async () => {
    const startTime = Date.now();
    
    const eventPromise = new Promise<void>(resolve => {
      clientB.on('tree:event', () => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(2000);
        resolve();
      });
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/notes',
      payload: { title: 'Speed Test Note', workspaceId: 'test-workspace' },
      headers: { Authorization: 'Bearer tokenA' },
    });

    await eventPromise;
  });
});
```

---

## 5. Plan d'implémentation

1. [ ] Créer `TreeEventsService` dans infrastructure/websocket
2. [ ] Configurer les rooms WebSocket (workspace, personal)
3. [ ] Intégrer les émissions d'événements dans `NotesService`
4. [ ] Intégrer les émissions d'événements dans `FoldersService`
5. [ ] Créer le hook `useTreeEvents` frontend
6. [ ] Modifier les stores Zustand pour supporter les opérations temps réel
7. [ ] Intégrer `useTreeEvents` dans la Sidebar
8. [ ] Tests d'intégration WebSocket
9. [ ] Tests E2E multi-utilisateurs

---

# 3. COLORATION SYNTAXIQUE DES BLOCS DE CODE

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|P2-Moyenne|
|Complexité|M|
|Modules impactés|Frontend (TipTap extensions), packages/markdown-extensions|
|Estimation|1.5 jours|

### Description

Améliorer le module de blocs de code pour permettre la spécification du langage (HTML, Python, Java, etc.) et afficher une coloration syntaxique appropriée, similaire à Obsidian. **ATTENTION : Ne pas modifier l'interprétation Mermaid existante.**

### Critères d'acceptation

- [ ] Un sélecteur de langage est disponible dans le bloc de code
- [ ] Les langages courants sont supportés : JavaScript, TypeScript, Python, Java, HTML, CSS, SQL, Bash, JSON, YAML, Markdown
- [ ] La coloration syntaxique est appliquée en temps réel
- [ ] Le langage est persisté dans le document
- [ ] L'interprétation Mermaid reste inchangée et fonctionnelle
- [ ] Les blocs de code sans langage spécifié restent en texte brut

---

## 2. Analyse technique

### 2.1 Contexte actuel

TipTap utilise l'extension `CodeBlock` de base sans coloration syntaxique. Les blocs Mermaid sont gérés par une extension custom séparée qui interprète et rend les diagrammes.

### 2.2 Solution proposée

Utiliser `@tiptap/extension-code-block-lowlight` avec `lowlight` (basé sur highlight.js) pour la coloration syntaxique. Cette approche :

- Est officiellement supportée par TipTap
- Permet de spécifier le langage via l'attribut `language`
- N'interfère pas avec l'extension Mermaid existante (qui a sa propre logique de rendu)

---

## 3. Spécifications détaillées

### 3.1 Dépendances à installer

```bash
cd apps/web
npm install @tiptap/extension-code-block-lowlight lowlight
```

### 3.2 Configuration de l'extension CodeBlock

#### Fichier: `packages/markdown-extensions/src/code-block-highlight.ts`

```typescript
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// Importer les langages supplémentaires nécessaires
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

// Créer l'instance lowlight avec les langages
const lowlight = createLowlight(common);

// Enregistrer les langages supplémentaires
lowlight.register('typescript', typescript);
lowlight.register('ts', typescript);
lowlight.register('python', python);
lowlight.register('py', python);
lowlight.register('java', java);
lowlight.register('sql', sql);
lowlight.register('yaml', yaml);
lowlight.register('yml', yaml);
lowlight.register('bash', bash);
lowlight.register('sh', bash);
lowlight.register('dockerfile', dockerfile);

export const SUPPORTED_LANGUAGES = [
  { value: '', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['value'];

export const CodeBlockHighlight = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: '',
        parseHTML: element => element.getAttribute('data-language') || '',
        renderHTML: attributes => {
          if (!attributes.language) return {};
          return { 'data-language': attributes.language };
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Tab pour indentation dans le code block
      Tab: () => {
        if (this.editor.isActive('codeBlock')) {
          return this.editor.commands.insertContent('  ');
        }
        return false;
      },
    };
  },
}).configure({
  lowlight,
  defaultLanguage: '',
});
```

### 3.3 Composant de sélection de langage

#### Fichier: `apps/web/src/components/editor/CodeBlockLanguageSelect.tsx`

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@collabnotes/markdown-extensions';

export function CodeBlockLanguageSelect({ node, updateAttributes, extension }: NodeViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const language = (node.attrs.language as SupportedLanguage) || '';

  const handleLanguageChange = useCallback((value: string) => {
    updateAttributes({ language: value });
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="code-block-wrapper relative group">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Select.Root value={language} onValueChange={handleLanguageChange} open={isOpen} onOpenChange={setIsOpen}>
          <Select.Trigger
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono 
                       bg-gray-700 hover:bg-gray-600 text-gray-300 rounded 
                       border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Select.Value placeholder="Language">
              {SUPPORTED_LANGUAGES.find(l => l.value === language)?.label || 'Plain text'}
            </Select.Value>
            <Select.Icon>
              <ChevronDown className="w-3 h-3" />
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content 
              className="bg-gray-800 border border-gray-600 rounded-md shadow-lg 
                         max-h-60 overflow-auto z-50"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Select.Item
                    key={lang.value}
                    value={lang.value}
                    className="relative flex items-center px-6 py-1.5 text-xs font-mono
                               text-gray-300 rounded cursor-pointer
                               hover:bg-gray-700 focus:bg-gray-700 focus:outline-none
                               data-[highlighted]:bg-gray-700"
                  >
                    <Select.ItemIndicator className="absolute left-1 inline-flex items-center">
                      <Check className="w-3 h-3" />
                    </Select.ItemIndicator>
                    <Select.ItemText>{lang.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <pre className="hljs rounded-lg overflow-hidden">
        <NodeViewContent as="code" className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}
```

### 3.4 Styles highlight.js

#### Fichier: `apps/web/src/styles/code-highlight.css`

```css
/* Theme GitHub Dark pour highlight.js */
.hljs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.hljs-comment,
.hljs-quote {
  color: #6a9955;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-literal,
.hljs-section,
.hljs-link {
  color: #569cd6;
}

.hljs-function .hljs-keyword {
  color: #569cd6;
}

.hljs-string,
.hljs-title,
.hljs-name,
.hljs-type,
.hljs-attribute,
.hljs-symbol,
.hljs-bullet,
.hljs-addition,
.hljs-variable,
.hljs-template-tag,
.hljs-template-variable {
  color: #ce9178;
}

.hljs-title.function_ {
  color: #dcdcaa;
}

.hljs-class .hljs-title {
  color: #4ec9b0;
}

.hljs-number {
  color: #b5cea8;
}

.hljs-regexp {
  color: #d16969;
}

.hljs-meta {
  color: #9cdcfe;
}

.hljs-deletion {
  color: #ce9178;
}

.hljs-built_in {
  color: #4fc1ff;
}

.hljs-doctag {
  color: #608b4e;
}

.hljs-attr {
  color: #9cdcfe;
}

/* Code block wrapper */
.code-block-wrapper {
  margin: 1rem 0;
}

.code-block-wrapper pre {
  margin: 0;
}

.code-block-wrapper code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 3.5 Intégration dans l'éditeur TipTap

#### Fichier: `apps/web/src/components/editor/Editor.tsx` (modification)

```typescript
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CodeBlockHighlight } from '@collabnotes/markdown-extensions';
import { CodeBlockLanguageSelect } from './CodeBlockLanguageSelect';
import '../styles/code-highlight.css';

// ... autres imports

export function Editor({ documentId, content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Désactiver le CodeBlock par défaut de StarterKit
        codeBlock: false,
      }),
      // Utiliser notre extension avec coloration
      CodeBlockHighlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockLanguageSelect);
        },
      }),
      // ... autres extensions (y compris Mermaid existant - NE PAS MODIFIER)
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <div className="editor-container">
      <EditorContent editor={editor} />
    </div>
  );
}
```

---

## 4. Tests

### 4.1 Tests unitaires

```typescript
// Fichier: packages/markdown-extensions/src/__tests__/code-block-highlight.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { CodeBlockHighlight, SUPPORTED_LANGUAGES } from '../code-block-highlight';

describe('CodeBlockHighlight Extension', () => {
  it('should set language attribute correctly', () => {
    const editor = new Editor({
      extensions: [CodeBlockHighlight],
      content: '<pre><code class="language-python">print("hello")</code></pre>',
    });

    const node = editor.state.doc.firstChild;
    expect(node?.attrs.language).toBe('python');
  });

  it('should render with data-language attribute', () => {
    const editor = new Editor({
      extensions: [CodeBlockHighlight],
      content: '',
    });

    editor.commands.setCodeBlock({ language: 'typescript' });
    editor.commands.insertContent('const x = 1;');

    const html = editor.getHTML();
    expect(html).toContain('data-language="typescript"');
  });

  it('should list all supported languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(10);
    expect(SUPPORTED_LANGUAGES.some(l => l.value === 'python')).toBe(true);
    expect(SUPPORTED_LANGUAGES.some(l => l.value === 'typescript')).toBe(true);
  });
});
```

### 4.2 Tests E2E

```typescript
// Fichier: e2e/code-block-highlight.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Code Block Syntax Highlighting', () => {
  test('should allow selecting a language', async ({ page }) => {
    await page.goto('/notes/new');
    
    // Créer un bloc de code
    await page.keyboard.type('```');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const x = 1;');

    // Hover pour afficher le sélecteur
    const codeBlock = page.locator('.code-block-wrapper');
    await codeBlock.hover();

    // Ouvrir le sélecteur de langage
    await page.click('[data-radix-select-trigger]');
    await page.click('[data-radix-select-item][data-value="typescript"]');

    // Vérifier que la coloration est appliquée
    await expect(codeBlock.locator('.hljs-keyword')).toBeVisible();
  });

  test('should preserve Mermaid rendering', async ({ page }) => {
    await page.goto('/notes/new');
    
    // Créer un bloc Mermaid
    await page.keyboard.type('```mermaid');
    await page.keyboard.press('Enter');
    await page.keyboard.type('graph TD');
    await page.keyboard.press('Enter');
    await page.keyboard.type('A --> B');
    await page.keyboard.press('Enter');
    await page.keyboard.type('```');

    // Vérifier que le diagramme est rendu (pas juste du texte coloré)
    await expect(page.locator('.mermaid svg')).toBeVisible();
  });
});
```

---

## 5. Plan d'implémentation

1. [ ] Installer les dépendances (`@tiptap/extension-code-block-lowlight`, `lowlight`)
2. [ ] Créer l'extension `CodeBlockHighlight` dans packages/markdown-extensions
3. [ ] Créer le composant `CodeBlockLanguageSelect`
4. [ ] Ajouter les styles CSS pour highlight.js
5. [ ] Intégrer dans l'éditeur TipTap (sans toucher à Mermaid)
6. [ ] Tests unitaires extension
7. [ ] Tests E2E
8. [ ] Vérifier que Mermaid fonctionne toujours

### Points d'attention

- **NE PAS MODIFIER** l'extension Mermaid existante
- Vérifier la distinction entre `language: 'mermaid'` (rendu diagramme) et autres langages (coloration syntaxique)
- Le CSS de highlight.js ne doit pas interférer avec le rendu Mermaid

---

# 4. GESTION DES ASSETS/IMAGES LOCAUX

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|P1-Haute|
|Complexité|XL|
|Modules impactés|Database, Backend (nouveau module assets), Frontend (upload, galerie, éditeur), Storage|
|Estimation|5 jours|

### Description

Permettre l'import et le stockage d'images localement (comme Obsidian), avec une galerie d'assets accessible depuis le menu utilisateur. Les images sont stockées dans une section "assets" non visible dans l'arborescence des dossiers mais accessible via l'interface.

### Critères d'acceptation

- [ ] Les utilisateurs peuvent uploader des images (PNG, JPG, GIF, WebP, SVG)
- [ ] Les images sont stockées localement sur le serveur (pas uniquement par URL)
- [ ] Une galerie d'assets est accessible depuis le menu action (avatar footer sidebar)
- [ ] Les contributeurs et admins peuvent voir, modifier et supprimer les assets
- [ ] Les images peuvent être insérées dans les notes via leur ID interne
- [ ] La fonctionnalité d'insertion par URL est conservée
- [ ] Les assets ne sont pas visibles dans l'arborescence des dossiers

---

## 2. Analyse technique

### 2.1 Contexte actuel

L'application permet d'insérer des images uniquement par URL externe. Il n'y a pas de système de stockage local ni de gestion d'assets.

### 2.2 Solution proposée

1. **Backend** : Nouveau module `assets` avec upload multipart, stockage fichiers local + métadonnées en BDD
2. **Stockage** : Dossier `/uploads/assets/` sur le serveur, organisé par workspace
3. **Database** : Table `Asset` pour les métadonnées
4. **Frontend** : Galerie d'assets, composant d'upload, extension TipTap pour insertion
5. **Permissions** : Lecture pour tous les membres, modification/suppression pour contributeurs+

### 2.3 Architecture de stockage

```
/uploads/
└── assets/
    └── {workspaceId}/
        └── {assetId}.{ext}
```

---

## 3. Spécifications détaillées

### 3.1 Modifications Base de données

#### Schema Prisma

```prisma
// Ajouter dans prisma/schema.prisma

model Asset {
  id          String    @id @default(cuid())
  filename    String    // Nom original du fichier
  storagePath String    // Chemin relatif dans /uploads
  mimeType    String    // image/png, image/jpeg, etc.
  size        Int       // Taille en bytes
  width       Int?      // Dimensions pour images
  height      Int?
  alt         String?   // Texte alternatif
  
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
  @@index([uploadedById])
  @@map("assets")
}

// Modifier le model Workspace pour ajouter la relation
model Workspace {
  // ... champs existants
  assets Asset[]
}

// Modifier le model User pour ajouter la relation
model User {
  // ... champs existants
  uploadedAssets Asset[]
}
```

#### Migration

```sql
-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "workspaceId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_workspaceId_idx" ON "assets"("workspaceId");
CREATE INDEX "assets_uploadedById_idx" ON "assets"("uploadedById");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assets" ADD CONSTRAINT "assets_uploadedById_fkey" 
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### 3.2 Backend - Module Assets

#### Fichier: `apps/api/src/modules/assets/assets.schema.ts`

```typescript
import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const uploadAssetSchema = z.object({
  workspaceId: z.string().cuid(),
  alt: z.string().max(255).optional(),
});

export const updateAssetSchema = z.object({
  alt: z.string().max(255).optional(),
  filename: z.string().max(255).optional(),
});

export const listAssetsQuerySchema = z.object({
  workspaceId: z.string().cuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type UploadAssetInput = z.infer<typeof uploadAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
```

#### Fichier: `apps/api/src/modules/assets/assets.repository.ts`

```typescript
import { PrismaClient, Asset, Prisma } from '@prisma/client';

export interface CreateAssetData {
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  workspaceId: string;
  uploadedById: string;
}

export interface ListAssetsOptions {
  workspaceId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedAssets {
  assets: Asset[];
  total: number;
  page: number;
  totalPages: number;
}

export class AssetsRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAssetData): Promise<Asset> {
    return this.prisma.asset.create({ data });
  }

  async findById(id: string): Promise<Asset | null> {
    return this.prisma.asset.findUnique({ where: { id } });
  }

  async findByIdWithWorkspace(id: string): Promise<Asset & { workspace: { id: string } } | null> {
    return this.prisma.asset.findUnique({
      where: { id },
      include: { workspace: { select: { id: true } } },
    });
  }

  async list(options: ListAssetsOptions): Promise<PaginatedAssets> {
    const { workspaceId, page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      workspaceId,
      ...(search && {
        OR: [
          { filename: { contains: search, mode: 'insensitive' } },
          { alt: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      assets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Partial<Pick<Asset, 'alt' | 'filename'>>): Promise<Asset> {
    return this.prisma.asset.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Asset> {
    return this.prisma.asset.delete({ where: { id } });
  }
}
```

#### Fichier: `apps/api/src/modules/assets/assets.service.ts`

```typescript
import { Asset } from '@prisma/client';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { AssetsRepository, CreateAssetData, PaginatedAssets } from './assets.repository';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './assets.schema';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors';

export interface UploadedFile {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export class AssetsService {
  private uploadDir: string;

  constructor(
    private repository: AssetsRepository,
    uploadBasePath: string = process.env.UPLOAD_PATH || './uploads'
  ) {
    this.uploadDir = path.resolve(uploadBasePath, 'assets');
  }

  async upload(file: UploadedFile, workspaceId: string, userId: string, alt?: string): Promise<Asset> {
    // Validation MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      throw new BadRequestError(`File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validation taille
    if (file.data.length > MAX_FILE_SIZE) {
      throw new BadRequestError(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Générer un ID unique et le chemin de stockage
    const assetId = randomUUID();
    const ext = path.extname(file.filename) || this.getExtensionFromMime(file.mimetype);
    const storagePath = `${workspaceId}/${assetId}${ext}`;
    const fullPath = path.join(this.uploadDir, storagePath);

    // Créer le répertoire si nécessaire
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Obtenir les dimensions pour les images
    let width: number | undefined;
    let height: number | undefined;

    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
      try {
        const metadata = await sharp(file.data).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch {
        // Ignorer si on ne peut pas lire les métadonnées
      }
    }

    // Écrire le fichier
    await fs.writeFile(fullPath, file.data);

    // Créer l'entrée en base
    const assetData: CreateAssetData = {
      filename: file.filename,
      storagePath,
      mimeType: file.mimetype,
      size: file.data.length,
      width,
      height,
      alt,
      workspaceId,
      uploadedById: userId,
    };

    return this.repository.create(assetData);
  }

  async getById(id: string): Promise<Asset> {
    const asset = await this.repository.findById(id);
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }
    return asset;
  }

  async getFilePath(id: string): Promise<string> {
    const asset = await this.getById(id);
    return path.join(this.uploadDir, asset.storagePath);
  }

  async list(workspaceId: string, page: number, limit: number, search?: string): Promise<PaginatedAssets> {
    return this.repository.list({ workspaceId, page, limit, search });
  }

  async update(id: string, userId: string, data: { alt?: string; filename?: string }): Promise<Asset> {
    const asset = await this.getById(id);
    // Vérification permission gérée au niveau controller/middleware
    return this.repository.update(id, data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const asset = await this.getById(id);

    // Supprimer le fichier physique
    const fullPath = path.join(this.uploadDir, asset.storagePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Log mais ne pas échouer si le fichier n'existe déjà plus
      console.warn(`Could not delete file ${fullPath}:`, error);
    }

    // Supprimer l'entrée en base
    await this.repository.delete(id);
  }

  private getExtensionFromMime(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    return mimeToExt[mimetype] || '';
  }
}
```

#### Fichier: `apps/api/src/modules/assets/assets.controller.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AssetsService } from './assets.service';
import { uploadAssetSchema, updateAssetSchema, listAssetsQuerySchema } from './assets.schema';
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole } from '../../shared/middleware';

export async function assetsController(app: FastifyInstance, service: AssetsService) {
  // Upload d'un asset
  app.post(
    '/api/v1/assets',
    {
      preHandler: [requireAuth, requireWorkspaceRole(['admin', 'contributor'])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const fields = data.fields as Record<string, { value: string }>;
      
      const parsed = uploadAssetSchema.safeParse({
        workspaceId: fields.workspaceId?.value,
        alt: fields.alt?.value,
      });

      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const asset = await service.upload(
        {
          filename: data.filename,
          mimetype: data.mimetype,
          data: buffer,
        },
        parsed.data.workspaceId,
        request.user!.id,
        parsed.data.alt
      );

      return reply.status(201).send(asset);
    }
  );

  // Liste des assets d'un workspace
  app.get(
    '/api/v1/assets',
    {
      preHandler: [requireAuth, requireWorkspaceAccess],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listAssetsQuerySchema.parse(request.query);
      const result = await service.list(
        query.workspaceId,
        query.page,
        query.limit,
        query.search
      );
      return reply.send(result);
    }
  );

  // Récupérer un asset (fichier)
  app.get(
    '/api/v1/assets/:id/file',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const asset = await service.getById(request.params.id);
      const filePath = await service.getFilePath(request.params.id);
      
      return reply
        .header('Content-Type', asset.mimeType)
        .header('Cache-Control', 'public, max-age=31536000')
        .sendFile(filePath);
    }
  );

  // Récupérer les métadonnées d'un asset
  app.get(
    '/api/v1/assets/:id',
    {
      preHandler: [requireAuth],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const asset = await service.getById(request.params.id);
      return reply.send(asset);
    }
  );

  // Mettre à jour un asset
  app.patch(
    '/api/v1/assets/:id',
    {
      preHandler: [requireAuth, requireWorkspaceRole(['admin', 'contributor'])],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = updateAssetSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors });
      }

      const asset = await service.update(request.params.id, request.user!.id, parsed.data);
      return reply.send(asset);
    }
  );

  // Supprimer un asset
  app.delete(
    '/api/v1/assets/:id',
    {
      preHandler: [requireAuth, requireWorkspaceRole(['admin', 'contributor'])],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      await service.delete(request.params.id, request.user!.id);
      return reply.status(204).send();
    }
  );
}
```

### 3.3 Frontend - Store Assets

#### Fichier: `apps/web/src/stores/assetsStore.ts`

```typescript
import { create } from 'zustand';
import { assetsApi } from '../services/assetsApi';

export interface Asset {
  id: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetsState {
  assets: Asset[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  selectedAsset: Asset | null;
}

interface AssetsActions {
  fetchAssets: (workspaceId: string, page?: number, search?: string) => Promise<void>;
  uploadAsset: (workspaceId: string, file: File, alt?: string) => Promise<Asset>;
  updateAsset: (id: string, data: { alt?: string; filename?: string }) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  setSelectedAsset: (asset: Asset | null) => void;
  clearError: () => void;
}

export const useAssetsStore = create<AssetsState & AssetsActions>((set, get) => ({
  assets: [],
  total: 0,
  page: 1,
  totalPages: 0,
  isLoading: false,
  error: null,
  selectedAsset: null,

  fetchAssets: async (workspaceId, page = 1, search) => {
    set({ isLoading: true, error: null });
    try {
      const result = await assetsApi.list(workspaceId, page, 20, search);
      set({
        assets: result.assets,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  uploadAsset: async (workspaceId, file, alt) => {
    set({ isLoading: true, error: null });
    try {
      const asset = await assetsApi.upload(workspaceId, file, alt);
      set((state) => ({
        assets: [asset, ...state.assets],
        total: state.total + 1,
        isLoading: false,
      }));
      return asset;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateAsset: async (id, data) => {
    try {
      const updated = await assetsApi.update(id, data);
      set((state) => ({
        assets: state.assets.map((a) => (a.id === id ? updated : a)),
        selectedAsset: state.selectedAsset?.id === id ? updated : state.selectedAsset,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteAsset: async (id) => {
    try {
      await assetsApi.delete(id);
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== id),
        total: state.total - 1,
        selectedAsset: state.selectedAsset?.id === id ? null : state.selectedAsset,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  clearError: () => set({ error: null }),
}));
```

### 3.4 Frontend - Service API Assets

#### Fichier: `apps/web/src/services/assetsApi.ts`

```typescript
import { apiClient } from './apiClient';
import { Asset } from '../stores/assetsStore';

interface ListAssetsResponse {
  assets: Asset[];
  total: number;
  page: number;
  totalPages: number;
}

export const assetsApi = {
  async list(workspaceId: string, page = 1, limit = 20, search?: string): Promise<ListAssetsResponse> {
    const params = new URLSearchParams({
      workspaceId,
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });
    return apiClient.get<ListAssetsResponse>(`/api/v1/assets?${params}`);
  },

  async upload(workspaceId: string, file: File, alt?: string): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    if (alt) formData.append('alt', alt);

    return apiClient.postForm<Asset>('/api/v1/assets', formData);
  },

  async getById(id: string): Promise<Asset> {
    return apiClient.get<Asset>(`/api/v1/assets/${id}`);
  },

  async update(id: string, data: { alt?: string; filename?: string }): Promise<Asset> {
    return apiClient.patch<Asset>(`/api/v1/assets/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/assets/${id}`);
  },

  getFileUrl(id: string): string {
    return `/api/v1/assets/${id}/file`;
  },
};
```

### 3.5 Frontend - Galerie d'Assets

#### Fichier: `apps/web/src/components/assets/AssetsGallery.tsx`

```typescript
import { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, Search, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { useAssetsStore, Asset } from '../../stores/assetsStore';
import { assetsApi } from '../../services/assetsApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatBytes, formatDate } from '../../utils/format';

interface AssetsGalleryProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (asset: Asset) => void;
  selectionMode?: boolean;
}

export function AssetsGallery({
  workspaceId,
  open,
  onOpenChange,
  onSelect,
  selectionMode = false,
}: AssetsGalleryProps) {
  const { assets, total, page, totalPages, isLoading, fetchAssets, uploadAsset, deleteAsset } =
    useAssetsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (open) {
      fetchAssets(workspaceId, 1, debouncedSearch || undefined);
    }
  }, [open, workspaceId, debouncedSearch, fetchAssets]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;

      setIsUploading(true);
      try {
        for (const file of files) {
          await uploadAsset(workspaceId, file);
        }
      } finally {
        setIsUploading(false);
        event.target.value = '';
      }
    },
    [workspaceId, uploadAsset]
  );

  const handleDelete = useCallback(
    async (asset: Asset) => {
      if (confirm(`Supprimer "${asset.filename}" ?`)) {
        await deleteAsset(asset.id);
      }
    },
    [deleteAsset]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      fetchAssets(workspaceId, newPage, debouncedSearch || undefined);
    },
    [workspaceId, debouncedSearch, fetchAssets]
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold">
              {selectionMode ? 'Insérer une image' : 'Galerie des assets'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-4 p-4 border-b dark:border-gray-700">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Upload...' : 'Uploader'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <ImageIcon className="w-12 h-12 mb-2" />
                <p>Aucun asset trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onSelect={selectionMode ? onSelect : undefined}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-sm">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 rounded disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

function AssetCard({ asset, onSelect, onDelete }: AssetCardProps) {
  return (
    <div
      className={`group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden ${
        onSelect ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
      }`}
      onClick={() => onSelect?.(asset)}
    >
      <div className="aspect-square">
        <img
          src={assetsApi.getFileUrl(asset.id)}
          alt={asset.alt || asset.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Overlay avec infos */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
        <p className="text-white text-sm truncate">{asset.filename}</p>
        <p className="text-gray-300 text-xs">{formatBytes(asset.size)}</p>

        {!onSelect && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(asset);
              }}
              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3.6 Frontend - Extension TipTap pour Images Assets

#### Fichier: `packages/markdown-extensions/src/asset-image.ts`

```typescript
import Image from '@tiptap/extension-image';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    assetImage: {
      setAssetImage: (options: { assetId: string; alt?: string }) => ReturnType;
    };
  }
}

export const AssetImage = Image.extend({
  name: 'assetImage',

  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-id'),
        renderHTML: (attributes) => {
          if (!attributes.assetId) return {};
          return { 'data-asset-id': attributes.assetId };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setAssetImage:
        ({ assetId, alt }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: `/api/v1/assets/${assetId}/file`,
              alt: alt || '',
              assetId,
            },
          });
        },
    };
  },

  // Parser le Markdown personnalisé pour les assets
  // Format: ![[asset:id|alt text]]
  addInputRules() {
    return [
      {
        find: /!\[\[asset:([a-zA-Z0-9-_]+)\|?([^\]]*)\]\]/,
        handler: ({ state, range, match }) => {
          const [, assetId, alt] = match;
          const { tr } = state;

          const node = this.type.create({
            src: `/api/v1/assets/${assetId}/file`,
            alt: alt || '',
            assetId,
          });

          tr.replaceWith(range.from, range.to, node);
        },
      },
    ];
  },
});
```

### 3.7 Frontend - Intégration Menu Action

#### Fichier: `apps/web/src/components/sidebar/UserMenu.tsx` (modification)

```typescript
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Settings, LogOut, Image, User } from 'lucide-react';
import { AssetsGallery } from '../assets/AssetsGallery';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../../hooks/useWorkspace';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [assetsOpen, setAssetsOpen] = useState(false);

  const canManageAssets = user?.role === 'admin' || user?.role === 'contributor';

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 p-2 w-full hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              {user?.name?.charAt(0) || <User className="w-4 h-4" />}
            </div>
            <span className="flex-1 text-left truncate">{user?.name || 'Utilisateur'}</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="min-w-[200px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 p-1"
            sideOffset={5}
          >
            {canManageAssets && currentWorkspace && (
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                onSelect={() => setAssetsOpen(true)}
              >
                <Image className="w-4 h-4" />
                <span>Galerie des assets</span>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              onSelect={() => {/* navigate to settings */}}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-600"
              onSelect={logout}
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {currentWorkspace && (
        <AssetsGallery
          workspaceId={currentWorkspace.id}
          open={assetsOpen}
          onOpenChange={setAssetsOpen}
        />
      )}
    </>
  );
}
```

---

## 4. Plan d'implémentation

1. [ ] Migration Prisma : ajouter la table `assets`
2. [ ] Installer les dépendances backend (`sharp`, `@fastify/multipart`)
3. [ ] Créer le module assets backend (repository, service, controller, schema)
4. [ ] Configurer le stockage fichiers et les routes statiques
5. [ ] Créer le store et service API frontend
6. [ ] Créer le composant `AssetsGallery`
7. [ ] Intégrer dans le `UserMenu`
8. [ ] Créer l'extension TipTap `AssetImage`
9. [ ] Intégrer le bouton d'insertion dans la toolbar de l'éditeur
10. [ ] Tests unitaires et d'intégration
11. [ ] Tests E2E (upload, affichage, insertion, suppression)

### Dépendances npm à installer

```bash
# Backend
cd apps/api
npm install sharp @fastify/multipart @fastify/static

# Types
npm install -D @types/sharp
```

---

# 5. COLORATION VISUELLE DES DOSSIERS

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|P2-Moyenne|
|Complexité|M|
|Modules impactés|Frontend (sidebar, components)|
|Estimation|1 jour|

### Description

Colorier les dossiers racines avec un cycle de 5 couleurs pastels pour faciliter la navigation. Quand un dossier est déployé, la couleur de fond s'étend sur toute son arborescence. Le même composant doit être réutilisé pour les sections générale et personnelle.

### Critères d'acceptation

- [ ] 5 couleurs pastels distinctes s'appliquent cycliquement aux dossiers racines
- [ ] Quand un dossier est déployé, tous ses enfants ont la même couleur de fond
- [ ] Les couleurs sont suffisamment claires pour ne pas gêner la lecture
- [ ] Le même composant est utilisé pour les sections générale et personnelle
- [ ] Les couleurs sont cohérentes entre les rafraîchissements (basées sur l'index)

---

## 2. Analyse technique

### 2.1 Solution proposée

Créer un système de couleurs basé sur l'index des dossiers racines (modulo 5). Propager la couleur du dossier parent à tous les enfants via le contexte React ou les props.

### 2.2 Palette de couleurs

```
Couleur 1: #EFF6FF (blue-50)
Couleur 2: #F0FDF4 (green-50)
Couleur 3: #FFFBEB (amber-50)
Couleur 4: #FDF2F8 (pink-50)
Couleur 5: #F5F3FF (violet-50)
```

---

## 3. Spécifications détaillées

### 3.1 Configuration des couleurs

#### Fichier: `apps/web/src/config/folder-colors.ts`

```typescript
export const FOLDER_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-200 dark:border-l-blue-800' },
  { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-l-green-200 dark:border-l-green-800' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-amber-200 dark:border-l-amber-800' },
  { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-l-pink-200 dark:border-l-pink-800' },
  { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-l-violet-200 dark:border-l-violet-800' },
] as const;

export type FolderColorIndex = 0 | 1 | 2 | 3 | 4;

export function getFolderColor(rootIndex: number): typeof FOLDER_COLORS[number] {
  return FOLDER_COLORS[rootIndex % FOLDER_COLORS.length];
}
```

### 3.2 Contexte de couleur de dossier

#### Fichier: `apps/web/src/contexts/FolderColorContext.tsx`

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { FOLDER_COLORS } from '../config/folder-colors';

interface FolderColorContextValue {
  color: typeof FOLDER_COLORS[number] | null;
  depth: number;
}

const FolderColorContext = createContext<FolderColorContextValue>({
  color: null,
  depth: 0,
});

interface FolderColorProviderProps {
  children: ReactNode;
  color: typeof FOLDER_COLORS[number] | null;
  depth: number;
}

export function FolderColorProvider({ children, color, depth }: FolderColorProviderProps) {
  return (
    <FolderColorContext.Provider value={{ color, depth }}>
      {children}
    </FolderColorContext.Provider>
  );
}

export function useFolderColor() {
  return useContext(FolderColorContext);
}
```

### 3.3 Composant FolderItem mis à jour

#### Fichier: `apps/web/src/components/sidebar/FolderItem.tsx`

```typescript
import { useState, useCallback, memo } from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { FolderColorProvider, useFolderColor } from '../../contexts/FolderColorContext';
import { getFolderColor, FOLDER_COLORS } from '../../config/folder-colors';
import { NoteItem } from './NoteItem';
import { cn } from '../../utils/cn';

interface FolderItemProps {
  folder: {
    id: string;
    name: string;
    children: FolderItemProps['folder'][];
    notes: { id: string; title: string }[];
  };
  rootIndex?: number; // Index pour les dossiers racines uniquement
  isRoot?: boolean;
}

export const FolderItem = memo(function FolderItem({
  folder,
  rootIndex = 0,
  isRoot = false,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parentColor = useFolderColor();

  // Déterminer la couleur : si root, utiliser l'index, sinon hériter du parent
  const color = isRoot ? getFolderColor(rootIndex) : parentColor.color;
  const depth = isRoot ? 0 : parentColor.depth + 1;

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasChildren = folder.children.length > 0 || folder.notes.length > 0;

  return (
    <div className="folder-item">
      {/* En-tête du dossier */}
      <button
        onClick={toggleExpand}
        className={cn(
          'flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-md',
          'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
          // Appliquer la couleur de fond pour les dossiers racines
          isRoot && color && color.bg
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span
          className={cn(
            'transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </span>

        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-gray-500" />
        ) : (
          <Folder className="w-4 h-4 text-gray-500" />
        )}

        <span className="flex-1 truncate text-sm">{folder.name}</span>
      </button>

      {/* Contenu déployé avec propagation de couleur */}
      {isExpanded && hasChildren && (
        <FolderColorProvider color={color} depth={depth}>
          <div
            className={cn(
              'ml-0 border-l-2',
              color ? color.border : 'border-l-transparent',
              color && color.bg
            )}
          >
            {/* Sous-dossiers */}
            {folder.children.map((child, index) => (
              <FolderItem key={child.id} folder={child} />
            ))}

            {/* Notes du dossier */}
            {folder.notes.map((note) => (
              <NoteItem key={note.id} note={note} depth={depth + 1} />
            ))}
          </div>
        </FolderColorProvider>
      )}
    </div>
  );
});
```

### 3.4 Intégration dans les sections

#### Fichier: `apps/web/src/components/sidebar/FolderTree.tsx`

```typescript
import { useMemo } from 'react';
import { FolderItem } from './FolderItem';
import { useFolderStore } from '../../stores/folderStore';

interface FolderTreeProps {
  section: 'general' | 'personal';
  workspaceId: string;
}

export function FolderTree({ section, workspaceId }: FolderTreeProps) {
  const { getRootFolders } = useFolderStore();

  const rootFolders = useMemo(
    () => getRootFolders(workspaceId, section),
    [getRootFolders, workspaceId, section]
  );

  return (
    <div className="folder-tree space-y-0.5">
      {rootFolders.map((folder, index) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          rootIndex={index}
          isRoot={true}
        />
      ))}
    </div>
  );
}
```

---

## 4. Tests

```typescript
// Fichier: apps/web/src/components/sidebar/__tests__/FolderItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FolderItem } from '../FolderItem';
import { FOLDER_COLORS } from '../../../config/folder-colors';

describe('FolderItem', () => {
  const mockFolder = {
    id: '1',
    name: 'Test Folder',
    children: [],
    notes: [{ id: 'n1', title: 'Note 1' }],
  };

  it('should apply correct color for root folder', () => {
    const { container } = render(
      <FolderItem folder={mockFolder} rootIndex={0} isRoot={true} />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass(FOLDER_COLORS[0].bg);
  });

  it('should cycle through colors correctly', () => {
    const { rerender, container } = render(
      <FolderItem folder={mockFolder} rootIndex={5} isRoot={true} />
    );

    // Index 5 % 5 = 0, donc première couleur
    const button = container.querySelector('button');
    expect(button).toHaveClass(FOLDER_COLORS[0].bg);
  });

  it('should propagate color to children when expanded', () => {
    const folderWithChildren = {
      ...mockFolder,
      children: [{ id: '2', name: 'Child', children: [], notes: [] }],
    };

    const { container } = render(
      <FolderItem folder={folderWithChildren} rootIndex={1} isRoot={true} />
    );

    // Expand
    fireEvent.click(screen.getByText('Test Folder'));

    // Vérifier que le conteneur enfant a la couleur
    const childContainer = container.querySelector('.border-l-2');
    expect(childContainer).toHaveClass(FOLDER_COLORS[1].bg);
    expect(childContainer).toHaveClass(FOLDER_COLORS[1].border);
  });
});
```

---

## 5. Plan d'implémentation

1. [ ] Créer le fichier de configuration des couleurs
2. [ ] Créer le contexte `FolderColorContext`
3. [ ] Modifier le composant `FolderItem` pour supporter les couleurs
4. [ ] Modifier `NoteItem` pour hériter du contexte couleur
5. [ ] Intégrer dans `FolderTree` pour les deux sections
6. [ ] Tests unitaires
7. [ ] Vérification visuelle en mode clair et sombre

---

# 6. BOUTON SORTIE SPLIT VIEW

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Bugfix|
|Priorité|P1-Haute|
|Complexité|S|
|Modules impactés|Frontend (split view)|
|Estimation|0.5 jour|

### Description

Ajouter un bouton pour fermer le mode Split View et revenir à l'affichage simple.

### Critères d'acceptation

- [ ] Un bouton de fermeture est visible sur chaque panneau en mode split view
- [ ] Cliquer sur le bouton ferme le panneau correspondant
- [ ] Si un seul panneau reste, le mode split view se désactive
- [ ] Le bouton est clairement visible mais non intrusif

---

## 3. Spécifications détaillées

#### Fichier: `apps/web/src/components/editor/SplitView.tsx` (modification)

```typescript
import { X } from 'lucide-react';
import { useSplitViewStore } from '../../stores/splitViewStore';

interface SplitViewPanelProps {
  panelId: 'left' | 'right';
  noteId: string;
  children: ReactNode;
}

export function SplitViewPanel({ panelId, noteId, children }: SplitViewPanelProps) {
  const { closePanel, panels } = useSplitViewStore();

  const handleClose = () => {
    closePanel(panelId);
  };

  return (
    <div className="split-view-panel relative flex-1 min-w-0 border-r last:border-r-0 dark:border-gray-700">
      {/* Bouton de fermeture */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md 
                   bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
                   opacity-0 group-hover:opacity-100 transition-opacity"
        title="Fermer ce panneau"
      >
        <X className="w-4 h-4" />
      </button>

      {children}
    </div>
  );
}

export function SplitViewContainer() {
  const { panels, isActive } = useSplitViewStore();

  if (!isActive || panels.length < 2) {
    return null; // Pas de split view active
  }

  return (
    <div className="split-view-container flex h-full group">
      {panels.map((panel) => (
        <SplitViewPanel key={panel.id} panelId={panel.id} noteId={panel.noteId}>
          <NoteEditor noteId={panel.noteId} />
        </SplitViewPanel>
      ))}
    </div>
  );
}
```

#### Fichier: `apps/web/src/stores/splitViewStore.ts` (modification)

```typescript
import { create } from 'zustand';

interface Panel {
  id: 'left' | 'right';
  noteId: string;
}

interface SplitViewState {
  isActive: boolean;
  panels: Panel[];
}

interface SplitViewActions {
  openSplitView: (leftNoteId: string, rightNoteId: string) => void;
  closePanel: (panelId: 'left' | 'right') => void;
  closeSplitView: () => void;
  updatePanel: (panelId: 'left' | 'right', noteId: string) => void;
}

export const useSplitViewStore = create<SplitViewState & SplitViewActions>((set, get) => ({
  isActive: false,
  panels: [],

  openSplitView: (leftNoteId, rightNoteId) => {
    set({
      isActive: true,
      panels: [
        { id: 'left', noteId: leftNoteId },
        { id: 'right', noteId: rightNoteId },
      ],
    });
  },

  closePanel: (panelId) => {
    const { panels } = get();
    const remainingPanels = panels.filter((p) => p.id !== panelId);

    if (remainingPanels.length < 2) {
      // Fermer le split view si un seul panneau reste
      set({ isActive: false, panels: [] });
    } else {
      set({ panels: remainingPanels });
    }
  },

  closeSplitView: () => {
    set({ isActive: false, panels: [] });
  },

  updatePanel: (panelId, noteId) => {
    set((state) => ({
      panels: state.panels.map((p) =>
        p.id === panelId ? { ...p, noteId } : p
      ),
    }));
  },
}));
```

---

# 7. AUDIT RACCOURCIS CLAVIER

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Évaluation / Bugfix|
|Priorité|P2-Moyenne|
|Complexité|M|
|Modules impactés|Frontend (hooks, event handlers)|
|Estimation|1.5 jours|

### Description

Les raccourcis clavier ne fonctionnent pas ou mal. Il faut auditer le système actuel, identifier les conflits avec le navigateur/OS, corriger ce qui est possible, et potentiellement supprimer l'afficheur si les raccourcis ne peuvent pas fonctionner correctement dans une web app.

### Critères d'acceptation

- [ ] Audit complet des raccourcis définis vs fonctionnels
- [ ] Identification des conflits navigateur/OS
- [ ] Correction des raccourcis qui peuvent fonctionner
- [ ] Suppression ou masquage de l'afficheur pour les raccourcis non fonctionnels
- [ ] Documentation des limitations

---

## 2. Analyse technique

### 2.1 Contraintes des web apps

Les raccourcis suivants sont **généralement bloqués** par les navigateurs :

- `Ctrl+N` (nouveau fenêtre)
- `Ctrl+T` (nouvel onglet)
- `Ctrl+W` (fermer onglet)
- `Ctrl+Tab` (changer onglet)
- `Ctrl+Shift+T` (restaurer onglet)
- `F1-F12` selon le contexte

Les raccourcis suivants sont **généralement utilisables** :

- `Ctrl+S` (si preventDefault appelé)
- `Ctrl+K` (barre de commande, attention Firefox)
- `Ctrl+B`, `Ctrl+I`, `Ctrl+U` (formatage)
- `Ctrl+Shift+*` (la plupart)
- `Ctrl+Alt+*` (la plupart)

### 2.2 Plan d'audit

1. Lister tous les raccourcis définis
2. Tester chacun sur Chrome, Firefox, Safari, Edge
3. Classer en : fonctionnel / partiellement / non fonctionnel
4. Proposer des alternatives pour les non fonctionnels
5. Mettre à jour l'afficheur

---

## 3. Spécifications détaillées

### 3.1 Hook de raccourcis robuste

#### Fichier: `apps/web/src/hooks/useKeyboardShortcut.ts`

```typescript
import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
}

// Liste des raccourcis bloqués par les navigateurs
const BLOCKED_SHORTCUTS = new Set([
  'ctrl+n', 'ctrl+t', 'ctrl+w', 'ctrl+tab', 'ctrl+shift+t',
  'ctrl+shift+n', 'ctrl+h', 'ctrl+j', // Chrome
  'ctrl+d', 'ctrl+e', // Selon navigateur
]);

export function isShortcutBlocked(shortcut: ShortcutConfig): boolean {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('ctrl');
  if (shortcut.shift) parts.push('shift');
  if (shortcut.alt) parts.push('alt');
  parts.push(shortcut.key.toLowerCase());

  return BLOCKED_SHORTCUTS.has(parts.join('+'));
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignorer si dans un champ de saisie (sauf si explicitement permis)
      const target = event.target as HTMLElement;
      const isInputField = ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                          target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const matches =
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          event.ctrlKey === (shortcut.ctrl ?? false) &&
          event.shiftKey === (shortcut.shift ?? false) &&
          event.altKey === (shortcut.alt ?? false) &&
          event.metaKey === (shortcut.meta ?? false);

        if (matches) {
          // Pour les raccourcis de formatage, permettre dans l'éditeur
          const isFormattingShortcut = ['b', 'i', 'u', 'k'].includes(shortcut.key.toLowerCase()) &&
                                       shortcut.ctrl;

          if (isInputField && !isFormattingShortcut) continue;

          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown]);
}
```

### 3.2 Configuration des raccourcis avec statut

#### Fichier: `apps/web/src/config/keyboard-shortcuts.ts`

```typescript
export type ShortcutStatus = 'functional' | 'limited' | 'blocked';

export interface ShortcutDefinition {
  id: string;
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'navigation' | 'editing' | 'view' | 'general';
  status: ShortcutStatus;
  statusNote?: string; // Explication si limité/bloqué
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation
  {
    id: 'search',
    key: 'k',
    ctrl: true,
    description: 'Ouvrir la recherche',
    category: 'navigation',
    status: 'functional',
  },
  {
    id: 'new-note',
    key: 'n',
    ctrl: true,
    shift: true, // Utiliser Ctrl+Shift+N au lieu de Ctrl+N
    description: 'Nouvelle note',
    category: 'navigation',
    status: 'limited',
    statusNote: 'Firefox peut bloquer ce raccourci',
  },

  // Édition
  {
    id: 'bold',
    key: 'b',
    ctrl: true,
    description: 'Gras',
    category: 'editing',
    status: 'functional',
  },
  {
    id: 'italic',
    key: 'i',
    ctrl: true,
    description: 'Italique',
    category: 'editing',
    status: 'functional',
  },
  {
    id: 'save',
    key: 's',
    ctrl: true,
    description: 'Sauvegarder',
    category: 'editing',
    status: 'functional',
  },

  // Vue
  {
    id: 'toggle-sidebar',
    key: 'b',
    ctrl: true,
    shift: true,
    description: 'Afficher/masquer la sidebar',
    category: 'view',
    status: 'functional',
  },
  {
    id: 'split-view',
    key: '\\',
    ctrl: true,
    description: 'Activer le split view',
    category: 'view',
    status: 'functional',
  },
];

export function getShortcutsByCategory(category: ShortcutDefinition['category']): ShortcutDefinition[] {
  return KEYBOARD_SHORTCUTS.filter(
    (s) => s.category === category && s.status !== 'blocked'
  );
}

export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push(isMac() ? '⌘' : 'Ctrl');
  if (shortcut.shift) parts.push(isMac() ? '⇧' : 'Shift');
  if (shortcut.alt) parts.push(isMac() ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(isMac() ? '' : '+');
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
```

### 3.3 Afficheur de raccourcis mis à jour

#### Fichier: `apps/web/src/components/common/KeyboardShortcutsDialog.tsx`

```typescript
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import { KEYBOARD_SHORTCUTS, formatShortcut, getShortcutsByCategory } from '../../config/keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const categories = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'editing', label: 'Édition' },
    { id: 'view', label: 'Affichage' },
  ] as const;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold">
              Raccourcis clavier
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-6">
            {/* Avertissement */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200">
                Certains raccourcis peuvent ne pas fonctionner selon votre navigateur
                ou système d'exploitation.
              </p>
            </div>

            {categories.map((category) => {
              const shortcuts = getShortcutsByCategory(category.id);
              if (shortcuts.length === 0) return null;

              return (
                <div key={category.id}>
                  <h3 className="font-medium text-sm text-gray-500 uppercase mb-2">
                    {category.label}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm">
                          {shortcut.description}
                          {shortcut.status === 'limited' && (
                            <span className="ml-2 text-xs text-amber-600">
                              (limité)
                            </span>
                          )}
                        </span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 4. Plan d'implémentation

1. [ ] Audit : lister tous les raccourcis actuellement définis
2. [ ] Test multi-navigateur (Chrome, Firefox, Safari, Edge)
3. [ ] Classifier chaque raccourci (fonctionnel/limité/bloqué)
4. [ ] Refactorer le hook `useKeyboardShortcuts`
5. [ ] Créer la configuration avec statuts
6. [ ] Mettre à jour l'afficheur de raccourcis
7. [ ] Remplacer les raccourcis bloqués par des alternatives
8. [ ] Tests E2E des raccourcis fonctionnels
9. [ ] Documentation des limitations

---

# RÉSUMÉ ET PRIORISATION

|#|Tâche|Priorité|Effort|Dépendances|
|---|---|---|---|---|
|1|Rate Limiting|P0|0.5j|-|
|2|Sync Sidebar|P0|1.5j|-|
|6|Bouton Split View|P1|0.5j|-|
|4|Gestion Assets|P1|5j|-|
|3|Coloration Code|P2|1.5j|-|
|5|Coloration Dossiers|P2|1j|-|
|7|Raccourcis Clavier|P2|1.5j|-|

**Estimation totale : ~11.5 jours-homme**

**Ordre d'implémentation suggéré :**

1. Rate Limiting (débloque l'utilisation collaborative)
2. Sync Sidebar (critique pour UX collaborative)
3. Bouton Split View (correction rapide)
4. Gestion Assets (fonctionnalité majeure)
5. Coloration Code (amélioration éditeur)
6. Coloration Dossiers (amélioration UX)
7. Raccourcis Clavier (audit et corrections)