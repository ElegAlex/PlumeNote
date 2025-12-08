// ===========================================
// API Client Notes Personnelles
// ===========================================

import { api } from '../lib/api';
import type {
  PersonalFolder,
  PersonalFolderDetail,
  PersonalNote,
  PersonalNotePreview,
  PersonalSearchResult,
  PersonalTreeResponse,
  CreatePersonalFolderRequest,
  UpdatePersonalFolderRequest,
  CreatePersonalNoteRequest,
  UpdatePersonalNoteRequest,
} from '@plumenote/types';

/**
 * Service d'API pour les notes personnelles
 */
export const personalApi = {
  // ===============================
  // FOLDERS
  // ===============================

  /**
   * Récupère les dossiers personnels racine
   */
  async getRootFolders(): Promise<PersonalFolder[]> {
    const response = await api.get<{ folders: PersonalFolder[] }>('/personal/folders');
    return response.data.folders;
  },

  /**
   * Récupère le détail d'un dossier personnel avec son contenu
   */
  async getFolder(id: string): Promise<PersonalFolderDetail> {
    const response = await api.get<PersonalFolderDetail>(`/personal/folders/${id}`);
    return response.data;
  },

  /**
   * Crée un dossier personnel
   */
  async createFolder(data: CreatePersonalFolderRequest): Promise<PersonalFolder> {
    const response = await api.post<{ folder: PersonalFolder }>('/personal/folders', data);
    return response.data.folder;
  },

  /**
   * Met à jour un dossier personnel
   */
  async updateFolder(id: string, data: UpdatePersonalFolderRequest): Promise<PersonalFolder> {
    const response = await api.patch<{ folder: PersonalFolder }>(
      `/personal/folders/${id}`,
      data
    );
    return response.data.folder;
  },

  /**
   * Supprime un dossier personnel
   */
  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/personal/folders/${id}`);
  },

  // ===============================
  // NOTES
  // ===============================

  /**
   * Récupère les notes personnelles (filtrées par dossier optionnellement)
   */
  async getNotes(folderId?: string): Promise<PersonalNotePreview[]> {
    const query = folderId ? `?folderId=${folderId}` : '';
    const response = await api.get<{ notes: PersonalNotePreview[] }>(
      `/personal/notes${query}`
    );
    return response.data.notes;
  },

  /**
   * Récupère toutes les notes personnelles
   */
  async getAllNotes(): Promise<PersonalNotePreview[]> {
    const response = await api.get<{ notes: PersonalNotePreview[] }>('/personal/notes/all');
    return response.data.notes;
  },

  /**
   * Récupère le détail d'une note personnelle
   */
  async getNote(id: string): Promise<PersonalNote> {
    const response = await api.get<{ note: PersonalNote }>(`/personal/notes/${id}`);
    return response.data.note;
  },

  /**
   * Crée une note personnelle
   */
  async createNote(data: CreatePersonalNoteRequest): Promise<PersonalNote> {
    const response = await api.post<{ note: PersonalNote }>('/personal/notes', data);
    return response.data.note;
  },

  /**
   * Met à jour une note personnelle
   */
  async updateNote(id: string, data: UpdatePersonalNoteRequest): Promise<PersonalNote> {
    const response = await api.patch<{ note: PersonalNote }>(
      `/personal/notes/${id}`,
      data
    );
    return response.data.note;
  },

  /**
   * Supprime une note personnelle
   */
  async deleteNote(id: string): Promise<void> {
    await api.delete(`/personal/notes/${id}`);
  },

  /**
   * Déplace une note personnelle vers un autre dossier
   */
  async moveNote(noteId: string, targetFolderId: string | null): Promise<PersonalNote> {
    const response = await api.patch<{ note: PersonalNote }>(
      `/personal/notes/${noteId}`,
      { folderId: targetFolderId }
    );
    return response.data.note;
  },

  // ===============================
  // SEARCH
  // ===============================

  /**
   * Recherche dans l'espace personnel
   */
  async search(query: string, limit = 20): Promise<PersonalSearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await api.get<{ results: PersonalSearchResult[] }>(
      `/personal/search?${params.toString()}`
    );
    return response.data.results;
  },

  // ===============================
  // TREE
  // ===============================

  /**
   * Récupère l'arborescence complète de l'espace personnel
   */
  async getTree(): Promise<PersonalTreeResponse> {
    const response = await api.get<PersonalTreeResponse>('/personal/tree');
    return response.data;
  },
};
