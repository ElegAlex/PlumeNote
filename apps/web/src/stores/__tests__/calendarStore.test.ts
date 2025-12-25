// ===========================================
// Tests unitaires - calendarStore - P3 Calendrier
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCalendarStore } from '../calendarStore';
import { calendarApi } from '../../services/calendarApi';
import type { CalendarEvent } from '@plumenote/types';

// Mock de l'API
vi.mock('../../services/calendarApi', () => ({
  calendarApi: {
    getEvents: vi.fn(),
    getEventDetail: vi.fn(),
    updateEventDate: vi.fn(),
    createQuickEvent: vi.fn(),
  },
}));

describe('calendarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useCalendarStore.setState({
      viewMode: 'month',
      currentDate: new Date('2024-03-15'),
      events: [],
      selectedEvent: null,
      filters: {
        types: ['deadline', 'event', 'period-start'],
        statuses: ['todo', 'in-progress'],
        tags: [],
        folderId: null,
        search: '',
      },
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have month as default view mode', () => {
      expect(useCalendarStore.getState().viewMode).toBe('month');
    });

    it('should have empty events initially', () => {
      expect(useCalendarStore.getState().events).toEqual([]);
    });

    it('should have default filters', () => {
      const filters = useCalendarStore.getState().filters;
      expect(filters.types).toEqual(['deadline', 'event', 'period-start']);
      expect(filters.statuses).toEqual(['todo', 'in-progress']);
      expect(filters.tags).toEqual([]);
      expect(filters.search).toBe('');
    });
  });

  describe('setViewMode', () => {
    it('should update view mode to week', () => {
      useCalendarStore.getState().setViewMode('week');
      expect(useCalendarStore.getState().viewMode).toBe('week');
    });

    it('should update view mode to agenda', () => {
      useCalendarStore.getState().setViewMode('agenda');
      expect(useCalendarStore.getState().viewMode).toBe('agenda');
    });
  });

  describe('navigation', () => {
    it('should go to today', () => {
      const today = new Date();
      useCalendarStore.getState().goToToday();

      const currentDate = useCalendarStore.getState().currentDate;
      expect(currentDate.getFullYear()).toBe(today.getFullYear());
      expect(currentDate.getMonth()).toBe(today.getMonth());
      expect(currentDate.getDate()).toBe(today.getDate());
    });

    it('should go to next month in month view', () => {
      useCalendarStore.setState({ viewMode: 'month', currentDate: new Date('2024-03-15') });
      useCalendarStore.getState().goToNext();

      const currentDate = useCalendarStore.getState().currentDate;
      expect(currentDate.getMonth()).toBe(3); // April
    });

    it('should go to previous month in month view', () => {
      useCalendarStore.setState({ viewMode: 'month', currentDate: new Date('2024-03-15') });
      useCalendarStore.getState().goToPrevious();

      const currentDate = useCalendarStore.getState().currentDate;
      expect(currentDate.getMonth()).toBe(1); // February
    });

    it('should go to next week in week view', () => {
      useCalendarStore.setState({ viewMode: 'week', currentDate: new Date('2024-03-15') });
      useCalendarStore.getState().goToNext();

      const currentDate = useCalendarStore.getState().currentDate;
      expect(currentDate.getDate()).toBe(22); // 15 + 7
    });

    it('should go to specific date', () => {
      const targetDate = new Date('2024-06-20');
      useCalendarStore.getState().goToDate(targetDate);

      const currentDate = useCalendarStore.getState().currentDate;
      expect(currentDate.getFullYear()).toBe(2024);
      expect(currentDate.getMonth()).toBe(5); // June
      expect(currentDate.getDate()).toBe(20);
    });
  });

  describe('loadEvents', () => {
    it('should set isLoading to true while loading', async () => {
      vi.mocked(calendarApi.getEvents).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const promise = useCalendarStore.getState().loadEvents();
      expect(useCalendarStore.getState().isLoading).toBe(true);

      await promise;
      expect(useCalendarStore.getState().isLoading).toBe(false);
    });

    it('should update events on success', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event',
          date: '2024-03-15',
          noteId: 'note-1',
          noteTitle: 'Note Test',
          type: 'event' as const,
        },
      ];

      vi.mocked(calendarApi.getEvents).mockResolvedValue(mockEvents);

      await useCalendarStore.getState().loadEvents();

      expect(useCalendarStore.getState().events).toEqual(mockEvents);
    });

    it('should set error on failure', async () => {
      vi.mocked(calendarApi.getEvents).mockRejectedValue(new Error('API Error'));

      await useCalendarStore.getState().loadEvents();

      expect(useCalendarStore.getState().error).toBe('API Error');
    });
  });

  describe('filters', () => {
    it('should update search filter', () => {
      useCalendarStore.getState().setFilter('search', 'test query');
      expect(useCalendarStore.getState().filters.search).toBe('test query');
    });

    it('should toggle type filter - remove type', () => {
      useCalendarStore.getState().toggleTypeFilter('deadline');

      const types = useCalendarStore.getState().filters.types;
      expect(types).not.toContain('deadline');
      expect(types).toContain('event');
    });

    it('should toggle type filter - add type', () => {
      useCalendarStore.setState({
        filters: {
          ...useCalendarStore.getState().filters,
          types: ['event'],
        },
      });

      useCalendarStore.getState().toggleTypeFilter('deadline');

      const types = useCalendarStore.getState().filters.types;
      expect(types).toContain('deadline');
      expect(types).toContain('event');
    });

    it('should toggle status filter', () => {
      useCalendarStore.getState().toggleStatusFilter('done');

      const statuses = useCalendarStore.getState().filters.statuses;
      expect(statuses).toContain('done');
    });

    it('should toggle tag filter', () => {
      useCalendarStore.getState().toggleTagFilter('work');

      const tags = useCalendarStore.getState().filters.tags;
      expect(tags).toContain('work');
    });

    it('should clear all filters', () => {
      // Set some filters
      useCalendarStore.setState({
        filters: {
          types: ['deadline'],
          statuses: ['done'],
          tags: ['work'],
          folderId: 'folder-1',
          search: 'test',
        },
      });

      useCalendarStore.getState().clearFilters();

      const filters = useCalendarStore.getState().filters;
      expect(filters.types).toEqual(['deadline', 'event', 'period-start']);
      expect(filters.statuses).toEqual(['todo', 'in-progress']);
      expect(filters.tags).toEqual([]);
      expect(filters.folderId).toBeNull();
      expect(filters.search).toBe('');
    });
  });

  describe('createQuickEvent', () => {
    it('should call API and reload events on success', async () => {
      const mockCreatedEvent = {
        id: 'new-event',
        title: 'New Event',
        date: '2024-03-15',
        noteId: 'note-new',
        noteTitle: 'New Note',
        type: 'event' as const,
      };

      vi.mocked(calendarApi.createQuickEvent).mockResolvedValue({
        note: { id: 'note-new', title: 'New Note' },
        event: mockCreatedEvent,
      });
      vi.mocked(calendarApi.getEvents).mockResolvedValue([mockCreatedEvent]);

      await useCalendarStore.getState().createQuickEvent('New Event', '2024-03-15', 'event');

      expect(calendarApi.createQuickEvent).toHaveBeenCalledWith({
        title: 'New Event',
        date: '2024-03-15',
        type: 'event',
      });
      expect(calendarApi.getEvents).toHaveBeenCalled(); // Events reloaded
    });

    it('should pass time when provided', async () => {
      vi.mocked(calendarApi.createQuickEvent).mockResolvedValue({} as any);
      vi.mocked(calendarApi.getEvents).mockResolvedValue([]);

      await useCalendarStore.getState().createQuickEvent('Event', '2024-03-15', 'event', '14:30');

      expect(calendarApi.createQuickEvent).toHaveBeenCalledWith({
        title: 'Event',
        date: '2024-03-15T14:30',
        type: 'event',
      });
    });
  });

  describe('updateEventDate', () => {
    it('should update event date via API', async () => {
      vi.mocked(calendarApi.updateEventDate).mockResolvedValue({} as CalendarEvent);
      vi.mocked(calendarApi.getEvents).mockResolvedValue([]);

      await useCalendarStore.getState().updateEventDate('event-1', '2024-03-20');

      expect(calendarApi.updateEventDate).toHaveBeenCalledWith('event-1', '2024-03-20');
    });
  });

  describe('calendarMonth computed', () => {
    it('should build calendar month with events', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event',
          date: '2024-03-15',
          noteId: 'note-1',
          noteTitle: 'Note Test',
          type: 'event' as const,
        },
      ];

      useCalendarStore.setState({
        currentDate: new Date('2024-03-15'),
        events: mockEvents,
      });

      const calendarMonth = useCalendarStore.getState().calendarMonth;

      expect(calendarMonth).not.toBeNull();
      expect(calendarMonth?.year).toBe(2024);
      expect(calendarMonth?.month).toBe(2); // March (0-indexed)
      expect(calendarMonth?.weeks.length).toBeGreaterThan(0);
    });
  });
});
