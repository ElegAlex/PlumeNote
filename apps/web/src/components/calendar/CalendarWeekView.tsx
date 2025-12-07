// ===========================================
// CalendarWeekView - Vue hebdomadaire (P3 Calendrier)
// Supporte les événements autonomes
// ===========================================

import { useMemo } from 'react';
import type { CalendarEvent, AutonomousEvent } from '@plumenote/types';
import { useCalendarStore } from '../../stores/calendarStore';
import { CalendarEventItem } from './CalendarEventItem';
import {
  getWeekRange,
  addDays,
  formatDateKey,
  getHoursOfDay,
  isToday,
} from '../../lib/calendarUtils';
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

interface CalendarWeekViewProps {
  onCreateEvent?: (date: Date) => void;
}

export function CalendarWeekView({ onCreateEvent }: CalendarWeekViewProps) {
  const { currentDate, events, isLoading } = useCalendarStore();
  const hours = getHoursOfDay();

  // Construire les jours de la semaine
  const weekDays = useMemo(() => {
    const { start } = getWeekRange(currentDate);
    const startDate = new Date(start);
    const days: { date: Date; dateStr: string; label: string }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      days.push({
        date,
        dateStr: formatDateKey(date),
        label: date.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
        }),
      });
    }

    return days;
  }, [currentDate]);

  // Grouper les événements par jour
  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }
    return map;
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="grid grid-cols-8 border-l border-t min-w-[800px]">
          <div className="border-b border-r" />
          {weekDays.map((day) => (
            <Skeleton key={day.dateStr} className="h-8 border-b border-r" />
          ))}
          {[...Array(12)].map((_, i) => (
            <>
              <Skeleton key={`h-${i}`} className="h-16 border-b border-r" />
              {weekDays.map((day) => (
                <Skeleton
                  key={`${day.dateStr}-${i}`}
                  className="h-16 border-b border-r"
                />
              ))}
            </>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[800px]">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-8 border-l border-t sticky top-0 bg-background z-10">
          <div className="py-2 border-b border-r w-16" />
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                'py-2 text-center text-sm font-medium border-b border-r',
                isToday(day.date)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {day.label}
            </div>
          ))}
        </div>

        {/* Événements de la journée (all-day) */}
        <div className="grid grid-cols-8 border-l">
          <div className="py-1 px-2 text-xs text-muted-foreground border-b border-r w-16">
            Journée
          </div>
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day.dateStr) ?? [];
            const allDayEvents = dayEvents.filter((e) => !e.time);

            return (
              <div
                key={day.dateStr}
                className="min-h-12 p-1 border-b border-r space-y-1"
              >
                {allDayEvents.map((event) => (
                  <CalendarEventItem
                    key={event.id}
                    event={event}
                    variant="compact"
                    isAutonomous={true}
                    autonomousEvent={toAutonomousEvent(event)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Grille horaire */}
        <div className="grid grid-cols-8 border-l">
          {hours.slice(8, 20).map((hour) => (
            <>
              <div
                key={`hour-${hour}`}
                className="py-1 px-2 text-xs text-muted-foreground border-b border-r text-right w-16"
              >
                {hour}
              </div>
              {weekDays.map((day) => {
                const dayEvents = eventsByDay.get(day.dateStr) ?? [];
                const hourEvents = dayEvents.filter(
                  (e) => e.time && e.time.startsWith(hour.split(':')[0])
                );

                return (
                  <div
                    key={`${day.dateStr}-${hour}`}
                    className={cn(
                      'min-h-12 p-0.5 border-b border-r',
                      'hover:bg-muted/30 transition-colors'
                    )}
                    onDoubleClick={() => {
                      if (onCreateEvent) {
                        const eventDate = new Date(day.date);
                        eventDate.setHours(parseInt(hour.split(':')[0]), 0, 0);
                        onCreateEvent(eventDate);
                      }
                    }}
                  >
                    {hourEvents.map((event) => (
                      <CalendarEventItem
                        key={event.id}
                        event={event}
                        variant="compact"
                        isAutonomous={true}
                        autonomousEvent={toAutonomousEvent(event)}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
