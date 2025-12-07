// ===========================================
// Hook useMetadataSync (P2)
// Synchronisation CRDT des métadonnées via Y.Map
// ===========================================

import { useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { NoteMetadata } from '@plumenote/types';
import { useMetadataStore } from '../stores/metadataStore';

// ----- Types -----

interface UseMetadataSyncOptions {
  ydoc: Y.Doc | null;
  noteId: string;
  isConnected: boolean;
  isSynced: boolean;
  enabled?: boolean;
}

interface UseMetadataSyncReturn {
  ymap: Y.Map<unknown> | null;
  syncToYmap: (key: string, value: unknown) => void;
  syncFromYmap: () => NoteMetadata;
  isReady: boolean;
}

// ----- Helper Functions -----

/**
 * Extrait une valeur JavaScript depuis une structure Yjs
 */
function extractYValue(value: unknown): unknown {
  if (value instanceof Y.Text) {
    return value.toString();
  }
  if (value instanceof Y.Array) {
    return value.toArray().map(extractYValue);
  }
  if (value instanceof Y.Map) {
    const result: Record<string, unknown> = {};
    value.forEach((v, k) => {
      result[k] = extractYValue(v);
    });
    return result;
  }
  return value;
}

/**
 * Convertit une valeur JavaScript en structure Yjs appropriée
 */
function toYValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    const yarray = new Y.Array();
    value.forEach((item) => yarray.push([item]));
    return yarray;
  }
  if (typeof value === 'object') {
    const ymap = new Y.Map();
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      ymap.set(k, toYValue(v));
    });
    return ymap;
  }
  // Primitives: string, number, boolean
  return value;
}

// ----- Hook -----

export function useMetadataSync({
  ydoc,
  noteId,
  isConnected,
  isSynced,
  enabled = true,
}: UseMetadataSyncOptions): UseMetadataSyncReturn {
  const ymapRef = useRef<Y.Map<unknown> | null>(null);
  const isUpdatingFromYmapRef = useRef(false);

  const {
    currentMetadata,
    setCurrentMetadata,
    updateField,
    currentNoteId,
  } = useMetadataStore();

  // Initialiser Y.Map depuis Y.Doc
  useEffect(() => {
    if (!ydoc || !enabled) {
      ymapRef.current = null;
      return;
    }

    // Obtenir ou créer la Y.Map 'metadata'
    const ymap = ydoc.getMap<unknown>('metadata');
    ymapRef.current = ymap;

    // Charger les métadonnées initiales depuis Y.Map
    const loadInitialMetadata = () => {
      const metadata: NoteMetadata = {};
      ymap.forEach((value, key) => {
        metadata[key] = extractYValue(value);
      });

      if (Object.keys(metadata).length > 0) {
        isUpdatingFromYmapRef.current = true;
        setCurrentMetadata(metadata);
        isUpdatingFromYmapRef.current = false;
      }
    };

    // Observer les changements de Y.Map
    const handleYmapChange = (event: Y.YMapEvent<unknown>) => {
      // Ignorer si c'est nous qui avons fait le changement
      if (event.transaction.local) return;

      isUpdatingFromYmapRef.current = true;

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const value = ymap.get(key);
          updateField(key, extractYValue(value));
        } else if (change.action === 'delete') {
          // Supprimer du store local
          const { [key]: _, ...rest } = useMetadataStore.getState().currentMetadata;
          setCurrentMetadata(rest);
        }
      });

      isUpdatingFromYmapRef.current = false;
    };

    // Attendre la synchronisation initiale
    if (isSynced) {
      loadInitialMetadata();
    }

    ymap.observe(handleYmapChange);

    return () => {
      ymap.unobserve(handleYmapChange);
    };
  }, [ydoc, enabled, isSynced, setCurrentMetadata, updateField]);

  // Synchroniser les métadonnées du store vers Y.Map quand elles changent localement
  useEffect(() => {
    if (!ymapRef.current || !isSynced || !enabled) return;
    if (isUpdatingFromYmapRef.current) return;
    if (currentNoteId !== noteId) return;

    const ymap = ymapRef.current;

    // Synchroniser les changements locaux vers Y.Map
    Object.entries(currentMetadata).forEach(([key, value]) => {
      const currentYValue = ymap.get(key);
      const extractedCurrentValue = extractYValue(currentYValue);

      // Comparer les valeurs pour éviter les boucles infinies
      if (JSON.stringify(extractedCurrentValue) !== JSON.stringify(value)) {
        ymap.set(key, toYValue(value));
      }
    });

    // Supprimer les clés qui ne sont plus dans le store
    ymap.forEach((_, key) => {
      if (!(key in currentMetadata)) {
        ymap.delete(key);
      }
    });
  }, [currentMetadata, isSynced, enabled, noteId, currentNoteId]);

  // Fonction pour synchroniser une valeur spécifique vers Y.Map
  const syncToYmap = useCallback(
    (key: string, value: unknown) => {
      if (!ymapRef.current || !isSynced) return;

      const ymap = ymapRef.current;

      if (value === null || value === undefined) {
        ymap.delete(key);
      } else {
        ymap.set(key, toYValue(value));
      }
    },
    [isSynced]
  );

  // Fonction pour lire toutes les métadonnées depuis Y.Map
  const syncFromYmap = useCallback((): NoteMetadata => {
    if (!ymapRef.current) return {};

    const metadata: NoteMetadata = {};
    ymapRef.current.forEach((value, key) => {
      metadata[key] = extractYValue(value);
    });

    return metadata;
  }, []);

  return {
    ymap: ymapRef.current,
    syncToYmap,
    syncFromYmap,
    isReady: !!ymapRef.current && isSynced && isConnected,
  };
}

export default useMetadataSync;
