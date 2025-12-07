// ===========================================
// Store Notes Personnelles (Zustand)
// Gestion de l'espace personnel isolé
// ===========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PersonalFolder,
  PersonalFolderDetail,
  PersonalNote,
  PersonalNotePreview,
  PersonalSearchResult,
  PersonalTreeNode,
  CreatePersonalFolderRequest,
  CreatePersonalNoteRequest,
  UpdatePersonalFolderRequest,
  UpdatePersonalNoteRequest,
} from '@plumenote/types';
import { personalApi } from '../services/personalApi';

// ----- Types -----

interface Breadcrumb {
  id: string;
  name: string;
}

interface PersonalState {
  // État
  folders: PersonalFolder[];
  currentFolder: PersonalFolderDetail | null;
  notes: PersonalNotePreview[];
  currentNote: PersonalNote | null;
  searchResults: PersonalSearchResult[];
  tree: PersonalTreeNode[];
  rootNotes: PersonalNotePreview[];
  breadcrumb: Breadcrumb[];

  // UI
  isLoading: boolean;
  isSaving: boolean;
  isSearching: boolean;
  error: string | null;
  expandedFolderIds: Set<string>;

  // Actions - Dossiers
  fetchRootFolders: () => Promise<void>;
  fetchFolder: (id: string) => Promise<void>;
  createFolder: (data: CreatePersonalFolderRequest) => Promise<PersonalFolder>;
  updateFolder: (id: string, data: UpdatePersonalFolderRequest) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Actions - Notes
  fetchNotes: (folderId?: string) => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (data: CreatePersonalNoteRequest) => Promise<PersonalNote>;
  updateNote: (id: string, data: UpdatePersonalNoteRequest) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Actions - Recherche
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Actions - Arborescence
  fetchTree: () => Promise<void>;
  toggleFolderExpanded: (folderId: string) => void;
  addFolderToTree: (folder: PersonalTreeNode, parentId: string | null) => void;
  removeFolderFromTree: (folderId: string) => void;

  // Actions - Navigation
  navigateToFolder: (folderId: string | null) => Promise<void>;
  clearCurrentNote: () => void;
  reset: () => void;
}

// ----- Types persistance -----

interface PersistedPersonalState {
  expandedFolderIds: string[];
}

// ----- Store -----

