// ===========================================
// Store Search (Zustand)
// FEAT-13: Gestion des facettes de recherche
// ===========================================

import { create } from 'zustand';
import { api } from '../lib/api';

interface FolderFacet {
  id: string;
  name: string;
  path: string;
  count: number;
}

interface TagFacet {
  id: string;
  name: string;
  color: string | null;
  count: number;
}

interface AuthorFacet {
  id: string;
  name: string;
  count: number;
}

interface DateFacet {
  month: string;
  label: string;
  count: number;
}

export interface SearchFacets {
  folders: FolderFacet[];
  tags: TagFacet[];
  authors: AuthorFacet[];
  dates: DateFacet[];
}

interface SearchState {
  facets: SearchFacets | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchFacets: () => Promise<void>;
  invalidateFacets: () => void;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useSearchStore = create<SearchState>((set, get) => ({
  facets: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchFacets: async () => {
    const { lastFetched, isLoading } = get();

    // Skip if already loading
    if (isLoading) return;

    // Skip if cache is still valid
    const now = Date.now();
    if (lastFetched && (now - lastFetched) < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.get<SearchFacets>('/search/facets');
      set({
        facets: response.data,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement des facettes';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  // FEAT-13: Invalidate cache to force refetch
  invalidateFacets: () => {
    set({ lastFetched: null });
  },
}));
