// ===========================================
// Tests Store - sidebarStore
// P0: Tests pour le lazy loading et cache
// ===========================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { api } from '../../lib/api';
import type { FolderContent, SidebarFolderNode } from '@plumenote/types';

// Mock de l'API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// On doit importer le store après le mock
let useSidebarStore: typeof import('../sidebarStore').useSidebarStore;

describe('sidebarStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset le store avant chaque test
    vi.resetModules();
    const module = await import('../sidebarStore');
    useSidebarStore = module.useSidebarStore;

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have empty tree initially', () => {
      const state = useSidebarStore.getState();

      expect(state.tree).toEqual([]);
      expect(state.expandedIds.size).toBe(0);
      expect(state.loadedFolders.size).toBe(0);
      expect(state.isLoading).toBe(false);
    });

    it('should have null selections initially', () => {
      const state = useSidebarStore.getState();

      expect(state.selectedFolderId).toBeNull();
      expect(state.selectedNoteId).toBeNull();
    });
  });

  describe('fetchTree', () => {
    it('should fetch and store tree', async () => {
      const mockTree = {
        tree: [
          {
            id: 'folder-1',
            name: 'Test Folder',
            slug: 'test-folder',
            parentId: null,
            color: null,
            icon: null,
            position: 0,
            children: [],
            notes: [],
            level: 0,
            hasAccess: true,
            accessLevel: 'ADMIN',
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockTree });

      await act(async () => {
        await useSidebarStore.getState().fetchTree();
      });

      const state = useSidebarStore.getState();
      expect(state.tree).toHaveLength(1);
      expect(state.tree[0].name).toBe('Test Folder');
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      vi.mocked(api.get).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { tree: [] } }), 100)
          )
      );

      const fetchPromise = useSidebarStore.getState().fetchTree();

      expect(useSidebarStore.getState().isLoading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await fetchPromise;
      });

      expect(useSidebarStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useSidebarStore.getState().fetchTree();
      });

      const state = useSidebarStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('toggleFolder', () => {
    it('should expand folder when collapsed', async () => {
      const mockContent: FolderContent = {
        id: 'folder-1',
        name: 'Test',
        children: [],
        notes: [],
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockContent });

      await act(async () => {
        await useSidebarStore.getState().toggleFolder('folder-1');
      });

      expect(useSidebarStore.getState().expandedIds.has('folder-1')).toBe(true);
    });

    it('should collapse folder when expanded', async () => {
      // D'abord expand
      useSidebarStore.setState({
        expandedIds: new Set(['folder-1']),
      });

      await act(async () => {
        await useSidebarStore.getState().toggleFolder('folder-1');
      });

      expect(useSidebarStore.getState().expandedIds.has('folder-1')).toBe(false);
    });
  });

  describe('loadFolderContent', () => {
    it('should fetch and cache folder content', async () => {
      const mockContent: FolderContent = {
        id: 'folder-1',
        name: 'Test Folder',
        children: [
          {
            id: 'child-1',
            name: 'Child',
            slug: 'child',
            color: null,
            icon: null,
            position: 0,
            hasChildren: false,
            notesCount: 2,
          },
        ],
        notes: [
          {
            id: 'note-1',
            title: 'Note',
            slug: 'note',
            position: 0,
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockContent });

      await act(async () => {
        await useSidebarStore.getState().loadFolderContent('folder-1');
      });

      const state = useSidebarStore.getState();
      expect(state.loadedFolders.has('folder-1')).toBe(true);

      const cache = state.loadedFolders.get('folder-1');
      expect(cache?.children).toHaveLength(1);
      expect(cache?.notes).toHaveLength(1);
    });

    it('should use cache if valid', async () => {
      // Pré-remplir le cache
      useSidebarStore.setState({
        loadedFolders: new Map([
          [
            'folder-cached',
            {
              children: [],
              notes: [],
              loadedAt: Date.now(), // Cache récent
            },
          ],
        ]),
      });

      await act(async () => {
        await useSidebarStore.getState().loadFolderContent('folder-cached');
      });

      // L'API ne doit pas être appelée car le cache est valide
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should refetch if cache is expired', async () => {
      // Cache expiré (6 minutes)
      useSidebarStore.setState({
        loadedFolders: new Map([
          [
            'folder-expired',
            {
              children: [],
              notes: [],
              loadedAt: Date.now() - 6 * 60 * 1000,
            },
          ],
        ]),
      });

      vi.mocked(api.get).mockResolvedValue({
        data: { id: 'folder-expired', name: 'Test', children: [], notes: [] },
      });

      await act(async () => {
        await useSidebarStore.getState().loadFolderContent('folder-expired');
      });

      expect(api.get).toHaveBeenCalledWith('/folders/folder-expired/content');
    });
  });

  describe('refreshFolder', () => {
    it('should invalidate cache and refetch', async () => {
      // Pré-remplir le cache
      useSidebarStore.setState({
        loadedFolders: new Map([
          [
            'folder-refresh',
            {
              children: [],
              notes: [],
              loadedAt: Date.now(),
            },
          ],
        ]),
      });

      vi.mocked(api.get).mockResolvedValue({
        data: { id: 'folder-refresh', name: 'Refreshed', children: [], notes: [] },
      });

      await act(async () => {
        await useSidebarStore.getState().refreshFolder('folder-refresh');
      });

      // L'API doit être appelée malgré le cache
      expect(api.get).toHaveBeenCalledWith('/folders/folder-refresh/content');
    });
  });

  describe('Selection', () => {
    it('should select folder and clear note selection', () => {
      useSidebarStore.setState({ selectedNoteId: 'note-1' });

      act(() => {
        useSidebarStore.getState().selectFolder('folder-1');
      });

      const state = useSidebarStore.getState();
      expect(state.selectedFolderId).toBe('folder-1');
      expect(state.selectedNoteId).toBeNull();
    });

    it('should select note', () => {
      act(() => {
        useSidebarStore.getState().selectNote('note-1');
      });

      expect(useSidebarStore.getState().selectedNoteId).toBe('note-1');
    });
  });

  describe('Getters', () => {
    it('isFolderExpanded should return correct state', () => {
      useSidebarStore.setState({
        expandedIds: new Set(['expanded-folder']),
      });

      expect(useSidebarStore.getState().isFolderExpanded('expanded-folder')).toBe(
        true
      );
      expect(useSidebarStore.getState().isFolderExpanded('collapsed-folder')).toBe(
        false
      );
    });

    it('isFolderLoaded should check cache validity', () => {
      useSidebarStore.setState({
        loadedFolders: new Map([
          [
            'loaded-folder',
            {
              children: [],
              notes: [],
              loadedAt: Date.now(),
            },
          ],
        ]),
      });

      expect(useSidebarStore.getState().isFolderLoaded('loaded-folder')).toBe(true);
      expect(useSidebarStore.getState().isFolderLoaded('not-loaded')).toBe(false);
    });

    it('getFolderContent should return cached content', () => {
      const cachedContent = {
        children: [{ id: 'child', name: 'Child' }] as SidebarFolderNode[],
        notes: [
          {
            id: 'note',
            title: 'Note',
            slug: 'note',
            position: 0,
            updatedAt: '',
            createdAt: '',
          },
        ],
        loadedAt: Date.now(),
      };

      useSidebarStore.setState({
        loadedFolders: new Map([['folder-content', cachedContent]]),
      });

      const content = useSidebarStore.getState().getFolderContent('folder-content');
      expect(content).toEqual(cachedContent);
    });
  });
});
