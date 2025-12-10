// ===========================================
// EventBus Redis PubSub
// Gestion des événements de synchronisation temps réel
// ===========================================

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { SyncEvent } from '@plumenote/types';
import { SyncEventType } from '@plumenote/types';
import { logger } from '../../lib/logger.js';
import { config } from '../../config/index.js';

const REDIS_CHANNEL = 'plumenote:sync';

/**
 * EventBus basé sur Redis PubSub pour la propagation des événements
 * de synchronisation entre instances du backend
 */
export class EventBus extends EventEmitter {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;

  constructor(private redisUrl: string) {
    super();
    this.setMaxListeners(100); // Support many listeners for different event types
  }

  /**
   * Initialise les connexions Redis pour pub/sub
   */
  async connect(): Promise<void> {
    try {
      // Publisher pour émettre les événements
      this.publisher = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > this.maxConnectionAttempts) {
            logger.warn('[EventBus] Max connection attempts reached for publisher');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      // Subscriber pour recevoir les événements
      this.subscriber = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > this.maxConnectionAttempts) {
            logger.warn('[EventBus] Max connection attempts reached for subscriber');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      await this.publisher.connect();
      await this.subscriber.connect();

      this.setupSubscriber();
      this.setupErrorHandlers();

      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('[EventBus] Connected successfully');
    } catch (error) {
      logger.error({ error }, '[EventBus] Failed to connect');
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Configure le subscriber pour écouter les événements
   */
  private setupSubscriber(): void {
    if (!this.subscriber) return;

    this.subscriber.subscribe(REDIS_CHANNEL, (err) => {
      if (err) {
        logger.error({ err }, '[EventBus] Failed to subscribe to channel');
        return;
      }
      logger.info(`[EventBus] Subscribed to channel: ${REDIS_CHANNEL}`);
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel !== REDIS_CHANNEL) return;

      try {
        const event: SyncEvent = JSON.parse(message);

        // Émettre l'événement aux listeners locaux
        this.emit(event.type, event);
        this.emit('*', event); // Wildcard pour le broadcast global

        logger.debug({ eventType: event.type, correlationId: event.correlationId }, '[EventBus] Event received');
      } catch (error) {
        logger.error({ error, message }, '[EventBus] Failed to parse event message');
      }
    });
  }

  /**
   * Configure les handlers d'erreur pour les connexions Redis
   */
  private setupErrorHandlers(): void {
    this.publisher?.on('error', (err) => {
      logger.error({ err }, '[EventBus] Publisher error');
    });

    this.publisher?.on('reconnecting', () => {
      logger.info('[EventBus] Publisher reconnecting...');
    });

    this.subscriber?.on('error', (err) => {
      logger.error({ err }, '[EventBus] Subscriber error');
    });

    this.subscriber?.on('reconnecting', () => {
      logger.info('[EventBus] Subscriber reconnecting...');
    });
  }

  /**
   * Publie un événement sur le canal Redis
   */
  async publish<T>(event: Omit<SyncEvent<T>, 'timestamp' | 'correlationId'>): Promise<void> {
    if (!this.publisher || !this.isConnected) {
      logger.warn('[EventBus] Cannot publish: not connected');
      return;
    }

    const fullEvent: SyncEvent<T> = {
      ...event,
      timestamp: Date.now(),
      correlationId: randomUUID(),
    };

    try {
      await this.publisher.publish(REDIS_CHANNEL, JSON.stringify(fullEvent));
      logger.debug(
        { eventType: fullEvent.type, correlationId: fullEvent.correlationId },
        '[EventBus] Event published'
      );
    } catch (error) {
      logger.error({ error, event: fullEvent }, '[EventBus] Failed to publish event');
    }
  }

  /**
   * Ferme les connexions Redis proprement
   */
  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(REDIS_CHANNEL);
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }

    this.isConnected = false;
    logger.info('[EventBus] Connections closed');
  }

  /**
   * Retourne l'état de la connexion
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// ===========================================
// Singleton
// ===========================================

let eventBusInstance: EventBus | null = null;

/**
 * Crée et initialise l'instance EventBus singleton
 */
export async function initEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(config.redisUrl);
    await eventBusInstance.connect();
  }
  return eventBusInstance;
}

/**
 * Retourne l'instance EventBus existante
 * @throws Error si l'EventBus n'est pas initialisé
 */
export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    throw new Error('EventBus not initialized. Call initEventBus first.');
  }
  return eventBusInstance;
}

/**
 * Ferme l'EventBus et libère les ressources
 */
export async function closeEventBus(): Promise<void> {
  if (eventBusInstance) {
    await eventBusInstance.close();
    eventBusInstance = null;
  }
}
