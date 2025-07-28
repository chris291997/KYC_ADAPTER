import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant, Account } from '../database/entities';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import { ProvidersModule } from '../providers/providers.module';
import { FileProcessingService } from '../common/services/file-processing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Account]), AuthModule, ProvidersModule],
  controllers: [VerificationsController],
  providers: [VerificationsService, FileProcessingService],
  exports: [VerificationsService, FileProcessingService],
})
export class VerificationsModule {}
