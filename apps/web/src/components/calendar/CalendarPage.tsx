// ===========================================
// CalendarPage - Page principale calendrier (P3)
// Intègre les événements autonomes avec EventDetailModal
// ===========================================

import { useEffect, useState } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import { CalendarHeader } from './CalendarHeader';
import { CalendarFilters } from './CalendarFilters';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarAgendaView } from './CalendarAgendaView';
import { QuickEventModal } from './QuickEventModal';
import { EventDetailModal } from './EventDetailModal';

export function CalendarPage() {
  const { viewMode, loadEvents, error } = useCalendarStore();
  const [quickEventDate, setQuickEventDate] = useState<Date | null>(null);

  // Charger les événements au montage et quand le filtre change
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = (date: Date) => {
    setQuickEventDate(date);
  };

  const handleCloseQuickEvent = () => {
    setQuickEventDate(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête avec navigation */}
      <CalendarHeader />

      {/* Contenu principal */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar filtres */}
        <CalendarFilters />

        {/* Vue calendrier */}
        <main className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {viewMode === 'month' && (
            <CalendarMonthView onCreateEvent={handleCreateEvent} />
          )}
          {viewMode === 'week' && (
            <CalendarWeekView onCreateEvent={handleCreateEvent} />
          )}
          {viewMode === 'agenda' && <CalendarAgendaView />}
        </main>
      </div>

      {/* Modal création rapide */}
      {quickEventDate && (
        <QuickEventModal
          date={quickEventDate}
          onClose={handleCloseQuickEvent}
        />
      )}

      {/* Modal détail événement autonome */}
      <EventDetailModal />
    </div>
  );
}
