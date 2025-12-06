// ===========================================
// API Client Import
// EP-008: Import de dossiers Markdown
// ===========================================

import type {
  ImportPreview,
  ImportJobSummary,
  ImportJobDetail,
  StartImportOptions,
} from '@collabnotes/types';

const API_BASE = '/api/v1';

/**
 * Service d'API pour les imports
 */
export const importApi = {
  /**
   * Upload un fichier ZIP pour analyse
   */
  async uploadZip(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/import/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Erreur lors de l'upload");
    }

    return response.json();
  },

  /**
   * Récupère la liste des jobs d'import de l'utilisateur
   */
  async getJobs(): Promise<ImportJobSummary[]> {
    const response = await fetch(`${API_BASE}/import/jobs`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Erreur lors de la récupération des imports');
    }

    return response.json();
  },

  /**
   * Récupère le détail d'un job d'import
   */
  async getJob(id: string): Promise<ImportJobDetail> {
    const response = await fetch(`${API_BASE}/import/jobs/${id}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Import non trouvé');
    }

    return response.json();
  },

  /**
   * Démarre le traitement d'un import
   */
  async startImport(id: string, options: StartImportOptions): Promise<ImportJobDetail> {
    const response = await fetch(`${API_BASE}/import/jobs/${id}/start`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Erreur lors du démarrage de l'import");
    }

    return response.json();
  },

  /**
   * Supprime un job d'import
   */
  async deleteJob(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/import/jobs/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Erreur lors de la suppression de l'import");
    }
  },
};
