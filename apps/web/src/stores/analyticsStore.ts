// ===========================================
// Store Analytics (Zustand) - P3 Dashboard
// Gestion des données du dashboard statistiques
// ===========================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  OverviewStats,
  ActivityTimeline,
  DistributionItem,
  TopNote,
  UserContribution,
} from '@plumenote/types';
import { analyticsApi } from '../services/analyticsApi';

// ----- Types -----

interface AnalyticsState {
  // Données
  overview: OverviewStats | null;
  activity: ActivityTimeline | null;
  statusDistribution: DistributionItem[];
  priorityDistribution: DistributionItem[];
  tagsDistribution: DistributionItem[];
  topNotes: TopNote[];
  userContributions: UserContribution[];

  // États de chargement
  isLoadingOverview: boolean;
  isLoadingActivity: boolean;
  isLoadingDistributions: boolean;
  isLoadingTopNotes: boolean;
  isLoadingContributions: boolean;

  // Erreurs
  error: string | null;

  // Configuration
  activityDays: 7 | 30;

  // Actions
  loadOverview: () => Promise<void>;
  loadActivity: (days?: number) => Promise<void>;
  loadDistributions: () => Promise<void>;
  loadTopNotes: () => Promise<void>;
  loadContributions: () => Promise<void>;
  loadAll: () => Promise<void>;
  setActivityDays: (days: 7 | 30) => void;
  clearError: () => void;
}

// ----- Store -----

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      // État initial
      overview: null,
      activity: null,
      statusDistribution: [],
      priorityDistribution: [],
      tagsDistribution: [],
      topNotes: [],
      userContributions: [],

      isLoadingOverview: false,
      isLoadingActivity: false,
      isLoadingDistributions: false,
      isLoadingTopNotes: false,
      isLoadingContributions: false,

      error: null,
      activityDays: 30,

      // ----- Actions -----

      loadOverview: async () => {
        set({ isLoadingOverview: true, error: null });

        try {
          const overview = await analyticsApi.getOverview();
          set({ overview, isLoadingOverview: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement des statistiques',
            isLoadingOverview: false,
          });
        }
      },

      loadActivity: async (days?: number) => {
        const daysToLoad = days ?? get().activityDays;
        set({ isLoadingActivity: true, error: null });

        try {
          const activity = await analyticsApi.getActivity(daysToLoad);
          set({ activity, isLoadingActivity: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement de l\'activité',
            isLoadingActivity: false,
          });
        }
      },

      loadDistributions: async () => {
        set({ isLoadingDistributions: true, error: null });

        try {
          const [status, priority, tags] = await Promise.all([
            analyticsApi.getDistribution('status'),
            analyticsApi.getDistribution('priority'),
            analyticsApi.getDistribution('tags'),
          ]);

          set({
            statusDistribution: status,
            priorityDistribution: priority,
            tagsDistribution: tags,
            isLoadingDistributions: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement des distributions',
            isLoadingDistributions: false,
          });
        }
      },

      loadTopNotes: async () => {
        set({ isLoadingTopNotes: true, error: null });

        try {
          const topNotes = await analyticsApi.getTopNotes(10);
          set({ topNotes, isLoadingTopNotes: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement des notes populaires',
            isLoadingTopNotes: false,
          });
        }
      },

      loadContributions: async () => {
        set({ isLoadingContributions: true, error: null });

        try {
          const userContributions = await analyticsApi.getUserContributions();
          set({ userContributions, isLoadingContributions: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement des contributions',
            isLoadingContributions: false,
          });
        }
      },

      loadAll: async () => {
        const {
          loadOverview,
          loadActivity,
          loadDistributions,
          loadTopNotes,
          loadContributions,
        } = get();

        // Chargement parallèle de toutes les données
        await Promise.all([
          loadOverview(),
          loadActivity(),
          loadDistributions(),
          loadTopNotes(),
          loadContributions(),
        ]);
      },

      setActivityDays: (days: 7 | 30) => {
        set({ activityDays: days });
        get().loadActivity(days);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'analytics-store' }
  )
);
