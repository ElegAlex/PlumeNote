// ===========================================
// Hook pour le statut de connexion WebSocket sync
// ===========================================

import { useState, useEffect } from 'react';
import { syncWebSocket, SyncConnectionStatus } from '../services/syncWebSocket';

/**
 * Hook qui retourne le statut actuel de la connexion WebSocket de synchronisation
 */
export function useSyncStatus(): SyncConnectionStatus {
  const [status, setStatus] = useState<SyncConnectionStatus>(syncWebSocket.getStatus());

  useEffect(() => {
    const unsubscribe = syncWebSocket.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
