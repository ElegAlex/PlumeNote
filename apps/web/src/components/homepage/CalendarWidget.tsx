// ===========================================
// CalendarWidget - P1: Widget calendrier homepage
// ===========================================

import { Link } from 'react-router-dom';
import { useHomepageStore, type CalendarEvent } from '../../stores/homepage';
import { useEventStore } from '../../stores/eventStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export function CalendarWidget() {
  const { upcomingEvents } = useHomepageStore();

  // Filtrer les événements des 7 prochains jours
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const filteredEvents = upcomingEvents
    .filter((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && eventDate <= weekFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          À venir
        </CardTitle>
        <Link
          to="/calendar"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Voir tout
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </CardHeader>

      <CardContent className="pt-0">
        {filteredEvents.length === 0 ? (
          <EmptyCalendar />
        ) : (
          <ul className="space-y-2">
            {filteredEvents.map((event) => (
              <CalendarEventItem key={event.id} event={event} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarEventItem({ event }: { event: CalendarEvent }) {
  const typeConfig = getEventTypeConfig(event.type);
  const { openEventDetail } = useEventStore();

  const handleClick = () => {
    // Ouvrir le détail de l'événement autonome
    openEventDetail(event.id);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors text-left"
    >
      {/* Indicateur de type */}
      <div className={`w-1 h-10 rounded-full ${typeConfig.color}`} />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.noteTitle}</p>
        <p className="text-xs text-muted-foreground">
          {formatEventDate(event.date, event.time)}
        </p>
      </div>

      {/* Badge type */}
      <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.badge}`}>
        {typeConfig.label}
      </span>
    </button>
  );
}

function EmptyCalendar() {
  return (
    <div className="py-6 text-center text-muted-foreground">
      <svg
        className="h-10 w-10 mx-auto mb-2 opacity-30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-sm">Aucun événement à venir</p>
      <p className="text-xs mt-1">
        Ajoutez des dates dans vos notes pour les voir ici
      </p>
    </div>
  );
}

function getEventTypeConfig(type: CalendarEvent['type']) {
  switch (type) {
    case 'deadline':
      return {
        color: 'bg-destructive',
        badge: 'bg-destructive/10 text-destructive',
        label: 'Échéance',
      };
    case 'task':
      return {
        color: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        label: 'Tâche',
      };
    case 'period-start':
      return {
        color: 'bg-green-500',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: 'Début',
      };
    case 'period-end':
      return {
        color: 'bg-gray-500',
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        label: 'Fin',
      };
    case 'event':
    default:
      return {
        color: 'bg-primary',
        badge: 'bg-primary/10 text-primary',
        label: 'Événement',
      };
  }
}

function formatEventDate(dateString: string, time?: string): string {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDate = new Date(dateString);
  eventDate.setHours(0, 0, 0, 0);

  const timeStr = time ? ` à ${time}` : '';

  // Aujourd'hui
  if (eventDate.getTime() === now.getTime()) {
    return `Aujourd'hui${timeStr}`;
  }

  // Demain
  if (eventDate.getTime() === tomorrow.getTime()) {
    return `Demain${timeStr}`;
  }

  // Autre jour
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return time ? `${dateStr} à ${time}` : dateStr;
}
