// ===========================================
// Hook useNoteEvents - Récupère les événements liés à une note
// ===========================================

import { useState, useEffect } from 'react';
import type { AutonomousEvent } from '@plumenote/types';
import { eventsApi } from '../services/eventsApi';

interface UseNoteEventsReturn {
  events: AutonomousEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNoteEvents(noteId: string | undefined): UseNoteEventsReturn {
  const [events, setEvents] = useState<AutonomousEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!noteId) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const noteEvents = await eventsApi.getEventsForNote(noteId);
      setEvents(noteEvents);
    } catch (err) {
      console.error('Failed to fetch events for note:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [noteId]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  };
}
