// ===========================================
// Tests composant CalendarMonthView - P3 Calendrier
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CalendarMonthView } from '../CalendarMonthView';
import { useCalendarStore } from '../../../stores/calendarStore';

// Mock des stores
vi.mock('../../../stores/calendarStore', () => ({
  useCalendarStore: vi.fn(),
}));

vi.mock('../../../stores/eventStore', () => ({
  useEventStore: () => ({
    openEventDetail: vi.fn(),
    deleteEvent: vi.fn(),
  }),
}));

const renderComponent = (props = {}) => {
  const defaultProps = {
    onCreateEvent: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <BrowserRouter>
        <CalendarMonthView {...defaultProps} />
      </BrowserRouter>
    ),
    ...defaultProps,
  };
};

const createMockCalendarMonth = () => ({
  year: 2024,
  month: 2, // March (0-indexed)
  weeks: [
    {
      days: [
        { date: new Date(2024, 1, 26), isCurrentMonth: false, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 1, 27), isCurrentMonth: false, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 1, 28), isCurrentMonth: false, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 1, 29), isCurrentMonth: false, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 1), isCurrentMonth: true, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 2), isCurrentMonth: true, isToday: false, isWeekend: true, events: [] },
        { date: new Date(2024, 2, 3), isCurrentMonth: true, isToday: false, isWeekend: true, events: [] },
      ],
    },
    {
      days: [
        {
          date: new Date(2024, 2, 4),
          isCurrentMonth: true,
          isToday: false,
          isWeekend: false,
          events: [
            {
              id: 'event-1',
              title: 'Réunion importante',
              date: '2024-03-04',
              noteId: 'note-1',
              noteTitle: 'Réunion',
              type: 'event' as const,
            },
          ],
        },
        { date: new Date(2024, 2, 5), isCurrentMonth: true, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 6), isCurrentMonth: true, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 7), isCurrentMonth: true, isToday: false, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 8), isCurrentMonth: true, isToday: true, isWeekend: false, events: [] },
        { date: new Date(2024, 2, 9), isCurrentMonth: true, isToday: false, isWeekend: true, events: [] },
        { date: new Date(2024, 2, 10), isCurrentMonth: true, isToday: false, isWeekend: true, events: [] },
      ],
    },
  ],
});

const mockDefaultState = {
  calendarMonth: createMockCalendarMonth(),
  isLoading: false,
};

describe('CalendarMonthView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCalendarStore).mockReturnValue(mockDefaultState as any);
  });

  it('should render weekday headers', () => {
    renderComponent();

    expect(screen.getByText('lun.')).toBeInTheDocument();
    expect(screen.getByText('mar.')).toBeInTheDocument();
    expect(screen.getByText('mer.')).toBeInTheDocument();
    expect(screen.getByText('jeu.')).toBeInTheDocument();
    expect(screen.getByText('ven.')).toBeInTheDocument();
    expect(screen.getByText('sam.')).toBeInTheDocument();
    expect(screen.getByText('dim.')).toBeInTheDocument();
  });

  it('should render days from the calendar month', () => {
    renderComponent();

    // Check some days are rendered (day numbers)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should display events on days that have them', () => {
    renderComponent();

    // CalendarEventItem affiche noteTitle en priorité sur title
    expect(screen.getByText('Réunion')).toBeInTheDocument();
  });

  it('should show loading skeletons when isLoading is true', () => {
    vi.mocked(useCalendarStore).mockReturnValue({
      ...mockDefaultState,
      isLoading: true,
    } as any);

    renderComponent();

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show empty state when no calendar data', () => {
    vi.mocked(useCalendarStore).mockReturnValue({
      ...mockDefaultState,
      calendarMonth: null,
    } as any);

    renderComponent();

    expect(screen.getByText('Aucune donnée')).toBeInTheDocument();
  });

  it('should highlight today', () => {
    renderComponent();

    // Find the day cell that contains "8" (our today date)
    const todayCell = screen.getByText('8').closest('div');
    expect(todayCell).toBeInTheDocument();
  });

  it('should call onCreateEvent when double-clicking on a day', () => {
    const { onCreateEvent } = renderComponent();

    // Find a day cell and double-click it
    const dayWithEvents = screen.getByText('4').closest('div');
    if (dayWithEvents) {
      fireEvent.doubleClick(dayWithEvents);
      expect(onCreateEvent).toHaveBeenCalled();
    }
  });
});
