// ===========================================
// Store Sidebar (Zustand) - P0
// Lazy loading avec cache pour l'arborescence
// ===========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FolderTreeNode,
  FolderContent,
  NotePreview,
  SidebarFolderNode,
} from '@plumenote/types';
import { api } from '../lib/api';
import { naturalCompare } from '../lib/naturalSort';

// ----- Types internes -----

interface FolderCache {
  children: SidebarFolderNode[];
  notes: NotePreview[];
  loadedAt: number;
}

interface SidebarState {
  // État
  tree: SidebarFolderNode[];
  expandedIds: Set<string>;
  loadedFolders: Map<string, FolderCache>;
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  isLoading: boolean;
  isLoadingFolder: string | null;
  error: string | null;

  // Actions - Chargement
  fetchTree: () => Promise<void>;
  loadFolderContent: (folderId: string) => Promise<void>;
  refreshFolder: (folderId: string) => Promise<void>;

  // Actions - Navigation
  toggleFolder: (folderId: string) => Promise<void>;
  expandFolder: (folderId: string) => Promise<void>;
  collapseFolder: (folderId: string) => void;
  expandToNote: (noteId: string, folderId: string) => Promise<void>;

  // Actions - Sélection
  selectFolder: (folderId: string | null) => void;
  selectNote: (noteId: string | null) => void;

  // Actions - Mutations optimistes
  addFolderToTree: (folder: SidebarFolderNode, parentId: string | null) => void;
  removeFolderFromTree: (folderId: string) => void;
  addNoteToFolder: (folderId: string, note: NotePreview) => void;
  removeNoteFromFolder: (folderId: string, noteId: string) => void;
  invalidateFolderCache: (folderId: string) => void;

  // Getters
  getFolderContent: (folderId: string) => FolderCache | undefined;
  isFolderExpanded: (folderId: string) => boolean;
  isFolderLoaded: (folderId: string) => boolean;
}

// ----- Helpers -----

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(cache: FolderCache | undefined): boolean {
  if (!cache) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL;
}

function convertTreeNodeToSidebar(node: FolderTreeNode): SidebarFolderNode {
  // FEAT-03: Tri alphanumérique naturel des enfants et notes
  const sortedChildren = [...node.children]
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map(convertTreeNodeToSidebar);

  const sortedNotes = (node.notes ?? [])
    .map((n) => ({
      id: n.id,
      title: n.title,
      slug: n.slug,
      position: 0,
      updatedAt: n.updatedAt,
      createdAt: n.updatedAt,
    }))
    .sort((a, b) => naturalCompare(a.title, b.title));

  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentId: node.parentId,
    color: node.color,
    icon: node.icon,
    position: node.position,
    hasChildren: node.children.length > 0 || node.level === 0,
    notesCount: node.notes?.length ?? 0,
    children: sortedChildren,
    notes: sortedNotes,
    isLoaded: node.notes !== undefined && node.notes.length > 0,
    accessType: node.accessType,
  };
}

// ----- Types pour persistance -----

interface PersistedSidebarState {
  expandedIds: string[];
  selectedFolderId: string | null;
}

