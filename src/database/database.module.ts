import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Client } from './entities/client.entity';
import { ProviderCredential } from './entities/provider-credential.entity';
import { ClientProviderConfig } from './entities/client-provider-config.entity';
import { VerificationRequest } from './entities/verification-request.entity';
import { VerificationResult } from './entities/verification-result.entity';
import { RateLimitTracking } from './entities/rate-limit-tracking.entity';

import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ProviderCredential,
      ClientProviderConfig,
      VerificationRequest,
      VerificationResult,
      RateLimitTracking,
    ]),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}
