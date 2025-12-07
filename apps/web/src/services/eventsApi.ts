// ===========================================
// API Client Events autonomes
// ===========================================

import { api } from '../lib/api';
import type {
  AutonomousEvent,
  CreateAutonomousEventPayload,
  UpdateAutonomousEventPayload,
  LinkedNote,
} from '@plumenote/types';

interface GetEventsParams {
  from?: string;
  to?: string;
  type?: string; // "EVENT,DEADLINE,PERIOD"
  limit?: number;
}

/**
 * Service d'API pour les événements autonomes
 */
export const eventsApi = {
  /**
   * Récupère les événements autonomes avec filtres optionnels
   */
  async getEvents(params?: GetEventsParams): Promise<AutonomousEvent[]> {
    const queryParams = new URLSearchParams();

    if (params?.from) queryParams.set('from', params.from);
    if (params?.to) queryParams.set('to', params.to);
    if (params?.type) queryParams.set('type', params.type);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/events?${queryString}` : '/events';

    const response = await api.get<{ events: AutonomousEvent[] }>(url);
    return response.data.events;
  },

  /**
   * Récupère un événement par son ID avec ses notes liées
   */
  async getById(id: string): Promise<AutonomousEvent> {
    const response = await api.get<AutonomousEvent>(`/events/${id}`);
    return response.data;
  },

  /**
   * Crée un nouvel événement autonome
   */
  async create(data: CreateAutonomousEventPayload): Promise<AutonomousEvent> {
    const response = await api.post<AutonomousEvent>('/events', data);
    return response.data;
  },

  /**
   * Met à jour un événement autonome
   */
  async update(id: string, data: UpdateAutonomousEventPayload): Promise<AutonomousEvent> {
    const response = await api.put<AutonomousEvent>(`/events/${id}`, data);
    return response.data;
  },

  /**
   * Supprime un événement autonome
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/events/${id}`);
  },

  /**
   * Lie une note à un événement
   */
  async linkNote(eventId: string, noteId: string): Promise<LinkedNote> {
    const response = await api.post<LinkedNote>(`/events/${eventId}/notes`, { noteId });
    return response.data;
  },

  /**
   * Délie une note d'un événement
   */
  async unlinkNote(eventId: string, noteId: string): Promise<void> {
    await api.delete(`/events/${eventId}/notes/${noteId}`);
  },

  /**
   * Récupère les événements liés à une note
   */
  async getEventsForNote(noteId: string): Promise<AutonomousEvent[]> {
    const response = await api.get<{ events: AutonomousEvent[] }>(`/notes/${noteId}/events`);
    return response.data.events;
  },

  /**
   * Récupère les prochains événements (widget homepage)
   */
  async getUpcoming(limit: number = 5): Promise<AutonomousEvent[]> {
    const response = await api.get<{ events: AutonomousEvent[] }>(`/events/upcoming?limit=${limit}`);
    return response.data.events;
  },
};
