// ===========================================
// Store Notes (Zustand)
// ===========================================

import { create } from 'zustand';
import type { Note, NoteSummary, CreateNoteRequest } from '@collabnotes/types';
import { api } from '../lib/api';

interface NotesState {
  currentNote: Note | null;
  recentNotes: NoteSummary[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: Date | null;

  fetchNote: (noteId: string) => Promise<Note>;
  createNote: (data: CreateNoteRequest) => Promise<Note>;
  updateNote: (noteId: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  duplicateNote: (noteId: string) => Promise<Note>;
  fetchRecentNotes: () => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  setSaving: (isSaving: boolean) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  currentNote: null,
  recentNotes: [],
  isLoading: false,
  isSaving: false,
  error: null,
  lastSaved: null,

  fetchNote: async (noteId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get(`/notes/${noteId}`);
      const note = response.data;
      set({ currentNote: note, isLoading: false });
      return note;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Note non trouvée',
        isLoading: false,
      });
      throw err;
    }
  },

  createNote: async (data: CreateNoteRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post('/notes', data);
      const note = response.data;
      set({ currentNote: note, isLoading: false });
      return note;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Erreur de création',
        isLoading: false,
      });
      throw err;
    }
  },

  updateNote: async (noteId: string, data: Partial<Note>) => {
    set({ isSaving: true });

    try {
      const response = await api.patch(`/notes/${noteId}`, data);
      set({
        currentNote: response.data,
        isSaving: false,
        lastSaved: new Date(),
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Erreur de sauvegarde',
        isSaving: false,
      });
      throw err;
    }
  },

  deleteNote: async (noteId: string) => {
    await api.delete(`/notes/${noteId}`);
    set({ currentNote: null });
  },

  duplicateNote: async (noteId: string) => {
    const response = await api.post(`/notes/${noteId}/duplicate`);
    return response.data;
  },

  fetchRecentNotes: async () => {
    try {
      const response = await api.get('/notes/recent');
      set({ recentNotes: response.data.notes });
    } catch {
      // Ignorer les erreurs silencieusement
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note });
  },

  setSaving: (isSaving: boolean) => {
    set({ isSaving });
  },
}));
