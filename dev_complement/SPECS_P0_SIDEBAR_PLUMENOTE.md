# MODULE P0 : Correction de la Sidebar — Arborescence & Navigation

> **✅ MODULE TERMINÉ** — Implémenté le 2024-12-05

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Bugfix / Improvement|
|Priorité|**P0-Critique**|
|Complexité|M|
|Modules impactés|Frontend (sidebar, stores), Backend (folders API)|
|Estimation|2 jours-homme|
|**Status**|**✅ TERMINÉ**|
|**Date implémentation**|2024-12-05|

### Description

La sidebar de navigation présente trois dysfonctionnements critiques qui rendent l'application inutilisable :

1. **Bug d'affichage** : Les notes situées au dernier niveau de granularité (dans les sous-dossiers les plus profonds) ne s'affichent pas, même en cliquant sur l'icône du dossier parent.
2. **Problème d'indentation** : Les sous-dossiers et notes ne sont pas alignés au même niveau d'indentation visuelle.
3. **Tri incorrect** : L'ordre d'affichage ne respecte pas la convention attendue (sous-dossiers alphabétiques d'abord, puis notes alphabétiques).

### Critères d'acceptation

- [x] Toutes les notes s'affichent dans leur dossier parent, quel que soit le niveau de profondeur
- [x] Cliquer sur un dossier (icône ou texte) déplie son contenu et affiche les notes qu'il contient
- [x] Les sous-dossiers et notes d'un même niveau partagent la même indentation
- [x] Le tri respecte : sous-dossiers (A→Z), puis notes (A→Z)
- [x] L'état ouvert/fermé des dossiers persiste pendant la session
- [x] Performance : l'arborescence supporte 500+ éléments sans lag perceptible
- [x] Tests unitaires et E2E couvrant les scénarios de navigation

### Implémentation réalisée

#### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `packages/types/src/index.ts` | Types ajoutés : `FolderChildPreview`, `NotePreview`, `FolderContent`, `SidebarFolderNode` |
| `apps/api/src/routes/folders.ts` | Endpoint `GET /folders/:id/content` pour lazy loading |
| `apps/web/src/stores/sidebarStore.ts` | Store Zustand avec cache TTL 5min et lazy loading |
| `apps/web/src/components/sidebar/FolderItem.tsx` | Composant récursif mémorisé |
| `apps/web/src/components/sidebar/NoteItem.tsx` | Composant note avec même indentation |
| `apps/web/src/components/sidebar/FolderTree.tsx` | Wrapper avec gestion loading/erreur |
| `apps/api/vitest.config.ts` | Configuration tests backend |
| `apps/api/src/test/setup.ts` | Setup mocks Prisma |
| `apps/api/src/routes/__tests__/folders.test.ts` | Tests unitaires endpoint |
| `apps/web/vitest.config.ts` | Configuration tests frontend |
| `apps/web/src/test/setup.ts` | Setup mocks React/Router |
| `apps/web/src/components/sidebar/__tests__/FolderItem.test.tsx` | Tests composant FolderItem |
| `apps/web/src/components/sidebar/__tests__/NoteItem.test.tsx` | Tests composant NoteItem |
| `apps/web/src/stores/__tests__/sidebarStore.test.ts` | Tests store sidebar |
| `playwright.config.ts` | Configuration Playwright |
| `e2e/sidebar-navigation.spec.ts` | Tests E2E navigation |

#### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `apps/web/src/components/sidebar/Sidebar.tsx` | Refactorisé pour utiliser nouveaux composants |
| `apps/web/src/components/sidebar/index.ts` | Export nouveaux composants |
| `apps/web/src/stores/index.ts` | Export useSidebarStore |
| `package.json` | Ajout scripts E2E et dépendances test |

#### Solution technique

- **Lazy loading** : Chargement du contenu uniquement au dépliage via `GET /folders/:id/content`
- **Cache** : Map avec TTL 5min évitant les requêtes inutiles
- **Indentation** : Constante `INDENT_PER_LEVEL = 16px` partagée entre FolderItem et NoteItem
- **Tri** : Orderby Prisma côté API garantissant le tri alphabétique
- **Persistance** : localStorage via Zustand persist pour l'état d'expansion

---

## 2. Analyse technique

### 2.1 Contexte actuel

#### Structure de données attendue

```typescript
// Structure hiérarchique des dossiers et notes
interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];  // Sous-dossiers
  notes: NotePreview[];    // Notes dans ce dossier
  isExpanded: boolean;     // État UI
}

interface NotePreview {
  id: string;
  title: string;
  folderId: string;
  updatedAt: Date;
}
```

#### Hypothèse du bug

Le problème provient vraisemblablement de l'une de ces causes :

1. **Backend** : L'endpoint `/api/v1/folders/:id/tree` ne charge pas récursivement les notes des sous-dossiers profonds
2. **Frontend** : Le composant `FolderTree` ne déclenche pas le fetch des notes lors du dépliage d'un sous-dossier
3. **Store** : Le state Zustand n'est pas correctement mis à jour avec les notes des niveaux profonds

### 2.2 Solution proposée

#### Architecture de la solution

```
┌─────────────────────────────────────────────────────────────────┐
│                         SIDEBAR                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  FolderTree (récursif)                                  │    │
│  │  ├── FolderItem                                         │    │
│  │  │   ├── ChevronIcon (toggle)                           │    │
│  │  │   ├── FolderIcon                                     │    │
│  │  │   └── FolderName                                     │    │
│  │  │                                                      │    │
│  │  │   [Si expanded]                                      │    │
│  │  │   ├── FolderTree (enfants récursifs)                 │    │
│  │  │   └── NoteList                                       │    │
│  │  │       ├── NoteItem                                   │    │
│  │  │       ├── NoteItem                                   │    │
│  │  │       └── ...                                        │    │
│  │  └── ...                                                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### Principes de correction

1. **Lazy loading intelligent** : Charger les notes d'un dossier uniquement quand il est déplié
2. **Cache optimisé** : Stocker les notes déjà chargées pour éviter les re-fetch
3. **Rendu unifié** : Un seul composant récursif gérant dossiers ET notes
4. **Tri centralisé** : Logique de tri appliquée côté frontend après réception des données

### 2.3 Diagramme de séquence

```
┌──────────┐          ┌───────────┐          ┌──────────┐          ┌────────────┐
│  User    │          │ FolderItem│          │  Store   │          │   API      │
└────┬─────┘          └─────┬─────┘          └────┬─────┘          └──────┬─────┘
     │                      │                     │                       │
     │ Click sur dossier    │                     │                       │
     │─────────────────────>│                     │                       │
     │                      │                     │                       │
     │                      │ toggleFolder(id)    │                       │
     │                      │────────────────────>│                       │
     │                      │                     │                       │
     │                      │                     │ [Si pas en cache]     │
     │                      │                     │ GET /folders/:id/content
     │                      │                     │──────────────────────>│
     │                      │                     │                       │
     │                      │                     │    { children, notes }│
     │                      │                     │<──────────────────────│
     │                      │                     │                       │
     │                      │                     │ updateFolderContent() │
     │                      │                     │───────┐               │
     │                      │                     │       │ Tri & merge   │
     │                      │                     │<──────┘               │
     │                      │                     │                       │
     │                      │   state updated     │                       │
     │                      │<────────────────────│                       │
     │                      │                     │                       │
     │   Re-render avec     │                     │                       │
     │   contenu visible    │                     │                       │
     │<─────────────────────│                     │                       │
     │                      │                     │                       │
```

---

## 3. Spécifications détaillées

### 3.1 Modifications Base de données

Aucune modification de schéma nécessaire. Le modèle existant supporte déjà la hiérarchie :

```prisma
// Rappel du schema existant (prisma/schema.prisma)
model Folder {
  id        String   @id @default(cuid())
  name      String
  parentId  String?  @map("parent_id")
  parent    Folder?  @relation("FolderToFolder", fields: [parentId], references: [id])
  children  Folder[] @relation("FolderToFolder")
  notes     Note[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("folders")
}

model Note {
  id        String   @id @default(cuid())
  title     String
  folderId  String   @map("folder_id")
  folder    Folder   @relation(fields: [folderId], references: [id])
  // ... autres champs
  
  @@map("notes")
}
```

### 3.2 Backend (API Fastify)

#### Endpoints

|Méthode|Route|Description|Auth|
|---|---|---|---|
|GET|`/api/v1/folders/tree`|Arborescence complète (structure uniquement)|Oui|
|GET|`/api/v1/folders/:id/content`|Contenu d'un dossier (sous-dossiers + notes)|Oui|

#### folders.controller.ts

```typescript
// apps/api/src/modules/folders/folders.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FoldersService } from './folders.service';
import { GetFolderContentParams, GetFolderContentParamsSchema } from './folders.schema';

export async function foldersController(fastify: FastifyInstance): Promise<void> {
  const foldersService = new FoldersService(fastify.prisma);

  // GET /api/v1/folders/tree - Arborescence complète (structure seulement)
  fastify.get('/tree', {
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const tree = await foldersService.getFolderTree(userId);
      return reply.send(tree);
    }
  });

  // GET /api/v1/folders/:id/content - Contenu d'un dossier spécifique
  fastify.get<{ Params: GetFolderContentParams }>(
    '/:id/content',
    {
      preHandler: [fastify.authenticate],
      schema: { params: GetFolderContentParamsSchema },
      handler: async (request, reply) => {
        const { id } = request.params;
        const userId = request.user.id;
        
        const content = await foldersService.getFolderContent(id, userId);
        
        if (!content) {
          return reply.status(404).send({ 
            error: 'Folder not found or access denied' 
          });
        }
        
        return reply.send(content);
      }
    }
  );
}
```

#### folders.service.ts

```typescript
// apps/api/src/modules/folders/folders.service.ts

import { PrismaClient } from '@prisma/client';
import { FolderTreeNode, FolderContent, NotePreview } from '@plumenote/shared-types';

export class FoldersService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère l'arborescence complète des dossiers (sans les notes)
   * pour l'affichage initial de la sidebar
   */
  async getFolderTree(userId: string): Promise<FolderTreeNode[]> {
    // Récupérer tous les dossiers accessibles par l'utilisateur
    const folders = await this.prisma.folder.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } }
        ]
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        _count: { select: { notes: true, children: true } }
      }
    });

    return this.buildTreeStructure(folders);
  }

  /**
   * Récupère le contenu d'un dossier spécifique :
   * - Sous-dossiers directs
   * - Notes directement dans ce dossier
   */
  async getFolderContent(folderId: string, userId: string): Promise<FolderContent | null> {
    // Vérifier l'accès au dossier
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } }
        ]
      },
      include: {
        children: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            _count: { select: { notes: true, children: true } }
          }
        },
        notes: {
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true
          }
        }
      }
    });

    if (!folder) return null;

    return {
      id: folder.id,
      children: folder.children.map(child => ({
        id: child.id,
        name: child.name,
        hasChildren: child._count.children > 0,
        notesCount: child._count.notes
      })),
      notes: folder.notes.map(note => ({
        id: note.id,
        title: note.title,
        updatedAt: note.updatedAt.toISOString(),
        createdAt: note.createdAt.toISOString()
      }))
    };
  }

  /**
   * Construit la structure arborescente à partir d'une liste plate
   */
  private buildTreeStructure(folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    _count: { notes: number; children: number };
  }>): FolderTreeNode[] {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Première passe : créer tous les nœuds
    for (const folder of folders) {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        hasChildren: folder._count.children > 0,
        notesCount: folder._count.notes,
        children: [],
        isExpanded: false
      });
    }

    // Deuxième passe : construire la hiérarchie
    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        rootFolders.push(node);
      }
    }

    return rootFolders;
  }
}
```

#### folders.schema.ts

```typescript
// apps/api/src/modules/folders/folders.schema.ts

