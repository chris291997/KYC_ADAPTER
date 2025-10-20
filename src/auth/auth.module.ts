import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Tenant,
  Admin,
  ApiKey,
  RefreshToken,
} from '../database/entities';
import { AuthService } from './auth.service';
import { AdminAuthService } from './admin-auth.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { JwtAuthModule } from './jwt.module';
import { JwtService } from './jwt.service';
import { AuthController } from './auth.controller';
import { TenantAuthController } from './tenant-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Admin,
      ApiKey,
      RefreshToken,
    ]),
    JwtAuthModule,
  ],
  controllers: [AuthController, TenantAuthController],
  providers: [
    AuthService,
    AdminAuthService,
    JwtService,
    ApiKeyStrategy,
    JwtStrategy,
    ApiKeyGuard,
    AdminAuthGuard,
  ],
  exports: [AuthService, AdminAuthService, JwtService, ApiKeyGuard, AdminAuthGuard],
})
export class AuthModule {}
