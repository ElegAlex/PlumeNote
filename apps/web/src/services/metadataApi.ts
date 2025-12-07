// ===========================================
// API Client Métadonnées (P2)
// ===========================================

import { api } from '../lib/api';
import type {
  PropertyDefinition,
  NoteMetadata,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '@plumenote/types';

/**
 * Service d'API pour les métadonnées
 */
export const metadataApi = {
  // ----- Définitions de propriétés -----

  /**
   * Récupère toutes les définitions de propriétés
   */
  async getPropertyDefinitions(): Promise<PropertyDefinition[]> {
    const response = await api.get<{ properties: PropertyDefinition[] }>('/properties');
    return response.data.properties;
  },

  /**
   * Récupère une définition par ID
   */
  async getPropertyDefinition(id: string): Promise<PropertyDefinition> {
    const response = await api.get<PropertyDefinition>(`/properties/${id}`);
    return response.data;
  },

  /**
   * Crée une nouvelle définition de propriété
   */
  async createPropertyDefinition(
    data: CreatePropertyRequest
  ): Promise<PropertyDefinition> {
    const response = await api.post<PropertyDefinition>('/properties', data);
    return response.data;
  },

  /**
   * Met à jour une définition de propriété
   */
  async updatePropertyDefinition(
    id: string,
    data: UpdatePropertyRequest
  ): Promise<PropertyDefinition> {
    const response = await api.patch<PropertyDefinition>(`/properties/${id}`, data);
    return response.data;
  },

  /**
   * Supprime une définition de propriété
   */
  async deletePropertyDefinition(id: string): Promise<void> {
    await api.delete(`/properties/${id}`);
  },

  /**
   * Réordonne les propriétés
   */
  async reorderProperties(order: string[]): Promise<void> {
    await api.post('/properties/reorder', { order });
  },

  // ----- Métadonnées des notes -----

  // Type pour les items de métadonnées côté API
  // (array format from noteMetadata.ts endpoints)

  /**
   * Récupère les métadonnées d'une note
   * Convertit le format array de l'API en objet { key: value }
   */
  async getNoteMetadata(noteId: string): Promise<NoteMetadata> {
    interface MetadataItem {
      key: string;
      value: string;
      type: string;
      position: number;
    }

    const response = await api.get<{ noteId: string; metadata: MetadataItem[] }>(
      `/notes/${noteId}/metadata`
    );

    // Convertir array en objet
    const metadata: NoteMetadata = {};
    for (const item of response.data.metadata) {
      // Parser la valeur JSON si possible (pour arrays, booleans, numbers)
      try {
        metadata[item.key] = JSON.parse(item.value);
      } catch {
        metadata[item.key] = item.value;
      }
    }
    return metadata;
  },

  /**
   * Met à jour les métadonnées d'une note
   * Convertit l'objet en format array pour l'API PUT
   */
  async updateNoteMetadata(
    noteId: string,
    metadata: NoteMetadata
  ): Promise<{ warnings?: string[] }> {
    // Inférer le type depuis la valeur
    function inferType(value: unknown): string {
      if (typeof value === 'boolean') return 'CHECKBOX';
      if (typeof value === 'number') return 'NUMBER';
      if (Array.isArray(value)) return 'MULTI_SELECT';
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATE';
        if (/^https?:\/\//.test(value)) return 'URL';
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'EMAIL';
      }
      return 'TEXT';
    }

    // Convertir objet en array
    const items = Object.entries(metadata).map(([key, value], idx) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      type: inferType(value),
      position: idx,
    }));

    await api.put(`/notes/${noteId}/metadata`, items);
    return { warnings: [] };
  },
};
