// ===========================================
// Composant PropertiesPanel (P2)
// Panneau latéral pour éditer les métadonnées d'une note
// ===========================================

import { useEffect, useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { PropertyField } from './PropertyField';
import { AddPropertyPopover } from './AddPropertyPopover';
import { useMetadataStore } from '../../../stores/metadataStore';
import type { PropertyType } from '@plumenote/types';

// ----- Types -----

interface PropertiesPanelProps {
  noteId: string;
  initialMetadata?: Record<string, unknown>;
  className?: string;
}

// ----- Composant Principal -----

export function PropertiesPanel({
  noteId,
  initialMetadata,
  className = '',
}: PropertiesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    propertyDefinitions,
    isLoadingDefinitions,
    currentNoteId,
    currentMetadata,
    isDirty,
    isSaving,
    saveError,
    saveWarnings,
    loadPropertyDefinitions,
    loadNoteMetadata,
    setCurrentMetadata,
    updateField,
    removeField,
    saveMetadata,
    getSuggestedProperties,
    getDefaultValueForType,
  } = useMetadataStore();

  // Charger les définitions au mount
  useEffect(() => {
    if (propertyDefinitions.length === 0) {
      loadPropertyDefinitions();
    }
  }, [loadPropertyDefinitions, propertyDefinitions.length]);

  // Charger ou initialiser les métadonnées de la note
  useEffect(() => {
    if (noteId !== currentNoteId) {
      if (initialMetadata) {
        setCurrentMetadata(initialMetadata);
      } else {
        loadNoteMetadata(noteId);
      }
    }
  }, [noteId, currentNoteId, initialMetadata, loadNoteMetadata, setCurrentMetadata]);

  // Auto-save avec debounce
  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(() => {
      saveMetadata();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isDirty, currentMetadata, saveMetadata]);

  // Handlers
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      updateField(key, value);
    },
    [updateField]
  );

  const handleRemoveField = useCallback(
    (key: string) => {
      removeField(key);
    },
    [removeField]
  );

  const handleAddProperty = useCallback(
    (name: string, type: PropertyType, defaultValue?: unknown) => {
      const value = defaultValue ?? getDefaultValueForType(type);
      updateField(name, value);
    },
    [updateField, getDefaultValueForType]
  );

  const handleSave = useCallback(() => {
    saveMetadata();
  }, [saveMetadata]);

  // Données
  const metadataEntries = Object.entries(currentMetadata);
  const suggestedProperties = getSuggestedProperties();

  return (
    <div className={`border-b ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Propriétés
          {metadataEntries.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({metadataEntries.length})
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {/* Indicateur de sauvegarde */}
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved
            </span>
          )}
        </div>
      </button>

      {/* Contenu */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Erreur de sauvegarde */}
          {saveError && (
            <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
              {saveError}
            </div>
          )}

          {/* Warnings */}
          {saveWarnings.length > 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              {saveWarnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          )}

          {/* Chargement des définitions */}
          {isLoadingDefinitions && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading properties...
            </div>
          )}

          {/* Liste des propriétés */}
          {metadataEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No properties yet. Add one below.
            </p>
          ) : (
            <div className="space-y-1">
              {metadataEntries.map(([key, value]) => {
                const definition = propertyDefinitions.find((p) => p.name === key);

                return (
                  <PropertyField
                    key={key}
                    name={key}
                    displayName={definition?.displayName}
                    value={value}
                    definition={definition}
                    onChange={(newValue) => handleFieldChange(key, newValue)}
                    onRemove={() => handleRemoveField(key)}
                  />
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <AddPropertyPopover
              suggestedProperties={suggestedProperties}
              onAddProperty={handleAddProperty}
            />

            {isDirty && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertiesPanel;
