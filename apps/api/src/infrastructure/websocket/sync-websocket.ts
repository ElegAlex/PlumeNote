// ===========================================
// WebSocket Server pour la synchronisation temps réel
// Gère les connexions clients et broadcast les événements
// ===========================================

import type { FastifyInstance } from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import type { RawData } from 'ws';
import type { IncomingMessage } from 'http';
import { EventBus } from '../events/event-bus.js';
import { logger } from '../../lib/logger.js';
import type { SyncEvent, SyncClientMessage, SyncWebSocketMessage } from '@plumenote/types';

/**
 * Socket WebSocket authentifié avec métadonnées utilisateur
 */
interface AuthenticatedSocket extends WebSocket {
  userId: string;
  username: string;
  isAlive: boolean;
}

/**
 * Serveur WebSocket pour la synchronisation des événements de structure
 * (création/modification/suppression de notes et dossiers)
 */
export class SyncWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<AuthenticatedSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private fastify: FastifyInstance,
    private eventBus: EventBus,
    private path: string = '/ws/sync'
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupUpgradeHandler();
    this.setupEventBusListener();
    this.startHeartbeat();
  }

  /**
   * Configure le handler HTTP Upgrade pour WebSocket
   */
  private setupUpgradeHandler(): void {
    this.fastify.server.on('upgrade', async (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);

      // Ne pas gérer les autres routes WebSocket (ex: Hocuspocus)
      if (url.pathname !== this.path) {
        return;
      }

      try {
        // Extraire le token depuis les query params ou headers
        const token =
          url.searchParams.get('token') ||
          request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          logger.warn('[SyncWS] Connection attempt without token');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Vérifier le JWT
        const payload = await this.verifyToken(token);

        if (!payload) {
          logger.warn('[SyncWS] Invalid token');
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Upgrade la connexion
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const authenticatedSocket = ws as AuthenticatedSocket;
          authenticatedSocket.userId = payload.userId;
          authenticatedSocket.username = payload.username;
          authenticatedSocket.isAlive = true;

          this.wss.emit('connection', authenticatedSocket, request);
        });
      } catch (error) {
        logger.error({ error }, '[SyncWS] Authentication error');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });

    // Gérer les nouvelles connexions
    this.wss.on('connection', (socket: AuthenticatedSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });
  }

  /**
   * Vérifie le token JWT et extrait les informations utilisateur
   */
  private async verifyToken(
    token: string
  ): Promise<{ userId: string; username: string } | null> {
    try {
      const decoded = this.fastify.jwt.verify<{
        userId: string;
        username: string;
        roleId: string;
      }>(token);
      return { userId: decoded.userId, username: decoded.username };
    } catch {
      return null;
    }
  }

  /**
   * Gère une nouvelle connexion WebSocket
   */
  private handleConnection(socket: AuthenticatedSocket, request: IncomingMessage): void {
    this.clients.add(socket);

    logger.info(
      { userId: socket.userId, username: socket.username, clientsCount: this.clients.size },
      '[SyncWS] Client connected'
    );

    // Configurer les handlers du socket
    socket.on('message', (data) => this.handleMessage(socket, data));
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('close', () => this.handleDisconnect(socket));
    socket.on('error', (err) => {
      logger.error({ err, userId: socket.userId }, '[SyncWS] Socket error');
    });

    // Envoyer confirmation de connexion
    this.sendToSocket(socket, {
      type: 'connected',
      userId: socket.userId,
      timestamp: Date.now(),
    });
  }

  /**
   * Gère les messages entrants des clients
   */
  private handleMessage(socket: AuthenticatedSocket, data: RawData): void {
    try {
      const message: SyncClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          socket.isAlive = true;
          this.sendToSocket(socket, { type: 'pong', timestamp: Date.now() });
          break;

        case 'subscribe':
          // Pour l'instant, tous les utilisateurs reçoivent tous les événements
          // Dans une version future, on pourrait filtrer par workspace/folder
          logger.debug({ userId: socket.userId }, '[SyncWS] Client subscribed');
          this.sendToSocket(socket, { type: 'subscribed', timestamp: Date.now() });
          break;

        case 'unsubscribe':
          logger.debug({ userId: socket.userId }, '[SyncWS] Client unsubscribed');
          this.sendToSocket(socket, { type: 'unsubscribed', timestamp: Date.now() });
          break;

        default:
          logger.warn({ message }, '[SyncWS] Unknown message type');
      }
    } catch (error) {
      logger.error({ error }, '[SyncWS] Failed to parse message');
    }
  }

  /**
   * Gère la déconnexion d'un client
   */
  private handleDisconnect(socket: AuthenticatedSocket): void {
    this.clients.delete(socket);

    logger.info(
      { userId: socket.userId, clientsCount: this.clients.size },
      '[SyncWS] Client disconnected'
    );
  }

  /**
   * Configure l'écoute des événements de l'EventBus
   */
  private setupEventBusListener(): void {
    // Écouter tous les événements de synchronisation
    this.eventBus.on('*', (event: SyncEvent) => {
      this.broadcastEvent(event);
    });
  }

  /**
   * Diffuse un événement à tous les clients connectés (sauf l'émetteur)
   */
  private broadcastEvent(event: SyncEvent): void {
    const message: SyncWebSocketMessage = {
      type: 'sync_event',
      event,
      timestamp: Date.now(),
    };

    let sentCount = 0;

    for (const client of this.clients) {
      // Ne pas renvoyer l'événement à l'utilisateur qui l'a déclenché
      if (client.userId === event.userId) {
        continue;
      }

      if (client.readyState === WebSocket.OPEN) {
        this.sendToSocket(client, message);
        sentCount++;
      }
    }

    logger.debug(
      { eventType: event.type, correlationId: event.correlationId, sentCount },
      '[SyncWS] Event broadcasted'
    );
  }

  /**
   * Envoie un message à un socket spécifique
   */
  private sendToSocket(socket: AuthenticatedSocket, data: SyncWebSocketMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  /**
   * Démarre le heartbeat pour détecter les connexions mortes
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          logger.info({ userId: client.userId }, '[SyncWS] Terminating inactive client');
          client.terminate();
          this.clients.delete(client);
          continue;
        }

        client.isAlive = false;
        client.ping();
      }
    }, 30000); // 30 secondes
  }

  /**
   * Ferme le serveur WebSocket proprement
   */
  async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Fermer toutes les connexions
    for (const client of this.clients) {
      client.close(1001, 'Server shutting down');
    }

    this.wss.close();
    logger.info('[SyncWS] Server closed');
  }

  /**
   * Retourne le nombre de clients connectés
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Retourne les informations de tous les clients connectés
   */
  getConnectedUsers(): Array<{ userId: string; username: string }> {
    return Array.from(this.clients).map((client) => ({
      userId: client.userId,
      username: client.username,
    }));
  }
}
