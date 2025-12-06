// ===========================================
// Store Folders (Zustand)
// US-002: Persistance de l'état d'expansion des dossiers
// ===========================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FolderTreeNode } from '@collabnotes/types';
import { api } from '../lib/api';

interface FoldersState {
  tree: FolderTreeNode[];
  expandedFolders: Set<string>;
  selectedFolderId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchTree: () => Promise<void>;
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  selectFolder: (folderId: string | null) => void;
  createFolder: (name: string, parentId: string | null) => Promise<FolderTreeNode>;
  updateFolder: (folderId: string, data: { name?: string; color?: string }) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  // US-007: Drag & Drop
  moveFolder: (folderId: string, newParentId: string | null) => Promise<void>;
  moveNote: (noteId: string, newFolderId: string) => Promise<void>;
}

// Type pour l'état persisté (Set converti en Array pour sérialisation)
interface PersistedFoldersState {
  expandedFolders: string[];
  selectedFolderId: string | null;
}

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set, get) => ({
      tree: [],
      expandedFolders: new Set(['root']),
      selectedFolderId: null,
      isLoading: false,
      error: null,

      fetchTree: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.get('/folders/tree');
          set({ tree: response.data.tree, isLoading: false });
        } catch (err: any) {
          set({
            error: err.response?.data?.message || 'Erreur de chargement',
            isLoading: false,
          });
        }
      },

      toggleFolder: (folderId: string) => {
        const { expandedFolders } = get();
        const newExpanded = new Set(expandedFolders);

        if (newExpanded.has(folderId)) {
          newExpanded.delete(folderId);
        } else {
          newExpanded.add(folderId);
        }

        set({ expandedFolders: newExpanded });
      },

      expandFolder: (folderId: string) => {
        const { expandedFolders } = get();
        const newExpanded = new Set(expandedFolders);
        newExpanded.add(folderId);
        set({ expandedFolders: newExpanded });
      },

      collapseFolder: (folderId: string) => {
        const { expandedFolders } = get();
        const newExpanded = new Set(expandedFolders);
        newExpanded.delete(folderId);
        set({ expandedFolders: newExpanded });
      },

      selectFolder: (folderId: string | null) => {
        set({ selectedFolderId: folderId });
      },

      createFolder: async (name: string, parentId: string | null) => {
        const response = await api.post('/folders', { name, parentId });
        await get().fetchTree();
        return response.data;
      },

      updateFolder: async (folderId: string, data: { name?: string; color?: string }) => {
        await api.patch(`/folders/${folderId}`, data);
        await get().fetchTree();
      },

      deleteFolder: async (folderId: string) => {
        await api.delete(`/folders/${folderId}`);
        await get().fetchTree();
      },

      // US-007: Déplacer un dossier vers un nouveau parent
      moveFolder: async (folderId: string, newParentId: string | null) => {
        await api.post(`/folders/${folderId}/move`, { parentId: newParentId });
        await get().fetchTree();
      },

      // US-007: Déplacer une note vers un autre dossier (utilise l'endpoint dédié)
      moveNote: async (noteId: string, newFolderId: string) => {
        await api.patch(`/notes/${noteId}/move`, { targetFolderId: newFolderId || null });
        await get().fetchTree();
      },
    }),
    {
      name: 'collabnotes-folders',
      storage: createJSONStorage(() => localStorage),

      // Ne persister que l'état d'expansion et la sélection
      partialize: (state): PersistedFoldersState => ({
        expandedFolders: Array.from(state.expandedFolders),
        selectedFolderId: state.selectedFolderId,
      }),

      // Reconstruire le Set depuis l'Array lors de la réhydratation
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedFoldersState | undefined;

        if (!persisted) {
          return currentState;
        }

        return {
          ...currentState,
          expandedFolders: new Set(persisted.expandedFolders || ['root']),
          selectedFolderId: persisted.selectedFolderId ?? null,
        };
      },

      // Version du store pour gérer les migrations futures
      version: 1,
    }
  )
);
