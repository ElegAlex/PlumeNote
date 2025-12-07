// ===========================================
// CalendarEventItem - Item d'événement (P3 Calendrier)
// Supporte les événements autonomes (ouvre EventDetailModal)
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Calendar, Play, CalendarRange, Trash2, X } from 'lucide-react';
import type { CalendarEvent, CalendarEventType, AutonomousEvent } from '@plumenote/types';
import { cn } from '../../lib/utils';
import { useCalendarStore } from '../../stores/calendarStore';
import { useEventStore } from '../../stores/eventStore';

interface CalendarEventItemProps {
  event: CalendarEvent;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  showDelete?: boolean;
  // Si l'event est un événement autonome (pas lié à une note via frontmatter)
  isAutonomous?: boolean;
  autonomousEvent?: AutonomousEvent;
}

const EVENT_CONFIG: Record<
  CalendarEventType,
  { icon: React.ElementType; color: string; label: string }
> = {
  deadline: {
    icon: Target,
    color: 'bg-red-100 text-red-700 border-red-200',
    label: 'Échéance',
  },
  event: {
    icon: Calendar,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Événement',
  },
  task: {
    icon: Target,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: 'Tâche',
  },
  'period-start': {
    icon: Play,
    color: 'bg-green-100 text-green-700 border-green-200',
    label: 'Début',
  },
  'period-end': {
    icon: Play,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Fin',
  },
};

export function CalendarEventItem({
  event,
  variant = 'compact',
  onClick,
  showDelete = true,
  isAutonomous = false,
  autonomousEvent,
}: CalendarEventItemProps) {
  const navigate = useNavigate();
  const { deleteEvent: deleteCalendarEvent } = useCalendarStore();
  const { openEventDetail, deleteEvent: deleteAutonomousEvent } = useEventStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.event;
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (isAutonomous && autonomousEvent) {
      // Événement autonome : ouvrir le modal de détail
      openEventDetail(autonomousEvent.id);
    } else {
      // Événement basé sur note (legacy) : naviguer vers la note
      navigate(`/notes/${event.noteId}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    if (isAutonomous && autonomousEvent) {
      await deleteAutonomousEvent(autonomousEvent.id);
    } else {
      await deleteCalendarEvent(event.id);
    }
    setIsDeleting(false);
    setConfirmDelete(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  // Utiliser noteTitle comme titre d'affichage
  const displayTitle = event.noteTitle || event.title || 'Sans titre';

  if (variant === 'compact') {
    return (
      <div className="group relative flex items-center gap-1">
        <button
          onClick={handleClick}
          className={cn(
            'flex-1 text-left text-sm px-2 py-1 rounded border font-medium',
            'hover:opacity-90 transition-opacity cursor-pointer',
            'overflow-hidden text-ellipsis whitespace-nowrap',
            config.color
          )}
          title={`${displayTitle}${event.time ? ` - ${event.time}` : ''}`}
        >
          {event.time && <span className="font-semibold mr-1">{event.time}</span>}
          <span className="truncate">{displayTitle}</span>
        </button>
        {showDelete && (
          <button
            onClick={handleDelete}
            className={cn(
              'flex-shrink-0 p-1 rounded bg-red-500 text-white',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-red-600',
              confirmDelete && 'opacity-100 bg-red-600'
            )}
            title={confirmDelete ? 'Cliquer pour confirmer' : 'Supprimer'}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {confirmDelete && (
          <button
            onClick={handleCancelDelete}
            className="flex-shrink-0 p-1 rounded bg-gray-500 text-white hover:bg-gray-600"
            title="Annuler"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className={cn(
          'w-full text-left p-3 rounded-lg border',
          'hover:shadow-sm transition-shadow cursor-pointer',
          config.color
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-base">{displayTitle}</p>
            <div className="flex items-center gap-2 text-sm opacity-75 mt-0.5">
              {event.time && <span>{event.time}</span>}
              {event.folderName && <span>· {event.folderName}</span>}
            </div>
            {event.status && (
              <span className="inline-block mt-1.5 px-2 py-0.5 text-xs bg-white/50 rounded font-medium">
                {event.status}
              </span>
            )}
          </div>
        </div>
      </button>
      {showDelete && (
        <button
          onClick={handleDelete}
          className={cn(
            'absolute right-1 top-1 p-1 rounded bg-red-500 text-white',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'hover:bg-red-600',
            confirmDelete && 'opacity-100 bg-red-600'
          )}
          title={confirmDelete ? 'Confirmer' : 'Supprimer'}
          disabled={isDeleting}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      {confirmDelete && (
        <button
          onClick={handleCancelDelete}
          className="absolute right-1 top-8 p-1 rounded bg-gray-500 text-white hover:bg-gray-600"
          title="Annuler"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
