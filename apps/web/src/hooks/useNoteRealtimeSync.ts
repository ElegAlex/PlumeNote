// ===========================================
// Hook pour synchroniser le contenu d'une note en temps réel
// Recharge la note quand un autre utilisateur la modifie
// ===========================================

import { useEffect, useCallback, useRef } from 'react';
import type { SyncEvent, NoteEventPayload } from '@plumenote/types';
import { SyncEventType } from '@plumenote/types';
import { syncWebSocket } from '../services/syncWebSocket';
import { useAuthStore } from '../stores/auth';

/**
 * Hook qui écoute les événements de modification sur une note spécifique
 * et appelle onRemoteUpdate quand un autre utilisateur la modifie
 */
export function useNoteRealtimeSync(
  noteId: string | undefined,
  onRemoteUpdate: () => void
) {
  const { user } = useAuthStore();
  const onRemoteUpdateRef = useRef(onRemoteUpdate);

  // Garder la référence à jour
  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  const handleNoteUpdate = useCallback(
    (event: SyncEvent<NoteEventPayload>) => {
      // Ignorer si c'est nous qui avons fait la modification
      if (event.userId === user?.id) {
        console.log('[NoteRealtimeSync] Ignoring own update');
        return;
      }

      // Vérifier si c'est la note qu'on regarde
      if (event.payload.noteId === noteId) {
        console.log('[NoteRealtimeSync] Remote update detected, refreshing note');
        onRemoteUpdateRef.current();
      }
    },
    [noteId, user?.id]
  );

  useEffect(() => {
    if (!noteId) return;

    // S'abonner aux événements de mise à jour de notes
    const unsubscribe = syncWebSocket.on(
      SyncEventType.NOTE_UPDATED,
      handleNoteUpdate as (event: SyncEvent) => void
    );

    console.log('[NoteRealtimeSync] Subscribed to updates for note:', noteId);

    return () => {
      unsubscribe();
      console.log('[NoteRealtimeSync] Unsubscribed from note:', noteId);
    };
  }, [noteId, handleNoteUpdate]);
}
