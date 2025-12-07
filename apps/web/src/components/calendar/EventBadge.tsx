// ===========================================
// EventBadge - Indicateur discret des événements liés à une note
// Affiche un badge dans le header de la note pour montrer les événements liés
// ===========================================

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import type { AutonomousEvent } from '@plumenote/types';
import { useEventStore } from '../../stores/eventStore';
import { cn } from '../../lib/utils';

interface EventBadgeProps {
  events: AutonomousEvent[];
  className?: string;
}

const TYPE_LABELS: Record<string, string> = {
  deadline: 'Échéance',
  event: 'Événement',
  period: 'Période',
};

export function EventBadge({ events, className }: EventBadgeProps) {
  const { openEventDetail } = useEventStore();
  const [showDropdown, setShowDropdown] = useState(false);

  if (events.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Un seul événement : badge cliquable simple
  if (events.length === 1) {
    const event = events[0]!;
    return (
      <button
        onClick={() => openEventDetail(event.id)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors',
          'bg-blue-50 text-blue-700 hover:bg-blue-100',
          'dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
          className
        )}
        title={`Lié à : ${event.title}`}
      >
        <Calendar className="h-3 w-3" />
        <span className="max-w-[120px] truncate">{event.title}</span>
        <span className="text-blue-500 dark:text-blue-400">
          {formatDate(event.startDate)}
        </span>
      </button>
    );
  }

  // Plusieurs événements : dropdown
  return (
    <div className={cn('relative inline-block', className)}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors',
          'bg-blue-50 text-blue-700 hover:bg-blue-100',
          'dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900'
        )}
      >
        <Calendar className="h-3 w-3" />
        <span>{events.length} événements liés</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            showDropdown && 'rotate-180'
          )}
        />
      </button>

      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 bg-background border rounded-md shadow-lg z-10 min-w-[220px] py-1">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => {
                openEventDetail(event.id);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-muted text-sm transition-colors flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{event.title}</span>
                <span className="text-xs text-muted-foreground">
                  {TYPE_LABELS[event.type] || event.type}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDate(event.startDate)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
