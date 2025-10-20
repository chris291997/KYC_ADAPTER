import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import * as winston from 'winston';

// Import modules
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './queue/queue.module';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { VerificationsModule } from './verifications/verifications.module';
import { Tenant } from './database/entities';

// Import controllers and services
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  AdminAnalyticsController,
  AdminTenantsAnalyticsController,
} from './admin/admin-analytics.controller';

// Import guards
import { ApiKeyGuard } from './auth/guards/api-key.guard';
import { AdminAuthGuard } from './auth/guards/admin-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'env.example'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'kyc_adapter',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Disabled to prevent startup conflicts
        logging: process.env.NODE_ENV === 'development',
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),

    // Application modules
    DatabaseModule,
    CommonModule,
    QueueModule, // Event-driven async processing
    ProvidersModule,
    AuthModule,
    TenantsModule,
    VerificationsModule,

    // Repositories used directly in controllers declared here
    TypeOrmModule.forFeature([Tenant]),

    // TODO: Add these modules when they're created
    // HealthModule,
    // WebSocketModule, (Day 3)
  ],
  controllers: [AppController, AdminAnalyticsController, AdminTenantsAnalyticsController],
  providers: [
    AppService,
    // Global guards (order matters - admin auth first, then tenant auth)
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
