// ===========================================
// Hook de Collaboration Temps Réel
// (EP-005 - Sprint 3-4)
// ===========================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuthStore } from '../stores/auth';

const YJS_URL = import.meta.env.VITE_YJS_URL || 'ws://localhost:1234';

export interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
}

interface UseCollaborationOptions {
  documentId: string;
  onAwarenessChange?: (collaborators: CollaboratorInfo[]) => void;
}

interface UseCollaborationReturn {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  isConnected: boolean;
  collaborators: CollaboratorInfo[];
  isSynced: boolean;
}

export function useCollaboration({
  documentId,
  onAwarenessChange,
}: UseCollaborationOptions): UseCollaborationReturn {
  const { user } = useAuthStore();
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  // Create Yjs document - stable reference
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  // Get auth token for WebSocket connection
  const getToken = useCallback(async () => {
    // Token is stored in cookies, we need to get it from the API
    // For now, we'll use localStorage as fallback
    return localStorage.getItem('collabnotes-token') || '';
  }, []);

  useEffect(() => {
    if (!documentId || !user) return;

    let wsProvider: WebsocketProvider;

    const setupConnection = async () => {
      const token = await getToken();

      wsProvider = new WebsocketProvider(
        YJS_URL,
        `note:${documentId}`,
        ydoc,
        {
          params: { token },
        }
      );

      // Connection status
      wsProvider.on('status', ({ status }: { status: string }) => {
        setIsConnected(status === 'connected');
      });

      // Sync status
      wsProvider.on('sync', (isSynced: boolean) => {
        setIsSynced(isSynced);
      });

      // Awareness (collaborator presence)
      wsProvider.awareness.on('change', () => {
        const states = wsProvider.awareness.getStates();
        const users: CollaboratorInfo[] = [];

        states.forEach((state, clientId) => {
          if (state.user && clientId !== wsProvider.awareness.clientID) {
            users.push({
              id: String(clientId),
              name: state.user.name,
              color: state.user.color,
            });
          }
        });

        setCollaborators(users);
        onAwarenessChange?.(users);
      });

      // Set local user info
      const colors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7',
        '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
        '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      wsProvider.awareness.setLocalStateField('user', {
        name: user.displayName || user.username,
        color,
        id: user.id,
      });

      setProvider(wsProvider);
    };

    setupConnection();

    return () => {
      if (wsProvider) {
        wsProvider.destroy();
      }
      ydoc.destroy();
    };
  }, [documentId, user, ydoc, getToken, onAwarenessChange]);

  return {
    ydoc,
    provider,
    isConnected,
    collaborators,
    isSynced,
  };
}
