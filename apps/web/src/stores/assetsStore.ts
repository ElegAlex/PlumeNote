// ===========================================
// Store Assets - Zustand
// Gestion des assets utilisateur (images, fichiers)
// ===========================================

import { create } from 'zustand';
import { api } from '../lib/api';

export interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface AssetsState {
  assets: Asset[];
  total: number;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  selectedAssetId: string | null;

  // Actions
  fetchAssets: (options?: { limit?: number; offset?: number; type?: string }) => Promise<void>;
  uploadAsset: (file: File) => Promise<Asset | null>;
  deleteAsset: (id: string) => Promise<boolean>;
  selectAsset: (id: string | null) => void;
  getSelectedAsset: () => Asset | null;
  clearError: () => void;
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  assets: [],
  total: 0,
  isLoading: false,
  isUploading: false,
  error: null,
  selectedAssetId: null,

  fetchAssets: async (options = {}) => {
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.offset) params.set('offset', String(options.offset));
      if (options.type) params.set('type', options.type);

      const response = await api.get<{
        assets: Asset[];
        total: number;
      }>(`/assets?${params.toString()}`);

      set({
        assets: response.data.assets,
        total: response.data.total,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de chargement des assets';
      set({ error: message, isLoading: false });
    }
  },

  uploadAsset: async (file: File) => {
    set({ isUploading: true, error: null });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/assets/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'upload');
      }

      const asset: Asset = await response.json();

      // Ajouter l'asset à la liste
      set((state) => ({
        assets: [asset, ...state.assets],
        total: state.total + 1,
        isUploading: false,
      }));

      return asset;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur d\'upload';
      set({ error: message, isUploading: false });
      return null;
    }
  },

  deleteAsset: async (id: string) => {
    try {
      await api.delete(`/assets/${id}`);

      // Retirer l'asset de la liste
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== id),
        total: state.total - 1,
        selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de suppression';
      set({ error: message });
      return false;
    }
  },

  selectAsset: (id: string | null) => {
    set({ selectedAssetId: id });
  },

  getSelectedAsset: () => {
    const { assets, selectedAssetId } = get();
    return assets.find((a) => a.id === selectedAssetId) || null;
  },

  clearError: () => {
    set({ error: null });
  },
}));
