// ===========================================
// Store Metadata (Zustand) - P2
// Gestion des définitions et valeurs de métadonnées
// ===========================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  PropertyDefinition,
  PropertyType,
  NoteMetadata,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '@plumenote/types';
import { metadataApi } from '../services/metadataApi';

// ----- Types -----

interface MetadataState {
  // Définitions de propriétés (schéma)
  propertyDefinitions: PropertyDefinition[];
  isLoadingDefinitions: boolean;
  definitionsError: string | null;

  // Métadonnées de la note courante
  currentNoteId: string | null;
  currentMetadata: NoteMetadata;
  originalMetadata: NoteMetadata;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  saveWarnings: string[];

  // Actions - Définitions
  loadPropertyDefinitions: () => Promise<void>;
  createPropertyDefinition: (data: CreatePropertyRequest) => Promise<PropertyDefinition | null>;
  updatePropertyDefinition: (id: string, data: UpdatePropertyRequest) => Promise<boolean>;
  deletePropertyDefinition: (id: string) => Promise<boolean>;
  reorderPropertyDefinitions: (order: string[]) => Promise<void>;

  // Actions - Métadonnées note courante
  loadNoteMetadata: (noteId: string) => Promise<void>;
  setCurrentMetadata: (metadata: NoteMetadata) => void;
  updateField: (key: string, value: unknown) => void;
  removeField: (key: string) => void;
  saveMetadata: () => Promise<boolean>;
  resetMetadata: () => void;
  clearCurrentNote: () => void;

  // Helpers
  getPropertyByName: (name: string) => PropertyDefinition | undefined;
  getPropertyById: (id: string) => PropertyDefinition | undefined;
  getSuggestedProperties: () => PropertyDefinition[];
  getDefaultValueForType: (type: PropertyType) => unknown;
}

// ----- Valeurs par défaut par type -----

function getDefaultValueForType(type: PropertyType): unknown {
  switch (type) {
    case 'text':
      return '';
    case 'number':
      return 0;
    case 'date':
      return new Date().toISOString().split('T')[0];
    case 'datetime':
      return new Date().toISOString();
    case 'checkbox':
      return false;
    case 'tags':
      return [];
    case 'select':
      return '';
    case 'multiselect':
      return [];
    case 'link':
      return '';
    default:
      return '';
  }
}

// ----- Store -----

export const useMetadataStore = create<MetadataState>()(
  devtools(
    (set, get) => ({
      // État initial
      propertyDefinitions: [],
      isLoadingDefinitions: false,
      definitionsError: null,

      currentNoteId: null,
      currentMetadata: {},
      originalMetadata: {},
      isDirty: false,
      isSaving: false,
      saveError: null,
      saveWarnings: [],

      // ----- Actions Définitions -----

      loadPropertyDefinitions: async () => {
        set({ isLoadingDefinitions: true, definitionsError: null });

        try {
          const definitions = await metadataApi.getPropertyDefinitions();
          set({
            propertyDefinitions: definitions,
            isLoadingDefinitions: false,
          });
        } catch (error) {
          set({
            definitionsError: error instanceof Error ? error.message : 'Failed to load properties',
            isLoadingDefinitions: false,
          });
        }
      },

      createPropertyDefinition: async (data) => {
        try {
          const newDefinition = await metadataApi.createPropertyDefinition(data);
          set((state) => ({
            propertyDefinitions: [...state.propertyDefinitions, newDefinition],
          }));
          return newDefinition;
        } catch (error) {
          console.error('Failed to create property:', error);
          return null;
        }
      },

      updatePropertyDefinition: async (id, data) => {
        try {
          const updated = await metadataApi.updatePropertyDefinition(id, data);
          set((state) => ({
            propertyDefinitions: state.propertyDefinitions.map((p) =>
              p.id === id ? updated : p
            ),
          }));
          return true;
        } catch (error) {
          console.error('Failed to update property:', error);
          return false;
        }
      },

      deletePropertyDefinition: async (id) => {
        try {
          await metadataApi.deletePropertyDefinition(id);
          set((state) => ({
            propertyDefinitions: state.propertyDefinitions.filter((p) => p.id !== id),
          }));
          return true;
        } catch (error) {
          console.error('Failed to delete property:', error);
          return false;
        }
      },

      reorderPropertyDefinitions: async (order) => {
        try {
          await metadataApi.reorderProperties(order);
          // Réordonner localement
          const { propertyDefinitions } = get();
          const reordered = order
            .map((id) => propertyDefinitions.find((p) => p.id === id))
            .filter((p): p is PropertyDefinition => p !== undefined);
          set({ propertyDefinitions: reordered });
        } catch (error) {
          console.error('Failed to reorder properties:', error);
        }
      },

      // ----- Actions Métadonnées Note -----

      loadNoteMetadata: async (noteId) => {
        try {
          const metadata = await metadataApi.getNoteMetadata(noteId);
          set({
            currentNoteId: noteId,
            currentMetadata: metadata,
            originalMetadata: metadata,
            isDirty: false,
            saveError: null,
            saveWarnings: [],
          });
        } catch (error) {
          console.error('Failed to load note metadata:', error);
          // En cas d'erreur, initialiser avec un objet vide
          set({
            currentNoteId: noteId,
            currentMetadata: {},
            originalMetadata: {},
            isDirty: false,
          });
        }
      },

      setCurrentMetadata: (metadata) => {
        set({
          currentMetadata: metadata,
          originalMetadata: metadata,
          isDirty: false,
        });
      },

      updateField: (key, value) => {
        set((state) => ({
          currentMetadata: { ...state.currentMetadata, [key]: value },
          isDirty: true,
        }));
      },

      removeField: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.currentMetadata;
          return {
            currentMetadata: rest,
            isDirty: true,
          };
        });
      },

      saveMetadata: async () => {
        const { currentNoteId, currentMetadata, isDirty } = get();

        if (!currentNoteId || !isDirty) {
          return true;
        }

        set({ isSaving: true, saveError: null });

        try {
          const result = await metadataApi.updateNoteMetadata(currentNoteId, currentMetadata);
          set({
            isSaving: false,
            isDirty: false,
            originalMetadata: currentMetadata,
            saveWarnings: result.warnings || [],
          });
          return true;
        } catch (error) {
          set({
            isSaving: false,
            saveError: error instanceof Error ? error.message : 'Failed to save metadata',
          });
          return false;
        }
      },

      resetMetadata: () => {
        const { originalMetadata } = get();
        set({
          currentMetadata: originalMetadata,
          isDirty: false,
          saveError: null,
          saveWarnings: [],
        });
      },

      clearCurrentNote: () => {
        set({
          currentNoteId: null,
          currentMetadata: {},
          originalMetadata: {},
          isDirty: false,
          saveError: null,
          saveWarnings: [],
        });
      },

      // ----- Helpers -----

      getPropertyByName: (name) => {
        return get().propertyDefinitions.find((p) => p.name === name);
      },

      getPropertyById: (id) => {
        return get().propertyDefinitions.find((p) => p.id === id);
      },

      getSuggestedProperties: () => {
        const { propertyDefinitions, currentMetadata } = get();
        const existingKeys = Object.keys(currentMetadata);
        return propertyDefinitions.filter((p) => !existingKeys.includes(p.name));
      },

      getDefaultValueForType,
    }),
    { name: 'metadata-store' }
  )
);
