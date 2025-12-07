// ===========================================
// Store Homepage (Zustand) - P1
// Gestion des notes épinglées, récentes et événements
// ===========================================

import { create } from 'zustand';
import { api } from '../lib/api';

// Types
export interface NoteWithMetadata {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  folderPath: string;
  folderId: string;
  isPinned: boolean;
  author?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface CalendarEvent {
  id: string;
  noteId: string;
  noteTitle: string;
  noteSlug: string;
  date: string;
  time?: string;
  type: 'event' | 'deadline' | 'task' | 'period-start' | 'period-end';
  status?: string;
}

interface HomepageState {
  // État
  pinnedNotes: NoteWithMetadata[];
  recentNotes: NoteWithMetadata[];
  upcomingEvents: CalendarEvent[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHomepageData: () => Promise<void>;
  pinNote: (noteId: string) => Promise<void>;
  unpinNote: (noteId: string) => Promise<void>;
  refreshPinnedNotes: () => Promise<void>;
  refreshRecentNotes: () => Promise<void>;
  recordNoteView: (noteId: string) => Promise<void>;
}

export const useHomepageStore = create<HomepageState>((set, get) => ({
  pinnedNotes: [],
  recentNotes: [],
  upcomingEvents: [],
  isLoading: false,
  error: null,

  loadHomepageData: async () => {
    set({ isLoading: true, error: null });

    try {
      // Charger les 3 sources en parallèle
      const [pinnedRes, recentRes, eventsRes] = await Promise.all([
        api.get<{ notes: NoteWithMetadata[] }>('/notes/pinned'),
        api.get<{ notes: NoteWithMetadata[] }>('/notes/recent?limit=10'),
        api.get<{ events: any[] }>('/events/upcoming?limit=5').catch(() => ({ data: { events: [] } })),
      ]);

      // Transformer les événements autonomes en CalendarEvent pour le widget
      const transformedEvents: CalendarEvent[] = (eventsRes.data.events || []).map((event: any) => {
        const startDate = new Date(event.startDate);
        const dateStr = startDate.toISOString().split('T')[0] || '';
        let timeStr: string | undefined;
        if (!event.allDay) {
          const hours = startDate.getUTCHours().toString().padStart(2, '0');
          const mins = startDate.getUTCMinutes().toString().padStart(2, '0');
          timeStr = `${hours}:${mins}`;
        }

        // Mapper le type
        const typeMap: Record<string, CalendarEvent['type']> = {
          deadline: 'deadline',
          event: 'event',
          period: 'period-start',
        };

        return {
          id: event.id,
          noteId: event.id, // Utiliser l'ID de l'événement
          noteTitle: event.title,
          noteSlug: event.id, // Pas de slug pour les événements autonomes
          date: dateStr,
          time: timeStr,
          type: typeMap[event.type] || 'event',
        } as CalendarEvent;
      });

      set({
        pinnedNotes: pinnedRes.data.notes || [],
        recentNotes: recentRes.data.notes || [],
        upcomingEvents: transformedEvents,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Erreur de chargement',
        isLoading: false,
      });
    }
  },

  pinNote: async (noteId: string) => {
    try {
      await api.post(`/notes/${noteId}/pin`);

      const { recentNotes, pinnedNotes } = get();

      // Trouver la note dans recentNotes
      const note = recentNotes.find(n => n.id === noteId);
      if (note) {
        const updatedNote = { ...note, isPinned: true };

        set({
          pinnedNotes: [updatedNote, ...pinnedNotes],
          recentNotes: recentNotes.map(n =>
            n.id === noteId ? updatedNote : n
          ),
        });
      } else {
        // Rafraîchir si la note n'est pas dans la liste
        await get().refreshPinnedNotes();
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Erreur lors de l\'épinglage' });
    }
  },

  unpinNote: async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}/pin`);

      const { pinnedNotes, recentNotes } = get();

      set({
        pinnedNotes: pinnedNotes.filter(n => n.id !== noteId),
        recentNotes: recentNotes.map(n =>
          n.id === noteId ? { ...n, isPinned: false } : n
        ),
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Erreur lors du désépinglage' });
    }
  },

  refreshPinnedNotes: async () => {
    try {
      const response = await api.get<{ notes: NoteWithMetadata[] }>('/notes/pinned');
      set({ pinnedNotes: response.data.notes || [] });
    } catch {
      // Ignorer silencieusement
    }
  },

  refreshRecentNotes: async () => {
    try {
      const response = await api.get<{ notes: NoteWithMetadata[] }>('/notes/recent?limit=10');
      set({ recentNotes: response.data.notes || [] });
    } catch {
      // Ignorer silencieusement
    }
  },

  recordNoteView: async (noteId: string) => {
    try {
      await api.post(`/notes/${noteId}/view`);
    } catch {
      // Ignorer silencieusement - ne pas bloquer l'UX pour les vues
    }
  },
}));
