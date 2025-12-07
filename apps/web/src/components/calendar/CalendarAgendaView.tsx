// ===========================================
// CalendarAgendaView - Vue agenda (P3 Calendrier)
// Supporte les événements autonomes
// ===========================================

import { useMemo } from 'react';
import type { CalendarEvent, AutonomousEvent } from '@plumenote/types';
import { useCalendarStore } from '../../stores/calendarStore';
import { CalendarEventItem } from './CalendarEventItem';
import { formatRelativeDate, isPast } from '../../lib/calendarUtils';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

/**
 * Convertit un CalendarEvent en AutonomousEvent pour le modal de détail
 */
function toAutonomousEvent(event: CalendarEvent): AutonomousEvent {
  return {
    id: event.id.replace('-end', ''),
    title: event.title,
    type: event.type === 'period-start' || event.type === 'period-end' ? 'period' : event.type === 'deadline' ? 'deadline' : 'event',
    startDate: `${event.date}T00:00:00.000Z`,
    endDate: event.endDate ? `${event.endDate}T23:59:59.000Z` : null,
    color: event.color || null,
    allDay: !event.time,
    createdById: '',
    createdAt: '',
    updatedAt: '',
  };
}

export function CalendarAgendaView() {
  const { events, isLoading } = useCalendarStore();

  // Grouper les événements par date
  const eventsByDate = useMemo(() => {
    const groups: { date: string; events: typeof events }[] = [];
    const dateMap = new Map<string, typeof events>();

    // Trier par date puis par heure
    const sortedEvents = [...events].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time ?? '').localeCompare(b.time ?? '');
    });

    for (const event of sortedEvents) {
      const existing = dateMap.get(event.date) ?? [];
      existing.push(event);
      dateMap.set(event.date, existing);
    }

    // Convertir en array trié
    for (const [date, evts] of dateMap) {
      groups.push({ date, events: evts });
    }

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (eventsByDate.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Aucun événement</p>
          <p className="text-sm">dans cette période</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {eventsByDate.map(({ date, events: dayEvents }) => (
          <div key={date}>
            {/* En-tête de la date */}
            <div
              className={cn(
                'sticky top-0 bg-background py-2 z-10',
                'flex items-center gap-2'
              )}
            >
              <span
                className={cn(
                  'text-sm font-semibold',
                  isPast(date) ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {formatRelativeDate(date)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
            </div>

            {/* Événements de la journée */}
            <div className="space-y-2 ml-2 border-l-2 border-muted pl-4">
              {dayEvents.map((event) => (
                <CalendarEventItem
                  key={event.id}
                  event={event}
                  variant="full"
                  isAutonomous={true}
                  autonomousEvent={toAutonomousEvent(event)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
