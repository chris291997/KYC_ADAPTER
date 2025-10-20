import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Queue Module
 * Configures Bull queue with Redis for async job processing
 */
@Module({
  imports: [
    // Configure Bull with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,
        },
        defaultJobOptions: {
          attempts: configService.get<number>('QUEUE_MAX_RETRIES', 3),
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
        settings: {
          lockDuration: 30000, // 30 seconds
          lockRenewTime: 15000, // Renew lock every 15 seconds
          stalledInterval: 30000, // Check for stalled jobs every 30 seconds
          maxStalledCount: 1, // Job is permanently failed after 1 stall
        },
      }),
      inject: [ConfigService],
    }),

    // Register the verifications queue
    BullModule.registerQueue({
      name: 'verifications',
      defaultJobOptions: {
        timeout: 300000, // 5 minutes (can be overridden per job)
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

