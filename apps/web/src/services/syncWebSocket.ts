// ===========================================
// Service WebSocket pour la synchronisation temps réel
// Gère la connexion et les événements de sync (notes/dossiers)
// ===========================================

import type {
  SyncEvent,
  SyncWebSocketMessage,
  SyncClientMessage,
  SyncConnectionStatus,
} from '@plumenote/types';
import { SyncEventType } from '@plumenote/types';

type EventCallback = (event: SyncEvent) => void;
type StatusCallback = (status: SyncConnectionStatus) => void;

const TOKEN_KEY = 'plumenote-token';

/**
 * Service singleton pour la synchronisation WebSocket
 */
class SyncWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<SyncEventType | '*', Set<EventCallback>> = new Map();
  private statusListeners: Set<StatusCallback> = new Set();

  private status: SyncConnectionStatus = {
    isConnected: false,
    isReconnecting: false,
    lastConnectedAt: null,
    error: null,
  };

  /**
   * Connecte au serveur WebSocket de synchronisation
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      console.warn('[SyncWS] No auth token available');
      this.updateStatus({
        ...this.status,
        error: 'No authentication token',
      });
      return;
    }

    // Construire l'URL WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/sync?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('[SyncWS] Failed to create WebSocket:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Configure les handlers du WebSocket
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[SyncWS] Connected');
      this.reconnectAttempts = 0;
      this.updateStatus({
        isConnected: true,
        isReconnecting: false,
        lastConnectedAt: new Date(),
        error: null,
      });

      // Envoyer un ping pour s'abonner
      this.send({ type: 'subscribe' });

      // Démarrer le heartbeat
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SyncWebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[SyncWS] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[SyncWS] Disconnected:', event.code, event.reason);
      this.stopPing();
      this.updateStatus({
        isConnected: false,
        isReconnecting: true,
        lastConnectedAt: this.status.lastConnectedAt,
        error: null,
      });
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[SyncWS] Error:', error);
      this.handleError(new Error('WebSocket connection error'));
    };
  }

  /**
   * Gère les messages reçus du serveur
   */
  private handleMessage(message: SyncWebSocketMessage): void {
    switch (message.type) {
      case 'connected':
        console.log('[SyncWS] Authenticated as:', message.userId);
        break;

      case 'subscribed':
        console.log('[SyncWS] Subscribed to sync events');
        break;

      case 'sync_event':
        if (message.event) {
          this.emitEvent(message.event);
        }
        break;

      case 'pong':
        // Heartbeat acknowledged
        break;

      case 'error':
        console.error('[SyncWS] Server error:', message.error);
        break;
    }
  }

  /**
   * Émet un événement aux listeners enregistrés
   */
  private emitEvent(event: SyncEvent): void {
    // Émettre aux listeners spécifiques
    const specificListeners = this.eventListeners.get(event.type as SyncEventType);
    if (specificListeners) {
      for (const callback of specificListeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('[SyncWS] Event listener error:', error);
        }
      }
    }

    // Émettre aux listeners wildcard
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      for (const callback of wildcardListeners) {
        try {
          callback(event);
        } catch (error) {
          console.error('[SyncWS] Wildcard listener error:', error);
        }
      }
    }
  }

  /**
   * Met à jour le statut et notifie les listeners
   */
  private updateStatus(newStatus: SyncConnectionStatus): void {
    this.status = newStatus;
    for (const callback of this.statusListeners) {
      try {
        callback(newStatus);
      } catch (error) {
        console.error('[SyncWS] Status listener error:', error);
      }
    }
  }

  /**
   * Gère les erreurs de connexion
   */
  private handleError(error: Error): void {
    this.updateStatus({
      ...this.status,
      isConnected: false,
      error: error.message,
    });
  }

  /**
   * Tente de se reconnecter avec backoff exponentiel
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SyncWS] Max reconnection attempts reached');
      this.updateStatus({
        ...this.status,
        isReconnecting: false,
        error: 'Connection failed after maximum attempts',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 secondes
    );

    console.log(`[SyncWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Démarre le heartbeat ping
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000); // 25 secondes
  }

  /**
   * Arrête le heartbeat ping
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Envoie un message au serveur
   */
  private send(data: SyncClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // ===========================================
  // API Publique
  // ===========================================

  /**
   * S'abonne à un type d'événement spécifique
   * @returns Fonction de désabonnement
   */
  on(eventType: SyncEventType | '*', callback: EventCallback): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);

    // Retourner la fonction de désabonnement
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  /**
   * S'abonne aux changements de statut de connexion
   * @returns Fonction de désabonnement
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    // Émettre le statut actuel immédiatement
    callback(this.status);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Retourne le statut actuel de la connexion
   */
  getStatus(): SyncConnectionStatus {
    return this.status;
  }

  /**
   * Déconnecte proprement le WebSocket
   */
  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.updateStatus({
      isConnected: false,
      isReconnecting: false,
      lastConnectedAt: this.status.lastConnectedAt,
      error: null,
    });
  }

  /**
   * Force une reconnexion
   */
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Instance singleton
const syncWebSocket = new SyncWebSocketService();

export { syncWebSocket };
export type { SyncConnectionStatus };
