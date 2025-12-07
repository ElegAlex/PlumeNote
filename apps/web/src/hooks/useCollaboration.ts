// ===========================================
// Hook de Collaboration Temps Réel (Sprint 5)
// US-029: Connexion WebSocket Hocuspocus
// US-031: Affichage collaborateurs actifs
// US-034: Mode lecture seule collaboratif
// US-035: Gestion déconnexion gracieuse
// ===========================================

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useAuthStore } from '../stores/auth';

const YJS_URL = import.meta.env.VITE_YJS_URL || 'ws://localhost:1234';

// ===========================================
// Types
// ===========================================

export interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'syncing' | 'synced' | 'disconnected' | 'error';

interface UseCollaborationOptions {
  /** ID du document (note) */
  documentId: string;
  /** Callback quand la liste des collaborateurs change */
  onAwarenessChange?: (collaborators: CollaboratorInfo[]) => void;
  /** Callback de connexion */
  onConnect?: () => void;
  /** Callback de déconnexion */
  onDisconnect?: () => void;
  /** Callback de synchronisation */
  onSynced?: () => void;
  /** Callback d'erreur */
  onError?: (error: Error) => void;
}

interface UseCollaborationReturn {
  /** Document Yjs */
  ydoc: Y.Doc | null;
  /** Provider Hocuspocus */
  provider: HocuspocusProvider | null;
  /** Y.Map pour les métadonnées (P2) */
  metadataMap: Y.Map<unknown> | null;
  /** État de connexion WebSocket */
  isConnected: boolean;
  /** État de synchronisation du document */
  isSynced: boolean;
  /** Liste des collaborateurs actifs */
  collaborators: CollaboratorInfo[];
  /** Statut détaillé de connexion */
  connectionStatus: ConnectionStatus;
  /** Nombre de tentatives de reconnexion */
  reconnectAttempts: number;
  /** Forcer une reconnexion */
  reconnect: () => void;
  /** Permission d'écriture (US-034) */
  canWrite: boolean;
}

// ===========================================
// Constantes
// ===========================================

const CURSOR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
];

