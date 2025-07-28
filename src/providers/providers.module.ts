import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../database/entities';
import { ProvidersFactory } from './providers.factory';
import { ProvidersInitializationService } from './providers-initialization.service';
import { AdminProvidersController } from './admin-providers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [AdminProvidersController],
  providers: [ProvidersFactory, ProvidersInitializationService],
  exports: [ProvidersFactory, ProvidersInitializationService],
})
export class ProvidersModule {}
