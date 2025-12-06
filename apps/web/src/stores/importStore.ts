// ===========================================
// Store Import (Zustand)
// EP-008: Gestion de l'état des imports
// ===========================================

import { create } from 'zustand';
import type {
  ImportPreview,
  ImportJobSummary,
  ImportJobDetail,
  ConflictStrategy,
} from '@collabnotes/types';
import { importApi } from '../services/importApi';

interface ImportState {
  // État
  jobs: ImportJobSummary[];
  currentJob: ImportJobDetail | null;
  preview: ImportPreview | null;
  isUploading: boolean;
  isProcessing: boolean;
  error: string | null;
  isWizardOpen: boolean;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  uploadZip: (file: File) => Promise<ImportPreview>;
  fetchJobs: () => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  startImport: (id: string, options: {
    targetFolderId?: string;
    conflictStrategy: ConflictStrategy;
  }) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  pollJobStatus: (id: string) => void;
  stopPolling: () => void;
  clearPreview: () => void;
  clearError: () => void;
  reset: () => void;
}

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const useImportStore = create<ImportState>((set, get) => ({
  // État initial
  jobs: [],
  currentJob: null,
  preview: null,
  isUploading: false,
  isProcessing: false,
  error: null,
  isWizardOpen: false,

  // Ouvrir/fermer le wizard
  openWizard: () => set({ isWizardOpen: true }),
  closeWizard: () => {
    get().stopPolling();
    set({
      isWizardOpen: false,
      preview: null,
      currentJob: null,
      error: null,
      isProcessing: false,
    });
  },

  // Upload du fichier ZIP
  uploadZip: async (file: File) => {
    set({ isUploading: true, error: null });
    try {
      const preview = await importApi.uploadZip(file);
      set({ preview, isUploading: false });
      return preview;
    } catch (error) {
      set({ error: (error as Error).message, isUploading: false });
      throw error;
    }
  },

  // Récupérer la liste des jobs
  fetchJobs: async () => {
    try {
      const jobs = await importApi.getJobs();
      set({ jobs });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Récupérer le détail d'un job
  fetchJob: async (id: string) => {
    try {
      const job = await importApi.getJob(id);
      set({ currentJob: job });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Démarrer l'import
  startImport: async (id: string, options) => {
    set({ isProcessing: true, error: null });
    try {
      const job = await importApi.startImport(id, options);
      set({ currentJob: job, preview: null });

      // Démarrer le polling
      get().pollJobStatus(id);
    } catch (error) {
      set({ error: (error as Error).message, isProcessing: false });
      throw error;
    }
  },

  // Supprimer un job
  deleteJob: async (id: string) => {
    try {
      await importApi.deleteJob(id);
      set(state => ({
        jobs: state.jobs.filter(j => j.id !== id),
        currentJob: state.currentJob?.id === id ? null : state.currentJob,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Polling du statut
  pollJobStatus: (id: string) => {
    // Arrêter le polling existant
    get().stopPolling();

    pollInterval = setInterval(async () => {
      try {
        const job = await importApi.getJob(id);
        set({ currentJob: job });

        // Arrêter le polling si terminé
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          get().stopPolling();
          set({ isProcessing: false });
          // Rafraîchir la liste des jobs
          get().fetchJobs();
        }
      } catch {
        // Ignorer les erreurs de polling
      }
    }, 1000);
  },

  // Arrêter le polling
  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  },

  // Effacer la prévisualisation
  clearPreview: () => set({ preview: null }),

  // Effacer l'erreur
  clearError: () => set({ error: null }),

  // Reset complet
  reset: () => {
    get().stopPolling();
    set({
      jobs: [],
      currentJob: null,
      preview: null,
      isUploading: false,
      isProcessing: false,
      error: null,
      isWizardOpen: false,
    });
  },
}));
