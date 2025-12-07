// ===========================================
// API Client Analytics (P3 Dashboard)
// ===========================================

import { api } from '../lib/api';
import type {
  OverviewStats,
  ActivityTimeline,
  DistributionItem,
  TopNote,
  UserContribution,
  DistributionField,
} from '@plumenote/types';

/**
 * Service d'API pour les analytics du dashboard
 */
export const analyticsApi = {
  /**
   * Récupère les statistiques globales
   */
  async getOverview(): Promise<OverviewStats> {
    const response = await api.get<OverviewStats>('/analytics/overview');
    return response.data;
  },

  /**
   * Récupère l'activité temporelle (créations/modifications)
   */
  async getActivity(days: number = 30): Promise<ActivityTimeline> {
    const response = await api.get<ActivityTimeline>(
      `/analytics/activity?days=${days}`
    );
    return response.data;
  },

  /**
   * Récupère la distribution par champ de métadonnée
   */
  async getDistribution(field: DistributionField): Promise<DistributionItem[]> {
    const response = await api.get<DistributionItem[]>(
      `/analytics/distribution?field=${field}`
    );
    return response.data;
  },

  /**
   * Récupère les notes les plus consultées
   */
  async getTopNotes(limit: number = 10): Promise<TopNote[]> {
    const response = await api.get<TopNote[]>(
      `/analytics/top-notes?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Récupère les contributions par utilisateur
   */
  async getUserContributions(): Promise<UserContribution[]> {
    const response = await api.get<UserContribution[]>(
      '/analytics/user-contributions'
    );
    return response.data;
  },
};