// Génère une couleur déterministe basée sur l'ID utilisateur
function generateUserColor(userId: string): string {
  if (!userId || userId === 'anonymous') {
    return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// ===========================================
// Hook Principal
// ===========================================

export function useCollaboration({
  documentId,
  onAwarenessChange,
  onConnect,
  onDisconnect,
  onSynced,
  onError,
}: UseCollaborationOptions): UseCollaborationReturn {
  const { user } = useAuthStore();

  // États
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [canWrite, setCanWrite] = useState(true);

  // État pour ydoc et provider (pour déclencher les re-renders)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Refs pour le cleanup (ne déclenchent pas de re-render)
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isMountedRef = useRef(true);

  // Stocker les callbacks dans une ref pour éviter les recréations
  const callbacksRef = useRef({ onAwarenessChange, onConnect, onDisconnect, onSynced, onError });
  callbacksRef.current = { onAwarenessChange, onConnect, onDisconnect, onSynced, onError };

  // Stocker les infos utilisateur dans une ref pour le useEffect séparé
  const userInfoRef = useRef({
    id: user?.id || '',
    name: user?.displayName || user?.username || 'Anonymous',
    color: '',
  });

  // Mettre à jour userInfoRef quand l'utilisateur change
  const userId = user?.id || '';
  const userName = user?.displayName || user?.username || 'Anonymous';
  const userColor = generateUserColor(userId);
  userInfoRef.current = { id: userId, name: userName, color: userColor };

  // Fonction de reconnexion manuelle
  const reconnect = useCallback(() => {
    if (providerRef.current) {
      console.log('[Collaboration] Manual reconnect triggered');
      setConnectionStatus('connecting');
      providerRef.current.connect();
    }
  }, []);

  // EFFET PRINCIPAL: Créer le provider et le ydoc
  // UNIQUEMENT déclenché par documentId
  useEffect(() => {
    // Valider le documentId
    if (!documentId || documentId.length < 10) {
      console.warn('[Collaboration] Invalid documentId:', documentId);
      return;
    }

    // Reset mounted flag
    isMountedRef.current = true;

    // Créer le ydoc LOCALEMENT dans l'effet
    const newYdoc = new Y.Doc();
    ydocRef.current = newYdoc;
    setYdoc(newYdoc);

    // Récupérer le token JWT
    const token = localStorage.getItem('plumenote-token') || '';
    const roomName = `note:${documentId}`;

    console.log('[Collaboration] Connecting to room:', roomName);
    setConnectionStatus('connecting');

    // Créer le provider
    const newProvider = new HocuspocusProvider({
      url: YJS_URL,
      name: roomName,
      document: newYdoc,
      token,
      connect: true,
      preserveConnection: true,

      onConnect: () => {
        if (!isMountedRef.current) return;
        console.log('[Collaboration] Connected to', roomName);
        setIsConnected(true);
        setConnectionStatus('syncing');
        setReconnectAttempts(0);
        callbacksRef.current.onConnect?.();
      },

      onDisconnect: () => {
        if (!isMountedRef.current) return;
        console.log('[Collaboration] Disconnected from', roomName);
        setIsConnected(false);
        setIsSynced(false);
        setConnectionStatus('disconnected');
        callbacksRef.current.onDisconnect?.();
      },

      onSynced: () => {
        if (!isMountedRef.current) return;
        console.log('[Collaboration] Synced with', roomName);
        setIsSynced(true);
        setConnectionStatus('synced');
        callbacksRef.current.onSynced?.();
      },

      onAuthenticated: () => {
        console.log('[Collaboration] Authenticated successfully');
      },

      onAuthenticationFailed: ({ reason }) => {
        if (!isMountedRef.current) return;
        console.error('[Collaboration] Authentication failed:', reason);
        setConnectionStatus('error');
        setCanWrite(false);
        callbacksRef.current.onError?.(new Error(`Authentication failed: ${reason}`));
      },

      onAwarenessChange: ({ states }) => {
        if (!isMountedRef.current) return;

        // Décaler hors du cycle de render pour éviter "Cannot update while rendering"
        queueMicrotask(() => {
          if (!isMountedRef.current) return;

          const currentUserId = userInfoRef.current.id;
          const users: CollaboratorInfo[] = [];

          states.forEach((state: { user?: { name: string; color: string; id: string } }) => {
            if (state.user && state.user.id !== currentUserId) {
              users.push({
                id: state.user.id,
                name: state.user.name,
                color: state.user.color,
              });
            }
          });

          setCollaborators(prev => {
            const prevIds = prev.map(c => c.id).sort().join(',');
            const newIds = users.map(c => c.id).sort().join(',');
            if (prevIds === newIds) return prev;
            return users;
          });
          callbacksRef.current.onAwarenessChange?.(users);
        });
      },

      onStatus: ({ status }) => {
        if (!isMountedRef.current) return;
        console.log('[Collaboration] Status:', status);
        if (status === 'connecting') {
          setReconnectAttempts(prev => prev + 1);
        }
      },

      onStateless: ({ payload }) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(payload);
          if (data.type === 'permissions') {
            console.log('[Collaboration] Received permissions:', data);
            setCanWrite(data.canWrite ?? true);
          }
        } catch {
          // Ignorer les messages non-JSON
        }
      },
    });

    // Définir les infos utilisateur initiales
    newProvider.setAwarenessField('user', {
      name: userInfoRef.current.name,
      color: userInfoRef.current.color,
      id: userInfoRef.current.id || `anon-${Math.random().toString(36).slice(2, 9)}`,
    });

    providerRef.current = newProvider;
    setProvider(newProvider);

    // Cleanup
    return () => {
      console.log('[Collaboration] Cleaning up provider for', roomName);
      isMountedRef.current = false;
      newProvider.destroy();
      newYdoc.destroy();
      providerRef.current = null;
      ydocRef.current = null;
      setProvider(null);
      setYdoc(null);
    };
  }, [documentId]); // SEULEMENT documentId comme dépendance

  // EFFET SÉPARÉ: Mettre à jour l'awareness quand les infos utilisateur changent
  useEffect(() => {
    if (providerRef.current && userId) {
      providerRef.current.setAwarenessField('user', {
        name: userName,
        color: userColor,
        id: userId,
      });
    }
  }, [userId, userName, userColor]);

  // P2: Obtenir le Y.Map pour les métadonnées
  const metadataMap = ydoc?.getMap<unknown>('metadata') ?? null;

  return {
    ydoc,
    provider,
    metadataMap,
    isConnected,
    isSynced,
    collaborators,
    connectionStatus,
    reconnectAttempts,
    reconnect,
    canWrite,
  };
}

// ===========================================
// Hook pour Warning avant fermeture (US-035)
// ===========================================

/**
 * Hook pour avertir l'utilisateur avant de fermer la page si des modifications non synchronisées
 */
export function useBeforeUnloadWarning(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Des modifications non sauvegardées pourraient être perdues.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
