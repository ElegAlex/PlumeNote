// ===========================================
// Store Calendar (Zustand) - P3 Calendrier
// Gestion de l'état du calendrier
// ===========================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  CalendarEvent,
  CalendarEventDetail,
  CalendarFilters,
  CalendarViewMode,
  CalendarMonth,
  CalendarEventType,
} from '@plumenote/types';
import { calendarApi } from '../services/calendarApi';
import {
  buildCalendarMonth,
  getMonthRange,
  getWeekRange,
  addMonths,
  addWeeks,
} from '../lib/calendarUtils';

// ----- Types -----

interface CalendarState {
  // Vue courante
  viewMode: CalendarViewMode;
  currentDate: Date;

  // Données
  events: CalendarEvent[];
  selectedEvent: CalendarEventDetail | null;

  // Filtres
  filters: CalendarFilters;
  availableTags: string[];

  // État
  isLoading: boolean;
  error: string | null;

  // Données calculées
  calendarMonth: CalendarMonth | null;

  // Actions - Navigation
  setViewMode: (mode: CalendarViewMode) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToDate: (date: Date) => void;

  // Actions - Données
  loadEvents: () => Promise<void>;
  loadEventDetail: (eventId: string) => Promise<void>;
  clearSelectedEvent: () => void;

  // Actions - Filtres
  setFilter: <K extends keyof CalendarFilters>(
    key: K,
    value: CalendarFilters[K]
  ) => void;
  toggleTypeFilter: (type: CalendarEventType) => void;
  toggleStatusFilter: (status: string) => void;
  toggleTagFilter: (tag: string) => void;
  clearFilters: () => void;

  // Actions - Modifications
  updateEventDate: (eventId: string, newDate: string) => Promise<void>;
  createQuickEvent: (
    title: string,
    date: string,
    type?: CalendarEventType,
    time?: string
  ) => Promise<string | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;

  // Helpers
  getFilteredEvents: () => CalendarEvent[];
}

// ----- Valeurs par défaut -----

const defaultFilters: CalendarFilters = {
  types: ['deadline', 'event', 'period-start'],
  statuses: ['todo', 'in-progress'],
  tags: [],
  folderId: null,
  search: '',
};

// ----- Store -----

export const useCalendarStore = create<CalendarState>()(
  devtools(
    (set, get) => ({
      viewMode: 'month',
      currentDate: new Date(),
      events: [],
      selectedEvent: null,
      filters: { ...defaultFilters },
      availableTags: [],
      isLoading: false,
      error: null,
      calendarMonth: null,

      // === Navigation ===

      setViewMode: (mode) => {
        set({ viewMode: mode });
        get().loadEvents();
      },

      goToToday: () => {
        set({ currentDate: new Date() });
        get().loadEvents();
      },

      goToPrevious: () => {
        const { viewMode, currentDate } = get();
        const newDate =
          viewMode === 'month'
            ? addMonths(currentDate, -1)
            : addWeeks(currentDate, -1);
        set({ currentDate: newDate });
        get().loadEvents();
      },

      goToNext: () => {
        const { viewMode, currentDate } = get();
        const newDate =
          viewMode === 'month'
            ? addMonths(currentDate, 1)
            : addWeeks(currentDate, 1);
        set({ currentDate: newDate });
        get().loadEvents();
      },

      goToDate: (date) => {
        set({ currentDate: date });
        get().loadEvents();
      },

      // === Données ===

      loadEvents: async () => {
        const { viewMode, currentDate, filters } = get();
        set({ isLoading: true, error: null });

        try {
          const range =
            viewMode === 'month'
              ? getMonthRange(currentDate)
              : getWeekRange(currentDate);

          const events = await calendarApi.getEvents({
            start: range.start,
            end: range.end,
            types:
              filters.types.length > 0 ? filters.types.join(',') : undefined,
            statuses:
              filters.statuses.length > 0
                ? filters.statuses.join(',')
                : undefined,
            tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
            folderId: filters.folderId ?? undefined,
          });

          // Extraire les tags uniques
          const allTags = new Set<string>();
          events.forEach((e) => e.tags?.forEach((t) => allTags.add(t)));

          // Construire le calendrier du mois
          const calendarMonth = buildCalendarMonth(currentDate, events);

          set({
            events,
            availableTags: Array.from(allTags).sort(),
            calendarMonth,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Échec du chargement des événements',
            isLoading: false,
          });
        }
      },

      loadEventDetail: async (eventId) => {
        try {
          const event = await calendarApi.getEventById(eventId);
          set({ selectedEvent: event });
        } catch (error) {
          console.error('Failed to load event detail:', error);
        }
      },

      clearSelectedEvent: () => {
        set({ selectedEvent: null });
      },

      // === Filtres ===

      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
        get().loadEvents();
      },

      toggleTypeFilter: (type) => {
        set((state) => {
          const types = state.filters.types.includes(type)
            ? state.filters.types.filter((t) => t !== type)
            : [...state.filters.types, type];
          return { filters: { ...state.filters, types } };
        });
        get().loadEvents();
      },

      toggleStatusFilter: (status) => {
        set((state) => {
          const statuses = state.filters.statuses.includes(status)
            ? state.filters.statuses.filter((s) => s !== status)
            : [...state.filters.statuses, status];
          return { filters: { ...state.filters, statuses } };
        });
        get().loadEvents();
      },

      toggleTagFilter: (tag) => {
        set((state) => {
          const tags = state.filters.tags.includes(tag)
            ? state.filters.tags.filter((t) => t !== tag)
            : [...state.filters.tags, tag];
          return { filters: { ...state.filters, tags } };
        });
        get().loadEvents();
      },

      clearFilters: () => {
        set({ filters: { ...defaultFilters } });
        get().loadEvents();
      },

      // === Modifications ===

      updateEventDate: async (eventId, newDate) => {
        try {
          await calendarApi.updateEventDate(eventId, newDate);
          get().loadEvents();
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Échec de la modification',
          });
        }
      },

      createQuickEvent: async (title, date, type = 'event', time) => {
        try {
          // Combiner date et heure si fournie
          const fullDate = time ? `${date}T${time}` : date;

          const result = await calendarApi.createQuickEvent({
            title,
            date: fullDate,
            type,
          });
          get().loadEvents();
          return result.note.id;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Échec de la création',
          });
          return null;
        }
      },

      deleteEvent: async (eventId) => {
        try {
          await calendarApi.deleteEvent(eventId);
          get().loadEvents();
          return true;
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Échec de la suppression',
          });
          return false;
        }
      },

      // === Helpers ===

      getFilteredEvents: () => {
        const { events, filters } = get();

        return events.filter((event) => {
          // Filtre par recherche
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            if (
              !event.title.toLowerCase().includes(searchLower) &&
              !event.noteTitle.toLowerCase().includes(searchLower)
            ) {
              return false;
            }
          }

          return true;
        });
      },
    }),
    { name: 'calendar-store' }
  )
);