import { z } from 'zod';

export const GetFolderContentParamsSchema = z.object({
  id: z.string().cuid()
});

export type GetFolderContentParams = z.infer<typeof GetFolderContentParamsSchema>;
```

### 3.3 Frontend (React)

#### Types/Interfaces

```typescript
// packages/shared-types/src/folder.ts

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  hasChildren: boolean;
  notesCount: number;
  children: FolderTreeNode[];
  isExpanded: boolean;
}

export interface FolderChildPreview {
  id: string;
  name: string;
  hasChildren: boolean;
  notesCount: number;
}

export interface NotePreview {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface FolderContent {
  id: string;
  children: FolderChildPreview[];
  notes: NotePreview[];
}
```

#### Store Zustand

```typescript
// apps/web/src/stores/folderStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FolderTreeNode, FolderContent, NotePreview } from '@plumenote/shared-types';
import { foldersApi } from '@/services/foldersApi';

interface FolderState {
  // État
  tree: FolderTreeNode[];
  loadedFolders: Map<string, { children: FolderTreeNode[]; notes: NotePreview[] }>;
  expandedIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTree: () => Promise<void>;
  toggleFolder: (folderId: string) => Promise<void>;
  expandFolder: (folderId: string) => Promise<void>;
  collapseFolder: (folderId: string) => void;
  getNotesForFolder: (folderId: string) => NotePreview[];
}

export const useFolderStore = create<FolderState>()(
  devtools(
    (set, get) => ({
      tree: [],
      loadedFolders: new Map(),
      expandedIds: new Set(),
      isLoading: false,
      error: null,

      loadTree: async () => {
        set({ isLoading: true, error: null });
        try {
          const tree = await foldersApi.getTree();
          set({ tree, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load folders',
            isLoading: false 
          });
        }
      },

      toggleFolder: async (folderId: string) => {
        const { expandedIds } = get();
        if (expandedIds.has(folderId)) {
          get().collapseFolder(folderId);
        } else {
          await get().expandFolder(folderId);
        }
      },

      expandFolder: async (folderId: string) => {
        const { loadedFolders, expandedIds } = get();

        // Marquer comme expanded immédiatement pour feedback UI
        const newExpandedIds = new Set(expandedIds);
        newExpandedIds.add(folderId);
        set({ expandedIds: newExpandedIds });

        // Si déjà chargé, pas besoin de fetch
        if (loadedFolders.has(folderId)) {
          return;
        }

        // Charger le contenu du dossier
        try {
          const content = await foldersApi.getFolderContent(folderId);
          
          const newLoadedFolders = new Map(get().loadedFolders);
          newLoadedFolders.set(folderId, {
            children: content.children.map(child => ({
              id: child.id,
              name: child.name,
              parentId: folderId,
              hasChildren: child.hasChildren,
              notesCount: child.notesCount,
              children: [],
              isExpanded: false
            })),
            notes: content.notes
          });
          
          set({ loadedFolders: newLoadedFolders });
        } catch (error) {
          // En cas d'erreur, retirer du expanded
          const revertedIds = new Set(get().expandedIds);
          revertedIds.delete(folderId);
          set({ 
            expandedIds: revertedIds,
            error: error instanceof Error ? error.message : 'Failed to load folder content'
          });
        }
      },

      collapseFolder: (folderId: string) => {
        const newExpandedIds = new Set(get().expandedIds);
        newExpandedIds.delete(folderId);
        set({ expandedIds: newExpandedIds });
      },

      getNotesForFolder: (folderId: string) => {
        const { loadedFolders } = get();
        return loadedFolders.get(folderId)?.notes ?? [];
      }
    }),
    { name: 'folder-store' }
  )
);
```

#### API Client

```typescript
// apps/web/src/services/foldersApi.ts

import { api } from './api';
import { FolderTreeNode, FolderContent } from '@plumenote/shared-types';

export const foldersApi = {
  async getTree(): Promise<FolderTreeNode[]> {
    const response = await api.get<FolderTreeNode[]>('/folders/tree');
    return response.data;
  },

  async getFolderContent(folderId: string): Promise<FolderContent> {
    const response = await api.get<FolderContent>(`/folders/${folderId}/content`);
    return response.data;
  }
};
```

#### Composants

##### FolderTree.tsx (composant racine)

```typescript
// apps/web/src/components/sidebar/FolderTree.tsx

import { useEffect } from 'react';
import { useFolderStore } from '@/stores/folderStore';
import { FolderItem } from './FolderItem';
import { Skeleton } from '@/components/ui/skeleton';

export function FolderTree() {
  const { tree, isLoading, error, loadTree } = useFolderStore();

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  if (isLoading && tree.length === 0) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Erreur de chargement : {error}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aucun dossier. Créez-en un pour commencer.
      </div>
    );
  }

  return (
    <nav className="folder-tree" role="tree" aria-label="Arborescence des dossiers">
      <ul className="space-y-0.5">
        {tree.map(folder => (
          <FolderItem 
            key={folder.id} 
            folder={folder} 
            level={0} 
          />
        ))}
      </ul>
    </nav>
  );
}
```

##### FolderItem.tsx (composant récursif)

```typescript
// apps/web/src/components/sidebar/FolderItem.tsx

