// ===========================================
// Hook pour la synchronisation temps réel des événements
// Connecte le WebSocket et met à jour les stores automatiquement
// ===========================================

import { useEffect, useRef, useCallback } from 'react';
import type {
  SyncEvent,
  NoteEventPayload,
  FolderEventPayload,
  SidebarFolderNode,
} from '@plumenote/types';
import { SyncEventType } from '@plumenote/types';
import { syncWebSocket } from '../services/syncWebSocket';
import { useSidebarStore } from '../stores/sidebarStore';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';

/**
 * Hook qui gère la synchronisation temps réel des événements
 * Se connecte automatiquement quand l'utilisateur est authentifié
 * Met à jour les stores sidebar/notes lors de la réception d'événements
 */
export function useSyncEvents() {
  const { isAuthenticated } = useAuthStore();
  const {
    refreshFolder,
    addFolderToTree,
    removeFolderFromTree,
    fetchTree,
  } = useSidebarStore();

  const isSetup = useRef(false);

  // Handler pour les événements de notes
  const handleNoteEvent = useCallback(
    async (event: SyncEvent<NoteEventPayload>) => {
      const { payload, type } = event;

      console.log('[SyncEvents] Note event received:', type, payload);

      switch (type) {
        case SyncEventType.NOTE_CREATED:
        case SyncEventType.NOTE_UPDATED:
        case SyncEventType.NOTE_DELETED:
        case SyncEventType.NOTE_MOVED:
          // Rafraîchir le dossier parent pour mettre à jour la liste des notes
          if (payload.folderId) {
            await refreshFolder(payload.folderId);
          }
          break;
      }
    },
    [refreshFolder]
  );

  // Handler pour les événements de dossiers
  const handleFolderEvent = useCallback(
    async (event: SyncEvent<FolderEventPayload>) => {
      const { payload, type } = event;

      console.log('[SyncEvents] Folder event received:', type, payload);

      switch (type) {
        case SyncEventType.FOLDER_CREATED:
          try {
            // Récupérer les infos complètes du dossier créé
            const response = await api.get<{
              id: string;
              name: string;
              slug: string;
              parentId: string | null;
              color: string | null;
              icon: string | null;
              position: number;
            }>(`/folders/${payload.folderId}`);

            const newFolder: SidebarFolderNode = {
              id: response.data.id,
              name: response.data.name,
              slug: response.data.slug,
              parentId: response.data.parentId,
              color: response.data.color,
              icon: response.data.icon,
              position: response.data.position,
              hasChildren: false,
              notesCount: 0,
              children: [],
              notes: [],
              isLoaded: false,
            };

            addFolderToTree(newFolder, payload.parentId);
          } catch (error) {
            console.error('[SyncEvents] Failed to fetch new folder:', error);
            // Fallback: recharger tout l'arbre
            await fetchTree();
          }
          break;

        case SyncEventType.FOLDER_UPDATED:
          // Rafraîchir le dossier parent pour voir les changements
          if (payload.parentId) {
            await refreshFolder(payload.parentId);
          } else {
            // Dossier racine modifié, recharger l'arbre
            await fetchTree();
          }
          break;

        case SyncEventType.FOLDER_DELETED:
          removeFolderFromTree(payload.folderId);
          break;

        case SyncEventType.FOLDER_MOVED:
          // Pour un déplacement, on recharge l'arbre complet
          // car il faut mettre à jour l'ancien et le nouveau parent
          await fetchTree();
          break;
      }
    },
    [addFolderToTree, removeFolderFromTree, refreshFolder, fetchTree]
  );

  // Setup et cleanup de la connexion WebSocket
  useEffect(() => {
    if (!isAuthenticated) {
      if (isSetup.current) {
        syncWebSocket.disconnect();
        isSetup.current = false;
      }
      return;
    }

    if (isSetup.current) {
      return;
    }

    // Connecter au WebSocket
    syncWebSocket.connect();

    // S'abonner aux événements de notes
    const unsubNoteCreated = syncWebSocket.on(
      SyncEventType.NOTE_CREATED,
      handleNoteEvent as (event: SyncEvent) => void
    );
    const unsubNoteUpdated = syncWebSocket.on(
      SyncEventType.NOTE_UPDATED,
      handleNoteEvent as (event: SyncEvent) => void
    );
    const unsubNoteDeleted = syncWebSocket.on(
      SyncEventType.NOTE_DELETED,
      handleNoteEvent as (event: SyncEvent) => void
    );
    const unsubNoteMoved = syncWebSocket.on(
      SyncEventType.NOTE_MOVED,
      handleNoteEvent as (event: SyncEvent) => void
    );

    // S'abonner aux événements de dossiers
    const unsubFolderCreated = syncWebSocket.on(
      SyncEventType.FOLDER_CREATED,
      handleFolderEvent as (event: SyncEvent) => void
    );
    const unsubFolderUpdated = syncWebSocket.on(
      SyncEventType.FOLDER_UPDATED,
      handleFolderEvent as (event: SyncEvent) => void
    );
    const unsubFolderDeleted = syncWebSocket.on(
      SyncEventType.FOLDER_DELETED,
      handleFolderEvent as (event: SyncEvent) => void
    );
    const unsubFolderMoved = syncWebSocket.on(
      SyncEventType.FOLDER_MOVED,
      handleFolderEvent as (event: SyncEvent) => void
    );

    isSetup.current = true;

    return () => {
      unsubNoteCreated();
      unsubNoteUpdated();
      unsubNoteDeleted();
      unsubNoteMoved();
      unsubFolderCreated();
      unsubFolderUpdated();
      unsubFolderDeleted();
      unsubFolderMoved();
      syncWebSocket.disconnect();
      isSetup.current = false;
    };
  }, [isAuthenticated, handleNoteEvent, handleFolderEvent]);
}
