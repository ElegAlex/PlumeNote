// ===========================================
// API Client Calendar (P3 Calendrier)
// Intégré avec les événements autonomes
// ===========================================

import { api } from '../lib/api';
import type {
  CalendarEvent,
  CalendarEventDetail,
  CreateQuickEventData,
  CalendarEventType,
  AutonomousEvent,
} from '@plumenote/types';

interface GetEventsParams {
  start: string;
  end: string;
  types?: string;
  statuses?: string;
  tags?: string;
  folderId?: string;
}

/**
 * Transforme un événement autonome en CalendarEvent pour l'affichage
 */
function autonomousToCalendarEvent(event: AutonomousEvent): CalendarEvent {
  const startDate = new Date(event.startDate);
  const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Extraire l'heure si ce n'est pas un événement toute la journée
  let timeStr: string | undefined;
  if (!event.allDay) {
    const hours = startDate.getUTCHours().toString().padStart(2, '0');
    const mins = startDate.getUTCMinutes().toString().padStart(2, '0');
    timeStr = `${hours}:${mins}`;
  }

  // Mapper le type autonome vers CalendarEventType
  const typeMap: Record<string, CalendarEventType> = {
    deadline: 'deadline',
    event: 'event',
    period: 'period-start',
    DEADLINE: 'deadline',
    EVENT: 'event',
    PERIOD: 'period-start',
  };

  return {
    id: event.id,
    title: event.title,
    date: dateStr,
    time: timeStr,
    endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : undefined,
    noteId: event.id, // Utilise l'event ID comme référence
    noteTitle: event.title,
    type: typeMap[event.type] || 'event',
    color: event.color || undefined,
    // Marquer comme événement autonome via des propriétés additionnelles
  };
}

/**
 * Service d'API pour le calendrier
 */
export const calendarApi = {
  /**
   * Récupère les événements dans une plage de dates
   * Utilise maintenant l'API des événements autonomes
   */
  async getEvents(params: GetEventsParams): Promise<CalendarEvent[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('from', params.start);
    queryParams.set('to', params.end);

    // Mapper les types calendrier vers les types autonomes
    if (params.types) {
      const typeMapping: Record<string, string> = {
        'deadline': 'DEADLINE',
        'event': 'EVENT',
        'period-start': 'PERIOD',
        'period-end': 'PERIOD',
        'task': 'EVENT',
      };
      const types = params.types.split(',');
      const autonomousTypes = [...new Set(types.map(t => typeMapping[t] || t.toUpperCase()))];
      queryParams.set('type', autonomousTypes.join(','));
    }

    try {
      // Récupérer les événements autonomes
      const response = await api.get<{ events: AutonomousEvent[] }>(
        `/events?${queryParams.toString()}`
      );

      // Transformer en CalendarEvent
      const events = response.data.events.map(autonomousToCalendarEvent);

      // Pour les périodes, ajouter un événement de fin
      const eventsWithPeriodEnds: CalendarEvent[] = [];
      for (const event of events) {
        eventsWithPeriodEnds.push(event);

        // Si c'est une période avec date de fin différente, ajouter un event period-end
        if (event.type === 'period-start' && event.endDate && event.endDate !== event.date) {
          eventsWithPeriodEnds.push({
            ...event,
            id: `${event.id}-end`,
            date: event.endDate,
            type: 'period-end',
          });
        }
      }

      return eventsWithPeriodEnds;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  },

  /**
   * Récupère le détail d'un événement
   */
  async getEventById(eventId: string): Promise<CalendarEventDetail> {
    const response = await api.get<CalendarEventDetail>(
      `/calendar/events/${eventId}`
    );
    return response.data;
  },

  /**
   * Met à jour la date d'un événement
   */
  async updateEventDate(
    eventId: string,
    newDate: string,
    field?: string
  ): Promise<CalendarEvent> {
    const response = await api.patch<CalendarEvent>(
      `/calendar/events/${eventId}/date`,
      { newDate, field }
    );
    return response.data;
  },

  /**
   * Crée un événement rapide (nouvelle note avec date)
   */
  async createQuickEvent(
    data: CreateQuickEventData
  ): Promise<{ note: { id: string; title: string }; event: CalendarEvent }> {
    const response = await api.post<{
      note: { id: string; title: string };
      event: CalendarEvent;
    }>('/calendar/quick-event', data);
    return response.data;
  },

  /**
   * Supprime un événement (supprime la note associée)
   */
  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/calendar/events/${eventId}`);
  },
};