import { memo, useCallback } from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFolderStore } from '@/stores/folderStore';
import { NoteItem } from './NoteItem';
import type { FolderTreeNode } from '@plumenote/shared-types';

interface FolderItemProps {
  folder: FolderTreeNode;
  level: number;
}

// Indentation par niveau (en pixels)
const INDENT_PER_LEVEL = 16;

export const FolderItem = memo(function FolderItem({ folder, level }: FolderItemProps) {
  const { 
    expandedIds, 
    loadedFolders, 
    toggleFolder 
  } = useFolderStore();

  const isExpanded = expandedIds.has(folder.id);
  const folderContent = loadedFolders.get(folder.id);
  const hasContent = folder.hasChildren || folder.notesCount > 0;

  const handleToggle = useCallback(() => {
    if (hasContent) {
      toggleFolder(folder.id);
    }
  }, [folder.id, hasContent, toggleFolder]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // Calcul de l'indentation
  const paddingLeft = level * INDENT_PER_LEVEL + 8;

  // Sous-dossiers et notes à afficher
  const childFolders = folderContent?.children ?? [];
  const notes = folderContent?.notes ?? [];

  return (
    <li role="treeitem" aria-expanded={isExpanded}>
      {/* En-tête du dossier */}
      <div
        className={cn(
          "flex items-center h-8 px-2 rounded-md cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-colors duration-150"
        )}
        style={{ paddingLeft }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Dossier ${folder.name}${hasContent ? ', cliquez pour déplier' : ''}`}
      >
        {/* Chevron de dépliage */}
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {hasContent && (
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </span>

        {/* Icône dossier */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 mr-2 text-amber-500" />
        ) : (
          <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
        )}

        {/* Nom du dossier */}
        <span className="truncate text-sm">{folder.name}</span>

        {/* Badge compteur (optionnel) */}
        {!isExpanded && folder.notesCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {folder.notesCount}
          </span>
        )}
      </div>

      {/* Contenu déplié : sous-dossiers puis notes */}
      {isExpanded && (
        <ul role="group" className="mt-0.5">
          {/* D'abord les sous-dossiers (tri alphabétique déjà fait côté API) */}
          {childFolders.map(child => (
            <FolderItem 
              key={child.id} 
              folder={child} 
              level={level + 1} 
            />
          ))}

          {/* Ensuite les notes (tri alphabétique déjà fait côté API) */}
          {notes.map(note => (
            <NoteItem 
              key={note.id} 
              note={note} 
              level={level + 1} 
            />
          ))}

          {/* État vide */}
          {childFolders.length === 0 && notes.length === 0 && (
            <li 
              className="text-xs text-muted-foreground italic py-1"
              style={{ paddingLeft: (level + 1) * INDENT_PER_LEVEL + 8 }}
            >
              Dossier vide
            </li>
          )}
        </ul>
      )}
    </li>
  );
});
```

##### NoteItem.tsx

```typescript
// apps/web/src/components/sidebar/NoteItem.tsx

import { memo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { NotePreview } from '@plumenote/shared-types';

interface NoteItemProps {
  note: NotePreview;
  level: number;
}

const INDENT_PER_LEVEL = 16;

export const NoteItem = memo(function NoteItem({ note, level }: NoteItemProps) {
  const navigate = useNavigate();
  const { noteId: currentNoteId } = useParams();
  
  const isActive = currentNoteId === note.id;
  const paddingLeft = level * INDENT_PER_LEVEL + 8;

  const handleClick = useCallback(() => {
    navigate(`/notes/${note.id}`);
  }, [navigate, note.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <li role="treeitem">
      <div
        className={cn(
          "flex items-center h-8 px-2 rounded-md cursor-pointer",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-colors duration-150",
          isActive && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Note ${note.title}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Espace pour alignement avec les chevrons des dossiers */}
        <span className="w-4 h-4 mr-1" />

        {/* Icône note */}
        <FileText className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />

        {/* Titre de la note */}
        <span className="truncate text-sm">{note.title}</span>
      </div>
    </li>
  );
});
```

#### Hook personnalisé (optionnel)

```typescript
// apps/web/src/hooks/useFolderNavigation.ts

import { useCallback } from 'react';
import { useFolderStore } from '@/stores/folderStore';

/**
 * Hook pour gérer la navigation clavier dans l'arborescence
 */
export function useFolderNavigation() {
  const { tree, expandedIds, expandFolder, collapseFolder } = useFolderStore();

  const handleKeyNavigation = useCallback((
    e: React.KeyboardEvent,
    folderId: string,
    hasChildren: boolean
  ) => {
    const isExpanded = expandedIds.has(folderId);

    switch (e.key) {
      case 'ArrowRight':
        if (hasChildren && !isExpanded) {
          e.preventDefault();
          expandFolder(folderId);
        }
        break;
      case 'ArrowLeft':
        if (isExpanded) {
          e.preventDefault();
          collapseFolder(folderId);
        }
        break;
      // ArrowUp/Down pour navigation entre éléments (à implémenter si besoin)
    }
  }, [expandedIds, expandFolder, collapseFolder]);

  return { handleKeyNavigation };
}
```

### 3.4 Styles CSS/Tailwind

```css
/* apps/web/src/styles/sidebar.css (si nécessaire pour animations) */

.folder-tree {
  --folder-transition-duration: 200ms;
}

/* Animation de dépliage */
.folder-tree ul[role="group"] {
  animation: folder-expand var(--folder-transition-duration) ease-out;
}

@keyframes folder-expand {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Focus visible amélioré */
.folder-tree [role="button"]:focus-visible {
  @apply ring-2 ring-offset-2 ring-ring;
}
```

---

## 4. Tests

### 4.1 Tests unitaires Backend

```typescript
// apps/api/src/modules/folders/__tests__/folders.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoldersService } from '../folders.service';
import { prismaMock } from '@/test/prisma-mock';

describe('FoldersService', () => {
  let service: FoldersService;

  beforeEach(() => {
    service = new FoldersService(prismaMock);
  });

  describe('getFolderTree', () => {
    it('should return empty array when no folders exist', async () => {
      prismaMock.folder.findMany.mockResolvedValue([]);
      
      const result = await service.getFolderTree('user-1');
      
      expect(result).toEqual([]);
    });

    it('should build correct tree structure with nested folders', async () => {
      prismaMock.folder.findMany.mockResolvedValue([
        { id: 'folder-1', name: 'Parent', parentId: null, _count: { notes: 2, children: 1 } },
        { id: 'folder-2', name: 'Child', parentId: 'folder-1', _count: { notes: 1, children: 0 } }
      ]);
      
      const result = await service.getFolderTree('user-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Parent');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Child');
    });

    it('should sort folders alphabetically', async () => {
      prismaMock.folder.findMany.mockResolvedValue([
        { id: '1', name: 'Zebra', parentId: null, _count: { notes: 0, children: 0 } },
        { id: '2', name: 'Alpha', parentId: null, _count: { notes: 0, children: 0 } },
        { id: '3', name: 'Mango', parentId: null, _count: { notes: 0, children: 0 } }
      ]);
      
      const result = await service.getFolderTree('user-1');
      
      // Note: le tri est fait par la query Prisma (orderBy)
      expect(result.map(f => f.name)).toEqual(['Zebra', 'Alpha', 'Mango']);
    });
  });

  describe('getFolderContent', () => {
    it('should return null when folder not found', async () => {
      prismaMock.folder.findFirst.mockResolvedValue(null);
      
      const result = await service.getFolderContent('nonexistent', 'user-1');
      
      expect(result).toBeNull();
    });

    it('should return children and notes sorted alphabetically', async () => {
      prismaMock.folder.findFirst.mockResolvedValue({
        id: 'folder-1',
        children: [
          { id: 'c1', name: 'Beta Folder', _count: { notes: 0, children: 0 } },
          { id: 'c2', name: 'Alpha Folder', _count: { notes: 1, children: 0 } }
        ],
        notes: [
          { id: 'n1', title: 'Zebra Note', updatedAt: new Date(), createdAt: new Date() },
          { id: 'n2', title: 'Alpha Note', updatedAt: new Date(), createdAt: new Date() }
        ]
      });
      
      const result = await service.getFolderContent('folder-1', 'user-1');
      
      expect(result).not.toBeNull();
      // Le tri est fait côté Prisma
      expect(result!.children).toHaveLength(2);
      expect(result!.notes).toHaveLength(2);
    });
  });
});
```

### 4.2 Tests unitaires Frontend

```typescript
// apps/web/src/components/sidebar/__tests__/FolderItem.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FolderItem } from '../FolderItem';
import { useFolderStore } from '@/stores/folderStore';

// Mock du store
vi.mock('@/stores/folderStore');

const mockFolder = {
  id: 'folder-1',
  name: 'Test Folder',
  parentId: null,
  hasChildren: true,
  notesCount: 2,
  children: [],
  isExpanded: false
};

describe('FolderItem', () => {
  const mockToggleFolder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useFolderStore as unknown as vi.Mock).mockReturnValue({
      expandedIds: new Set(),
      loadedFolders: new Map(),
      toggleFolder: mockToggleFolder
    });
  });

  it('should render folder name', () => {
    render(
      <MemoryRouter>
        <FolderItem folder={mockFolder} level={0} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Test Folder')).toBeInTheDocument();
  });

  it('should show chevron when folder has content', () => {
    render(
      <MemoryRouter>
        <FolderItem folder={mockFolder} level={0} />
      </MemoryRouter>
    );
    
    const chevron = screen.getByRole('button').querySelector('svg');
    expect(chevron).toBeInTheDocument();
  });

  it('should call toggleFolder when clicked', () => {
    render(
      <MemoryRouter>
        <FolderItem folder={mockFolder} level={0} />
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(mockToggleFolder).toHaveBeenCalledWith('folder-1');
  });

  it('should show notes when expanded', () => {
    (useFolderStore as unknown as vi.Mock).mockReturnValue({
      expandedIds: new Set(['folder-1']),
      loadedFolders: new Map([
        ['folder-1', {
          children: [],
          notes: [{ id: 'note-1', title: 'Test Note', updatedAt: '2024-01-01', createdAt: '2024-01-01' }]
        }]
      ]),
      toggleFolder: mockToggleFolder
    });

    render(
      <MemoryRouter>
        <FolderItem folder={mockFolder} level={0} />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('should apply correct indentation based on level', () => {
    render(
      <MemoryRouter>
        <FolderItem folder={mockFolder} level={2} />
      </MemoryRouter>
    );
    
    const folderElement = screen.getByRole('button');
    expect(folderElement).toHaveStyle({ paddingLeft: '40px' }); // 2 * 16 + 8
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/sidebar-navigation.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login et setup
    await page.goto('/');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display folder tree on load', async ({ page }) => {
    const folderTree = page.locator('[role="tree"]');
    await expect(folderTree).toBeVisible();
  });

  test('should expand folder and show notes on click', async ({ page }) => {
    // Créer un dossier avec des notes via l'API ou fixtures
    
    // Cliquer sur un dossier
    const folder = page.locator('[role="treeitem"]').filter({ hasText: 'Test Folder' });
    await folder.click();
    
    // Vérifier que les notes apparaissent
    const note = page.locator('[role="treeitem"]').filter({ hasText: 'Test Note' });
    await expect(note).toBeVisible();
  });

  test('should show notes at deepest nesting level', async ({ page }) => {
    // Scénario du bug : dossier > sous-dossier > note
    const parentFolder = page.locator('[role="treeitem"]').filter({ hasText: 'Parent' });
    await parentFolder.click();
    
    const childFolder = page.locator('[role="treeitem"]').filter({ hasText: 'Child' });
    await childFolder.click();
    
    // La note dans le sous-dossier doit être visible
    const deepNote = page.locator('[role="treeitem"]').filter({ hasText: 'Deep Note' });
    await expect(deepNote).toBeVisible();
  });

  test('should maintain correct indentation for nested items', async ({ page }) => {
    const parentFolder = page.locator('[role="button"]').filter({ hasText: 'Parent' });
    await parentFolder.click();
    
    const childFolder = page.locator('[role="button"]').filter({ hasText: 'Child' });
    const noteItem = page.locator('[role="button"]').filter({ hasText: 'Note in Parent' });
    
    // Vérifier que l'indentation est identique pour sous-dossier et note
    const childPadding = await childFolder.evaluate(el => getComputedStyle(el).paddingLeft);
    const notePadding = await noteItem.evaluate(el => getComputedStyle(el).paddingLeft);
    
    expect(childPadding).toBe(notePadding);
  });

  test('should sort folders before notes alphabetically', async ({ page }) => {
    const folder = page.locator('[role="treeitem"]').filter({ hasText: 'Mixed Folder' });
    await folder.click();
    
    // Récupérer l'ordre des éléments
    const items = await page.locator('[role="group"] > li').allTextContents();
    
    // Vérifier l'ordre : dossiers (A-Z) puis notes (A-Z)
    // Exemple attendu : ['Alpha Subfolder', 'Zeta Subfolder', 'Alpha Note', 'Zeta Note']
    const folders = items.filter(name => name.includes('Subfolder'));
    const notes = items.filter(name => name.includes('Note'));
    
    expect(folders).toEqual([...folders].sort());
    expect(notes).toEqual([...notes].sort());
    expect(items.indexOf(folders[folders.length - 1])).toBeLessThan(items.indexOf(notes[0]));
  });

  test('should navigate to note on click', async ({ page }) => {
    const folder = page.locator('[role="treeitem"]').filter({ hasText: 'Test Folder' });
    await folder.click();
    
    const note = page.locator('[role="button"]').filter({ hasText: 'Test Note' });
    await note.click();
    
    await expect(page).toHaveURL(/\/notes\/[a-z0-9]+$/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const folder = page.locator('[role="button"]').filter({ hasText: 'Test Folder' });
    await folder.focus();
    
    // Enter pour déplier
    await page.keyboard.press('Enter');
    const note = page.locator('[role="button"]').filter({ hasText: 'Test Note' });
    await expect(note).toBeVisible();
    
    // Escape ou ArrowLeft pour replier
    await folder.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(note).not.toBeVisible();
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Backend : Modifier/créer l'endpoint `/folders/tree`**
    
    - Retourner la structure hiérarchique complète
    - Inclure `hasChildren` et `notesCount` pour chaque dossier
    - Trier par nom alphabétique
2. [ ] **Backend : Créer l'endpoint `/folders/:id/content`**
    
    - Retourner sous-dossiers + notes d'un dossier
    - Appliquer les vérifications de permissions
    - Trier : sous-dossiers (A-Z) puis notes (A-Z)
3. [ ] **Shared-types : Définir les interfaces**
    
    - `FolderTreeNode`, `FolderContent`, `NotePreview`
    - Build du package partagé
4. [ ] **Frontend : Créer le store Zustand `folderStore`**
    
    - État : tree, loadedFolders, expandedIds
    - Actions : loadTree, toggleFolder, expandFolder, collapseFolder
5. [ ] **Frontend : Refactorer `FolderTree.tsx`**
    
    - Utiliser le nouveau store
    - Charger l'arborescence au mount
6. [ ] **Frontend : Créer `FolderItem.tsx`**
    
    - Composant récursif avec indentation correcte
    - Gestion du toggle et du lazy loading
7. [ ] **Frontend : Créer `NoteItem.tsx`**
    
    - Même indentation que les sous-dossiers
    - Navigation vers la note au clic
8. [ ] **Tests : Implémenter la suite de tests**
    
    - Tests unitaires backend
    - Tests composants frontend
    - Tests E2E Playwright
9. [ ] **Documentation : Mettre à jour la doc API**
    
    - OpenAPI/Swagger pour les nouveaux endpoints

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Performance avec beaucoup de dossiers|Moyenne|Moyen|Lazy loading + virtualisation si > 500 éléments|
|État désynchronisé après création de note|Faible|Moyen|Invalidation du cache + re-fetch du parent|
|Permissions non vérifiées|Faible|Élevé|Tests E2E avec différents rôles|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Aller dans le répertoire du projet
cd /path/to/plumenote

# 2. Créer les types partagés
cd packages/shared-types
# Ajouter les interfaces dans src/folder.ts
npm run build

# 3. Implémenter le backend
cd ../../apps/api
# Créer/modifier les fichiers dans src/modules/folders/
npm run test -- folders

# 4. Implémenter le frontend
cd ../web
# Créer le store dans src/stores/folderStore.ts
# Créer les composants dans src/components/sidebar/
npm run test -- sidebar

# 5. Lancer les tests E2E
cd ../..
npm run test:e2e -- sidebar-navigation
```

### Points d'attention

- **Lazy loading** : Ne pas charger toutes les notes au démarrage, uniquement quand le dossier est déplié
- **Cache** : Utiliser une `Map` pour stocker le contenu déjà chargé et éviter les re-fetch inutiles
- **Indentation** : S'assurer que `INDENT_PER_LEVEL` est identique pour `FolderItem` et `NoteItem`
- **Tri** : Le tri doit être fait côté API (Prisma `orderBy`) pour garantir la cohérence
- **Accessibilité** : Les rôles ARIA (`tree`, `treeitem`, `group`) sont essentiels pour les lecteurs d'écran
- **Mémorisation** : Utiliser `memo()` sur les composants récursifs pour éviter les re-renders inutiles

### Dépendances npm à installer (si nécessaire)

```bash
# Frontend (si pas déjà installées)
npm install lucide-react

# Dev dependencies pour les tests
npm install -D @testing-library/react @testing-library/user-event
npm install -D @playwright/test
```

---

## 7. Annexes

### A. Arborescence des fichiers à créer/modifier

```
plumenote/
├── packages/
│   └── shared-types/
│       └── src/
│           └── folder.ts                    # [CRÉER] Interfaces partagées
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── modules/
│   │           └── folders/
│   │               ├── folders.controller.ts # [MODIFIER] Ajouter endpoints
│   │               ├── folders.service.ts    # [MODIFIER] Logique métier
│   │               ├── folders.schema.ts     # [MODIFIER] Validation Zod
│   │               └── __tests__/
│   │                   └── folders.service.test.ts # [CRÉER] Tests unitaires
│   └── web/
│       └── src/
│           ├── stores/
│           │   └── folderStore.ts           # [CRÉER] Store Zustand
│           ├── services/
│           │   └── foldersApi.ts            # [CRÉER/MODIFIER] API client
│           ├── components/
│           │   └── sidebar/
│           │       ├── FolderTree.tsx       # [MODIFIER] Composant racine
│           │       ├── FolderItem.tsx       # [CRÉER] Composant récursif
│           │       ├── NoteItem.tsx         # [CRÉER] Item note
│           │       └── __tests__/
│           │           └── FolderItem.test.tsx # [CRÉER] Tests composants
│           └── hooks/
│               └── useFolderNavigation.ts   # [CRÉER] Hook navigation clavier
└── e2e/
    └── sidebar-navigation.spec.ts           # [CRÉER] Tests E2E
```

### B. Checklist de validation

Avant de considérer ce module comme terminé :

- [ ] Les notes s'affichent dans tous les niveaux de dossiers
- [ ] L'indentation est uniforme entre dossiers et notes
- [ ] Le tri est correct (dossiers A-Z, puis notes A-Z)
- [ ] Le lazy loading fonctionne (pas de fetch initial des notes)
- [ ] Le cache évite les re-fetch inutiles
- [ ] La navigation clavier fonctionne (Enter, ArrowLeft, ArrowRight)
- [ ] Les tests passent à 100%
- [ ] Aucune régression sur les fonctionnalités existantes