import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  VerificationEventType,
  EVENT_CHANNELS,
  EventPriority,
  EventMetadata,
} from '../events/verification.events';

/**
 * Event Bus Service
 * Provides pub/sub messaging using Redis for event-driven architecture
 * Enables decoupled communication between services
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private readonly subscribers = new Map<string, Set<(event: any) => void>>();
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  /**
   * Initialize Redis connections for pub/sub
   */
  private async initialize(): Promise<void> {
    try {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      };

      // Create publisher connection
      this.publisher = new Redis(redisConfig);
      this.publisher.on('error', (err) => {
        this.logger.error('Redis publisher error:', err);
      });

      // Create subscriber connection (separate connection required for pub/sub)
      this.subscriber = new Redis(redisConfig);
      this.subscriber.on('error', (err) => {
        this.logger.error('Redis subscriber error:', err);
      });

      // Handle incoming messages
      this.subscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      // Handle pattern-based messages
      this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      this.isInitialized = true;
      this.logger.log('Event Bus initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Event Bus:', error);
      throw error;
    }
  }

  /**
   * Publish an event to a specific channel
   * @param channel Channel name
   * @param event Event payload
   * @param metadata Optional event metadata
   */
  async publish<T extends VerificationEventType>(
    channel: string,
    event: T,
    metadata?: Partial<EventMetadata>,
  ): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Event Bus not initialized, skipping publish');
      return;
    }

    try {
      const eventWithMetadata = {
        ...event,
        _metadata: {
          eventId: uuidv4(),
          channel,
          priority: metadata?.priority || EventPriority.NORMAL,
          timestamp: new Date(),
          publisherId: metadata?.publisherId || 'kyc-adapter',
          correlationId: metadata?.correlationId,
          causationId: metadata?.causationId,
          retryable: metadata?.retryable ?? true,
          ttl: metadata?.ttl,
        },
      };

      const message = JSON.stringify(eventWithMetadata);
      const subscribers = await this.publisher.publish(channel, message);

      this.logger.debug(
        `Published event to channel '${channel}': ${event.eventType} (${subscribers} subscribers)`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish event to channel '${channel}':`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a specific channel
   * @param channel Channel name
   * @param handler Event handler function
   */
  async subscribe<T = any>(channel: string, handler: (event: T) => void): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Event Bus not initialized, skipping subscribe');
      return;
    }

    try {
      // Subscribe to the channel if not already subscribed
      const subscribedChannels = await this.subscriber.subscribe(channel);

      // Store the handler
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
      }
      this.subscribers.get(channel)!.add(handler);

      this.logger.log(`Subscribed to channel '${channel}' (total: ${subscribedChannels})`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel '${channel}':`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channels matching a pattern
   * @param pattern Channel pattern (e.g., 'verification:*')
   * @param handler Event handler function
   */
  async subscribePattern<T = any>(pattern: string, handler: (event: T) => void): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Event Bus not initialized, skipping pattern subscribe');
      return;
    }

    try {
      await this.subscriber.psubscribe(pattern);

      // Store the handler with pattern prefix
      const key = `pattern:${pattern}`;
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Set());
      }
      this.subscribers.get(key)!.add(handler);

      this.logger.log(`Subscribed to pattern '${pattern}'`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to pattern '${pattern}':`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific channel
   * @param channel Channel name
   * @param handler Optional specific handler to remove
   */
  async unsubscribe(channel: string, handler?: (event: any) => void): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (handler) {
        // Remove specific handler
        const handlers = this.subscribers.get(channel);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.subscribers.delete(channel);
            await this.subscriber.unsubscribe(channel);
            this.logger.log(`Unsubscribed from channel '${channel}'`);
          }
        }
      } else {
        // Remove all handlers for this channel
        this.subscribers.delete(channel);
        await this.subscriber.unsubscribe(channel);
        this.logger.log(`Unsubscribed from channel '${channel}'`);
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from channel '${channel}':`, error);
    }
  }

  /**
   * Handle incoming message from Redis
   * @param channel Channel name
   * @param message Message payload
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const event = JSON.parse(message);

      // Execute channel-specific handlers
      const channelHandlers = this.subscribers.get(channel);
      if (channelHandlers) {
        channelHandlers.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            this.logger.error(`Error in event handler for channel '${channel}':`, error);
          }
        });
      }

      // Execute pattern handlers
      this.subscribers.forEach((handlers, key) => {
        if (key.startsWith('pattern:')) {
          handlers.forEach((handler) => {
            try {
              handler(event);
            } catch (error) {
              this.logger.error(`Error in pattern event handler:`, error);
            }
          });
        }
      });
    } catch (error) {
      this.logger.error(`Failed to handle message from channel '${channel}':`, error);
    }
  }

  /**
   * Cleanup Redis connections
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      this.subscribers.clear();
      this.isInitialized = false;
      this.logger.log('Event Bus cleanup completed');
    } catch (error) {
      this.logger.error('Error during Event Bus cleanup:', error);
    }
  }

  /**
   * Get health status of the event bus
   */
  async getHealth(): Promise<{ isHealthy: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { isHealthy: false, error: 'Not initialized' };
      }

      // Ping both connections
      await Promise.all([this.publisher.ping(), this.subscriber.ping()]);

      return { isHealthy: true };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Publish a verification created event
   */
  async publishVerificationCreated(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.VERIFICATION_CREATED, {
      ...event,
      eventType: 'verification.created',
    } as any);
  }

  /**
   * Publish a verification started event
   */
  async publishVerificationStarted(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.VERIFICATION_STARTED, {
      ...event,
      eventType: 'verification.started',
    } as any);
  }

  /**
   * Publish a verification progress event
   */
  async publishVerificationProgress(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.VERIFICATION_PROGRESS, {
      ...event,
      eventType: 'verification.progress',
    } as any);
  }

  /**
   * Publish a step completed event
   */
  async publishStepCompleted(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.STEP_COMPLETED, {
      ...event,
      eventType: 'verification.step.completed',
    } as any);
  }

  /**
   * Publish a verification completed event
   */
  async publishVerificationCompleted(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.VERIFICATION_COMPLETED, {
      ...event,
      eventType: 'verification.completed',
    } as any);
  }

  /**
   * Publish a verification failed event
   */
  async publishVerificationFailed(event: any): Promise<void> {
    await this.publish(EVENT_CHANNELS.VERIFICATION_FAILED, {
      ...event,
      eventType: 'verification.failed',
    } as any);
  }
}
