// ===========================================
// Hook useAutoSave - Machine à états pour auto-save
// US-008/US-009: Sauvegarde automatique avec feedback
// ===========================================

import { useCallback, useRef, useState, useEffect } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  /** Délai avant sauvegarde après modification (ms) */
  debounceMs?: number;
  /** Délai max avant sauvegarde forcée si édition continue (ms) */
  maxWaitMs?: number;
  /** Nombre de tentatives en cas d'erreur */
  maxRetries?: number;
  /** Délai entre les tentatives (ms) */
  retryDelayMs?: number;
  /** Durée d'affichage du statut "saved" avant retour à idle (ms) */
  savedDisplayMs?: number;
}

interface UseAutoSaveReturn {
  /** Statut actuel de la sauvegarde */
  status: SaveStatus;
  /** Date de dernière sauvegarde réussie */
  lastSaved: Date | null;
  /** Message d'erreur si status === 'error' */
  errorMessage: string | null;
  /** Déclenche une sauvegarde (debounced) */
  triggerSave: (content: string) => void;
  /** Force une sauvegarde immédiate */
  forceSave: () => Promise<void>;
  /** Réessayer après une erreur */
  retry: () => void;
  /** Réinitialise le statut à idle */
  reset: () => void;
  /** Indique si des modifications sont en attente */
  hasPendingChanges: boolean;
}

export function useAutoSave(
  saveFunction: (content: string) => Promise<void>,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    debounceMs = 1000,
    maxWaitMs = 30000,
    maxRetries = 3,
    retryDelayMs = 2000,
    savedDisplayMs = 3000,
  } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingContentRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const lastTriggerTimeRef = useRef<number>(0);

  // Nettoyage des timers
  const clearAllTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }, []);

  // Exécute la sauvegarde
  const executeSave = useCallback(async () => {
    const content = pendingContentRef.current;
    if (content === null) return;

    setStatus('saving');
    setErrorMessage(null);

    try {
      await saveFunction(content);

      // Succès
      pendingContentRef.current = null;
      retryCountRef.current = 0;
      setLastSaved(new Date());
      setStatus('saved');

      // Revenir à idle après un délai
      savedTimerRef.current = setTimeout(() => {
        setStatus('idle');
      }, savedDisplayMs);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de sauvegarde';

      // Retry automatique si possible
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => {
          executeSave();
        }, retryDelayMs);
      } else {
        // Échec définitif
        setErrorMessage(message);
        setStatus('error');
        retryCountRef.current = 0;
      }
    }
  }, [saveFunction, maxRetries, retryDelayMs, savedDisplayMs]);

  // Déclenche une sauvegarde (debounced)
  const triggerSave = useCallback((content: string) => {
    pendingContentRef.current = content;
    setStatus('pending');
    setErrorMessage(null);

    // Clear debounce timer existant
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Setup maxWait timer si premier trigger
    const now = Date.now();
    if (!maxWaitTimerRef.current) {
      lastTriggerTimeRef.current = now;
      maxWaitTimerRef.current = setTimeout(() => {
        maxWaitTimerRef.current = null;
        executeSave();
      }, maxWaitMs);
    }

    // Setup debounce timer
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (maxWaitTimerRef.current) {
        clearTimeout(maxWaitTimerRef.current);
        maxWaitTimerRef.current = null;
      }
      executeSave();
    }, debounceMs);
  }, [debounceMs, maxWaitMs, executeSave]);

  // Force une sauvegarde immédiate
  const forceSave = useCallback(async () => {
    clearAllTimers();
    await executeSave();
  }, [clearAllTimers, executeSave]);

  // Réessayer après une erreur
  const retry = useCallback(() => {
    if (status === 'error' && pendingContentRef.current !== null) {
      retryCountRef.current = 0;
      executeSave();
    }
  }, [status, executeSave]);

  // Réinitialiser
  const reset = useCallback(() => {
    clearAllTimers();
    pendingContentRef.current = null;
    retryCountRef.current = 0;
    setStatus('idle');
    setErrorMessage(null);
  }, [clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    status,
    lastSaved,
    errorMessage,
    triggerSave,
    forceSave,
    retry,
    reset,
    hasPendingChanges: pendingContentRef.current !== null,
  };
}
