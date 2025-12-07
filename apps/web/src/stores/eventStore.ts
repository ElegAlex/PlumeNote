// ===========================================
// Store Events autonomes (Zustand)
// Gestion de l'état des événements autonomes
// ===========================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AutonomousEvent,
  CreateAutonomousEventPayload,
  UpdateAutonomousEventPayload,
} from '@plumenote/types';
import { eventsApi } from '../services/eventsApi';

// ----- Types -----

interface EventState {
  // Événement sélectionné (pour le modal de détail)
  selectedEvent: AutonomousEvent | null;
  isEventDetailOpen: boolean;

  // État
  isLoading: boolean;
  error: string | null;

  // Actions - Modal
  openEventDetail: (eventId: string) => Promise<void>;
  closeEventDetail: () => void;

  // Actions - CRUD
  createEvent: (data: CreateAutonomousEventPayload) => Promise<AutonomousEvent | null>;
  updateEvent: (eventId: string, data: UpdateAutonomousEventPayload) => Promise<AutonomousEvent | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;

  // Actions - Liaison avec notes
  linkNote: (eventId: string, noteId: string) => Promise<boolean>;
  unlinkNote: (eventId: string, noteId: string) => Promise<boolean>;

  // Actions - État
  clearError: () => void;
  setSelectedEvent: (event: AutonomousEvent | null) => void;
}

// ----- Store -----

export const useEventStore = create<EventState>()(
  devtools(
    (set, get) => ({
      selectedEvent: null,
      isEventDetailOpen: false,
      isLoading: false,
      error: null,

      // === Modal ===

      openEventDetail: async (eventId: string) => {
        set({ isLoading: true, error: null });
        try {
          const event = await eventsApi.getById(eventId);
          set({
            selectedEvent: event,
            isEventDetailOpen: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec du chargement de l\'événement',
            isLoading: false,
          });
        }
      },

      closeEventDetail: () => {
        set({ isEventDetailOpen: false, selectedEvent: null });
      },

      // === CRUD ===

      createEvent: async (data: CreateAutonomousEventPayload) => {
        set({ isLoading: true, error: null });
        try {
          const event = await eventsApi.create(data);
          set({ isLoading: false });
          return event;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec de la création de l\'événement',
            isLoading: false,
          });
          return null;
        }
      },

      updateEvent: async (eventId: string, data: UpdateAutonomousEventPayload) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await eventsApi.update(eventId, data);
          // Mettre à jour l'événement sélectionné si c'est le même
          const { selectedEvent } = get();
          if (selectedEvent && selectedEvent.id === eventId) {
            set({ selectedEvent: updated });
          }
          set({ isLoading: false });
          return updated;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec de la modification de l\'événement',
            isLoading: false,
          });
          return null;
        }
      },

      deleteEvent: async (eventId: string) => {
        try {
          await eventsApi.delete(eventId);
          // Fermer le modal si l'événement supprimé était affiché
          const { selectedEvent } = get();
          if (selectedEvent && selectedEvent.id === eventId) {
            set({ isEventDetailOpen: false, selectedEvent: null });
          }
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec de la suppression de l\'événement',
          });
          return false;
        }
      },

      // === Liaison avec notes ===

      linkNote: async (eventId: string, noteId: string) => {
        try {
          await eventsApi.linkNote(eventId, noteId);
          // Recharger l'événement pour avoir la liste mise à jour
          const event = await eventsApi.getById(eventId);
          set({ selectedEvent: event });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec de la liaison de la note',
          });
          return false;
        }
      },

      unlinkNote: async (eventId: string, noteId: string) => {
        try {
          await eventsApi.unlinkNote(eventId, noteId);
          // Mettre à jour localement la liste des notes liées
          set((state) => {
            if (!state.selectedEvent) return state;
            return {
              selectedEvent: {
                ...state.selectedEvent,
                linkedNotes: state.selectedEvent.linkedNotes?.filter(
                  (ln) => ln.noteId !== noteId
                ),
              },
            };
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Échec de la suppression de la liaison',
          });
          return false;
        }
      },

      // === État ===

      clearError: () => set({ error: null }),

      setSelectedEvent: (event: AutonomousEvent | null) => set({ selectedEvent: event }),
    }),
    { name: 'event-store' }
  )
);
