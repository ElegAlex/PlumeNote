// ===========================================
// CalendarDayCell - Cellule jour du calendrier (P3)
// Supporte les événements autonomes
// ===========================================

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CalendarDay, AutonomousEvent } from '@plumenote/types';
import { CalendarEventItem } from './CalendarEventItem';
import { cn } from '../../lib/utils';

/**
 * Convertit un CalendarEvent en AutonomousEvent pour le modal de détail
 */
function toAutonomousEvent(event: CalendarDay['events'][0]): AutonomousEvent {
  return {
    id: event.id.replace('-end', ''), // Retirer le suffixe -end pour les period-end
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

interface CalendarDayCellProps {
  day: CalendarDay;
  onCreateEvent?: (date: Date) => void;
}

const MAX_VISIBLE_EVENTS = 3;

export function CalendarDayCell({ day, onCreateEvent }: CalendarDayCellProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleEvents = showAll
    ? day.events
    : day.events.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = day.events.length - MAX_VISIBLE_EVENTS;

  const handleDoubleClick = () => {
    if (onCreateEvent) {
      onCreateEvent(day.date);
    }
  };

  return (
    <div
      className={cn(
        'min-h-32 p-1.5 border-b border-r',
        'hover:bg-muted/30 transition-colors group',
        !day.isCurrentMonth && 'bg-muted/10',
        day.isWeekend && 'bg-muted/5',
        day.isToday && 'bg-primary/5'
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* En-tête du jour */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
            !day.isCurrentMonth && 'text-muted-foreground',
            day.isToday && 'bg-primary text-primary-foreground'
          )}
        >
          {day.date.getDate()}
        </span>

        {/* Bouton création */}
        {onCreateEvent && (
          <button
            onClick={() => onCreateEvent(day.date)}
            className={cn(
              'p-1 rounded opacity-0 group-hover:opacity-100',
              'hover:bg-muted transition-opacity'
            )}
            title="Créer un événement"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Événements */}
      <div className="space-y-1">
        {visibleEvents.map((event) => (
          <CalendarEventItem
            key={event.id}
            event={event}
            variant="compact"
            isAutonomous={true}
            autonomousEvent={toAutonomousEvent(event)}
          />
        ))}

        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-0.5"
          >
            +{hiddenCount} de plus
          </button>
        )}

        {showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-0.5"
          >
            Réduire
          </button>
        )}
      </div>
    </div>
  );
}