// ----- Store -----

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // État initial
      tree: [],
      expandedIds: new Set<string>(),
      loadedFolders: new Map<string, FolderCache>(),
      selectedFolderId: null,
      selectedNoteId: null,
      isLoading: false,
      isLoadingFolder: null,
      error: null,

      // ----- Chargement de l'arbre -----

      fetchTree: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.get<{ tree: FolderTreeNode[] }>('/folders/tree');
          // FEAT-03: Trier l'arbre racine par ordre alphanumérique
          const tree = response.data.tree
            .map(convertTreeNodeToSidebar)
            .sort((a, b) => naturalCompare(a.name, b.name));

          // Pré-remplir le cache avec les données de l'arbre
          const loadedFolders = new Map<string, FolderCache>();
          const populateCache = (nodes: SidebarFolderNode[]) => {
            for (const node of nodes) {
              if (node.notes.length > 0 || node.children.length > 0) {
                loadedFolders.set(node.id, {
                  children: node.children,
                  notes: node.notes,
                  loadedAt: Date.now(),
                });
              }
              if (node.children.length > 0) {
                populateCache(node.children);
              }
            }
          };
          populateCache(tree);

          set({ tree, loadedFolders, isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erreur de chargement';
          set({ error: message, isLoading: false });
        }
      },

      // ----- Lazy loading du contenu d'un dossier -----

      loadFolderContent: async (folderId: string) => {
        const { loadedFolders } = get();

        // Vérifier le cache
        const cached = loadedFolders.get(folderId);
        if (isCacheValid(cached)) {
          return;
        }

        set({ isLoadingFolder: folderId });

        try {
          const response = await api.get<FolderContent>(`/folders/${folderId}/content`);
          const content = response.data;

          // FEAT-03: Convertir en SidebarFolderNode avec tri alphanumérique
          const children: SidebarFolderNode[] = content.children
            .map((child) => ({
              id: child.id,
              name: child.name,
              slug: child.slug,
              parentId: folderId,
              color: child.color,
              icon: child.icon,
              position: child.position,
              hasChildren: child.hasChildren,
              notesCount: child.notesCount,
              children: [],
              notes: [],
              isLoaded: false,
            }))
            .sort((a, b) => naturalCompare(a.name, b.name));

          // FEAT-03: Trier les notes par titre
          const sortedNotes = [...content.notes].sort((a, b) => naturalCompare(a.title, b.title));

          // Mettre à jour le cache
          const newLoadedFolders = new Map(get().loadedFolders);
          newLoadedFolders.set(folderId, {
            children,
            notes: sortedNotes,
            loadedAt: Date.now(),
          });

          // Mettre à jour l'arbre avec les nouveaux enfants (déjà triés)
          const updateTree = (nodes: SidebarFolderNode[]): SidebarFolderNode[] => {
            return nodes.map((node) => {
              if (node.id === folderId) {
                return {
                  ...node,
                  children,
                  notes: sortedNotes,
                  isLoaded: true,
                };
              }
              if (node.children.length > 0) {
                return { ...node, children: updateTree(node.children) };
              }
              return node;
            });
          };

          set({
            tree: updateTree(get().tree),
            loadedFolders: newLoadedFolders,
            isLoadingFolder: null,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erreur de chargement du dossier';
          set({ error: message, isLoadingFolder: null });
        }
      },

      refreshFolder: async (folderId: string) => {
        // Invalider le cache et recharger
        const newLoadedFolders = new Map(get().loadedFolders);
        newLoadedFolders.delete(folderId);
        set({ loadedFolders: newLoadedFolders });
        await get().loadFolderContent(folderId);
      },

      // ----- Navigation -----

      toggleFolder: async (folderId: string) => {
        const { expandedIds } = get();
        if (expandedIds.has(folderId)) {
          get().collapseFolder(folderId);
        } else {
          await get().expandFolder(folderId);
        }
      },

      expandFolder: async (folderId: string) => {
        const { expandedIds } = get();

        // Marquer comme expanded
        const newExpandedIds = new Set(expandedIds);
        newExpandedIds.add(folderId);
        set({ expandedIds: newExpandedIds });

        // Charger le contenu si pas encore fait
        await get().loadFolderContent(folderId);
      },

      collapseFolder: (folderId: string) => {
        const newExpandedIds = new Set(get().expandedIds);
        newExpandedIds.delete(folderId);
        set({ expandedIds: newExpandedIds });
      },

      expandToNote: async (noteId: string, folderId: string) => {
        // Trouver le chemin vers le dossier et tout ouvrir
        const findPath = (
          nodes: SidebarFolderNode[],
          targetId: string,
          path: string[] = []
        ): string[] | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return [...path, node.id];
            }
            if (node.children.length > 0) {
              const result = findPath(node.children, targetId, [...path, node.id]);
              if (result) return result;
            }
          }
          return null;
        };

        const path = findPath(get().tree, folderId);
        if (path) {
          const newExpandedIds = new Set(get().expandedIds);
          for (const id of path) {
            newExpandedIds.add(id);
          }
          set({ expandedIds: newExpandedIds, selectedNoteId: noteId });

          // Charger le contenu de chaque dossier du chemin
          for (const id of path) {
            await get().loadFolderContent(id);
          }
        }
      },

      // ----- Sélection -----

      selectFolder: (folderId: string | null) => {
        set({ selectedFolderId: folderId, selectedNoteId: null });
      },

      selectNote: (noteId: string | null) => {
        set({ selectedNoteId: noteId });
      },

      // ----- Mutations optimistes -----

      addFolderToTree: (folder: SidebarFolderNode, parentId: string | null) => {
        const { tree, loadedFolders } = get();

        if (parentId === null) {
          // Ajouter à la racine
          set({ tree: [...tree, folder] });
        } else {
          // Ajouter dans un dossier parent
          const addToParent = (nodes: SidebarFolderNode[]): SidebarFolderNode[] => {
            return nodes.map((node) => {
              if (node.id === parentId) {
                return {
                  ...node,
                  children: [...node.children, folder],
                  hasChildren: true,
                };
              }
              if (node.children.length > 0) {
                return { ...node, children: addToParent(node.children) };
              }
              return node;
            });
          };
          set({ tree: addToParent(tree) });

          // Mettre à jour le cache du parent
          const parentCache = loadedFolders.get(parentId);
          if (parentCache) {
            const newLoadedFolders = new Map(loadedFolders);
            newLoadedFolders.set(parentId, {
              ...parentCache,
              children: [...parentCache.children, folder],
            });
            set({ loadedFolders: newLoadedFolders });
          }
        }
      },

      removeFolderFromTree: (folderId: string) => {
        const { tree, loadedFolders } = get();

        const removeFromNodes = (nodes: SidebarFolderNode[]): SidebarFolderNode[] => {
          return nodes
            .filter((node) => node.id !== folderId)
            .map((node) => {
              if (node.children.length > 0) {
                return { ...node, children: removeFromNodes(node.children) };
              }
              return node;
            });
        };

        // Supprimer du cache aussi
        const newLoadedFolders = new Map(loadedFolders);
        newLoadedFolders.delete(folderId);

        // Mettre à jour le cache du parent si existant
        for (const [id, cache] of newLoadedFolders) {
          const filteredChildren = cache.children.filter((c) => c.id !== folderId);
          if (filteredChildren.length !== cache.children.length) {
            newLoadedFolders.set(id, { ...cache, children: filteredChildren });
          }
        }

        set({
          tree: removeFromNodes(tree),
          loadedFolders: newLoadedFolders,
        });
      },

      addNoteToFolder: (folderId: string, note: NotePreview) => {
        const { tree, loadedFolders } = get();

        // Mettre à jour le cache du dossier
        const folderCache = loadedFolders.get(folderId);
        if (folderCache) {
          // Vérifier si la note existe déjà
          const existingIndex = folderCache.notes.findIndex((n) => n.id === note.id);
          if (existingIndex === -1) {
            const newLoadedFolders = new Map(loadedFolders);
            newLoadedFolders.set(folderId, {
              ...folderCache,
              notes: [note, ...folderCache.notes],
              loadedAt: Date.now(),
            });
            set({ loadedFolders: newLoadedFolders });
          }
        }

        // Mettre à jour l'arbre
        const updateTree = (nodes: SidebarFolderNode[]): SidebarFolderNode[] => {
          return nodes.map((node) => {
            if (node.id === folderId) {
              const existingNoteIndex = node.notes.findIndex((n) => n.id === note.id);
              if (existingNoteIndex === -1) {
                return {
                  ...node,
                  notes: [note, ...node.notes],
                  notesCount: node.notesCount + 1,
                };
              }
              return node;
            }
            if (node.children.length > 0) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };

        set({ tree: updateTree(tree) });
      },

      removeNoteFromFolder: (folderId: string, noteId: string) => {
        const { tree, loadedFolders } = get();

        // Mettre à jour le cache
        const folderCache = loadedFolders.get(folderId);
        if (folderCache) {
          const newLoadedFolders = new Map(loadedFolders);
          newLoadedFolders.set(folderId, {
            ...folderCache,
            notes: folderCache.notes.filter((n) => n.id !== noteId),
            loadedAt: Date.now(),
          });
          set({ loadedFolders: newLoadedFolders });
        }

        // Mettre à jour l'arbre
        const updateTree = (nodes: SidebarFolderNode[]): SidebarFolderNode[] => {
          return nodes.map((node) => {
            if (node.id === folderId) {
              return {
                ...node,
                notes: node.notes.filter((n) => n.id !== noteId),
                notesCount: Math.max(0, node.notesCount - 1),
              };
            }
            if (node.children.length > 0) {
              return { ...node, children: updateTree(node.children) };
            }
            return node;
          });
        };

        set({ tree: updateTree(tree) });
      },

      invalidateFolderCache: (folderId: string) => {
        const newLoadedFolders = new Map(get().loadedFolders);
        newLoadedFolders.delete(folderId);
        set({ loadedFolders: newLoadedFolders });
      },

      // ----- Getters -----

      getFolderContent: (folderId: string) => {
        return get().loadedFolders.get(folderId);
      },

      isFolderExpanded: (folderId: string) => {
        return get().expandedIds.has(folderId);
      },

      isFolderLoaded: (folderId: string) => {
        return isCacheValid(get().loadedFolders.get(folderId));
      },
    }),
    {
      name: 'plumenote-sidebar',
      storage: createJSONStorage(() => localStorage),

      // Ne persister que l'état d'expansion
      partialize: (state): PersistedSidebarState => ({
        expandedIds: Array.from(state.expandedIds),
        selectedFolderId: state.selectedFolderId,
      }),

      // Reconstruire le Set depuis l'Array
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedSidebarState | undefined;
        if (!persisted) return currentState;

        return {
          ...currentState,
          expandedIds: new Set(persisted.expandedIds || []),
          selectedFolderId: persisted.selectedFolderId ?? null,
        };
      },

      version: 1,
    }
  )
);
