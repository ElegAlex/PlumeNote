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
  NotePreview,
} from '@plumenote/types';
import { SyncEventType } from '@plumenote/types';
import { syncWebSocket } from '../services/syncWebSocket';
import { useSidebarStore } from '../stores/sidebarStore';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { toast } from 'sonner';

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
    addNoteToFolder,
    removeNoteFromFolder,
    invalidateFolderCache,
    fetchTree,
  } = useSidebarStore();

  const isSetup = useRef(false);

  // Handler pour les événements de notes
  const handleNoteEvent = useCallback(
    async (event: SyncEvent<NoteEventPayload>) => {
      const { payload, type, userId } = event;

      console.log('[SyncEvents] Note event received:', type, payload);

      switch (type) {
        case SyncEventType.NOTE_CREATED:
          if (payload.folderId && payload.noteId) {
            try {
              // Récupérer les infos de la note créée
              const response = await api.get<{
                id: string;
                title: string;
                slug: string;
                createdAt: string;
                updatedAt: string;
              }>(`/notes/${payload.noteId}`);

              const newNote: NotePreview = {
                id: response.data.id,
                title: response.data.title,
                slug: response.data.slug,
                position: 0,
                createdAt: response.data.createdAt,
                updatedAt: response.data.updatedAt,
              };

              // Ajouter directement la note au dossier
              addNoteToFolder(payload.folderId, newNote);

              // Notification visuelle
              toast.info(`Nouvelle note : ${response.data.title}`, {
                description: 'Créée par un autre utilisateur',
                duration: 3000,
              });
            } catch (error) {
              console.error('[SyncEvents] Failed to fetch new note:', error);
              // Fallback: invalider le cache et rafraîchir
              invalidateFolderCache(payload.folderId);
              await refreshFolder(payload.folderId);
            }
          }
          break;

        case SyncEventType.NOTE_DELETED:
          if (payload.folderId && payload.noteId) {
            removeNoteFromFolder(payload.folderId, payload.noteId);
          }
          break;

        case SyncEventType.NOTE_UPDATED:
          // Pour les mises à jour, rafraîchir le cache du dossier
          if (payload.folderId) {
            invalidateFolderCache(payload.folderId);
            await refreshFolder(payload.folderId);
          }
          break;

        case SyncEventType.NOTE_MOVED:
          // Déplacement : mettre à jour l'ancien et le nouveau dossier
          if (payload.folderId) {
            invalidateFolderCache(payload.folderId);
            await refreshFolder(payload.folderId);
          }
          // Si on a l'ancien folderId dans le payload, le rafraîchir aussi
          if ((payload as any).previousFolderId) {
            invalidateFolderCache((payload as any).previousFolderId);
            await refreshFolder((payload as any).previousFolderId);
          }
          break;
      }
    },
    [refreshFolder, addNoteToFolder, removeNoteFromFolder, invalidateFolderCache]
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