export const usePersonalStore = create<PersonalState>()(
  persist(
    (set, get) => ({
      // État initial
      folders: [],
      currentFolder: null,
      notes: [],
      currentNote: null,
      searchResults: [],
      tree: [],
      rootNotes: [],
      breadcrumb: [],
      isLoading: false,
      isSaving: false,
      isSearching: false,
      error: null,
      expandedFolderIds: new Set<string>(),

      // ===============================
      // DOSSIERS
      // ===============================

      fetchRootFolders: async () => {
        set({ isLoading: true, error: null });
        try {
          const folders = await personalApi.getRootFolders();
          set({
            folders,
            currentFolder: null,
            breadcrumb: [],
            isLoading: false,
          });
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      fetchFolder: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const detail = await personalApi.getFolder(id);

          // Construire le breadcrumb
          const breadcrumb = await buildBreadcrumb(id);

          set({
            currentFolder: detail,
            folders: detail.children.map((c) => ({
              ...c,
              path: detail.folder.path + detail.folder.slug + '/',
              createdAt: detail.folder.createdAt,
              updatedAt: detail.folder.updatedAt,
            })) as PersonalFolder[],
            notes: detail.notes,
            breadcrumb,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      createFolder: async (data: CreatePersonalFolderRequest) => {
        set({ isSaving: true, error: null });
        try {
          const folder = await personalApi.createFolder(data);

          // Refresh du dossier courant ou racine
          if (data.parentId) {
            await get().fetchFolder(data.parentId);
          } else {
            await get().fetchRootFolders();
          }

          set({ isSaving: false });
          return folder;
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      updateFolder: async (id: string, data: UpdatePersonalFolderRequest) => {
        set({ isSaving: true, error: null });
        try {
          await personalApi.updateFolder(id, data);

          const { currentFolder } = get();
          if (currentFolder) {
            await get().fetchFolder(currentFolder.folder.id);
          } else {
            await get().fetchRootFolders();
          }

          set({ isSaving: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      deleteFolder: async (id: string) => {
        set({ isSaving: true, error: null });
        try {
          await personalApi.deleteFolder(id);

          const { currentFolder } = get();
          if (currentFolder?.folder.id === id) {
            // Retour au parent
            if (currentFolder.folder.parentId) {
              await get().fetchFolder(currentFolder.folder.parentId);
            } else {
              await get().fetchRootFolders();
            }
          } else if (currentFolder) {
            await get().fetchFolder(currentFolder.folder.id);
          } else {
            await get().fetchRootFolders();
          }

          set({ isSaving: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      // ===============================
      // NOTES
      // ===============================

      fetchNotes: async (folderId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const notes = await personalApi.getNotes(folderId);
          set({ notes, isLoading: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      fetchNote: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const note = await personalApi.getNote(id);
          set({ currentNote: note, isLoading: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      createNote: async (data: CreatePersonalNoteRequest) => {
        set({ isSaving: true, error: null });
        try {
          const note = await personalApi.createNote(data);
          await get().fetchNotes(data.folderId);
          set({ isSaving: false });
          return note;
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      updateNote: async (id: string, data: UpdatePersonalNoteRequest) => {
        set({ isSaving: true, error: null });
        try {
          await personalApi.updateNote(id, data);

          const { currentNote } = get();
          if (currentNote?.id === id) {
            await get().fetchNote(id);
          }

          set({ isSaving: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      deleteNote: async (id: string) => {
        set({ isSaving: true, error: null });
        try {
          const { currentNote, currentFolder } = get();
          await personalApi.deleteNote(id);

          if (currentNote?.id === id) {
            set({ currentNote: null });
          }

          await get().fetchNotes(currentFolder?.folder.id);
          set({ isSaving: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isSaving: false,
          });
          throw error;
        }
      },

      // ===============================
      // RECHERCHE
      // ===============================

      search: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [] });
          return;
        }

        set({ isSearching: true, error: null });
        try {
          const results = await personalApi.search(query);
          set({ searchResults: results, isSearching: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            isSearching: false,
          });
        }
      },

      clearSearch: () => set({ searchResults: [] }),

      // ===============================
      // ARBORESCENCE
      // ===============================

      fetchTree: async () => {
        set({ isLoading: true, error: null });
        try {
          const treeResponse = await personalApi.getTree();
          set({
            tree: treeResponse.tree,
            rootNotes: treeResponse.rootNotes,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },

      toggleFolderExpanded: (folderId: string) => {
        const { expandedFolderIds } = get();
        const newSet = new Set(expandedFolderIds);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        set({ expandedFolderIds: newSet });
      },

      addFolderToTree: (folder: PersonalTreeNode, parentId: string | null) => {
        const { tree } = get();

        if (parentId === null) {
          // Ajouter à la racine
          set({ tree: [...tree, folder] });
        } else {
          // Ajouter dans un dossier parent
          const addToParent = (nodes: PersonalTreeNode[]): PersonalTreeNode[] => {
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
        }
      },

      removeFolderFromTree: (folderId: string) => {
        const { tree } = get();

        const removeFromNodes = (nodes: PersonalTreeNode[]): PersonalTreeNode[] => {
          return nodes
            .filter((node) => node.id !== folderId)
            .map((node) => {
              if (node.children.length > 0) {
                return { ...node, children: removeFromNodes(node.children) };
              }
              return node;
            });
        };

        set({ tree: removeFromNodes(tree) });
      },

      // ===============================
      // NAVIGATION
      // ===============================

      navigateToFolder: async (folderId: string | null) => {
        if (folderId) {
          await get().fetchFolder(folderId);
        } else {
          await get().fetchRootFolders();
        }
      },

      clearCurrentNote: () => set({ currentNote: null }),

      reset: () =>
        set({
          folders: [],
          currentFolder: null,
          notes: [],
          currentNote: null,
          searchResults: [],
          tree: [],
          rootNotes: [],
          breadcrumb: [],
          error: null,
        }),
    }),
    {
      name: 'personal-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({
          expandedFolderIds: Array.from(state.expandedFolderIds),
        }) as unknown as PersonalState,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reconvertir le tableau en Set
          const persisted = state as unknown as PersistedPersonalState;
          if (persisted.expandedFolderIds) {
            state.expandedFolderIds = new Set(persisted.expandedFolderIds);
          }
        }
      },
    }
  )
);

// ----- Helpers -----

/**
 * Construit le breadcrumb en remontant les parents
 */
async function buildBreadcrumb(folderId: string): Promise<Breadcrumb[]> {
  const breadcrumb: Breadcrumb[] = [];
  let currentId: string | null = folderId;

  // Limite pour éviter boucles infinies
  let iterations = 0;
  const maxIterations = 20;

  while (currentId && iterations < maxIterations) {
    try {
      const detail = await personalApi.getFolder(currentId);
      breadcrumb.unshift({
        id: detail.folder.id,
        name: detail.folder.name,
      });
      currentId = detail.folder.parentId ?? null;
    } catch {
      break;
    }
    iterations++;
  }

  return breadcrumb;
}
