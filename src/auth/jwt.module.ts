import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRefreshToken, TenantRefreshToken } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminRefreshToken, TenantRefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES', '15m'),
          issuer: configService.get<string>('JWT_ISSUER', 'kyc-adapter'),
          audience: [
            configService.get<string>('JWT_AUDIENCE_ADMIN', 'kyc-adapter-admin'),
            configService.get<string>('JWT_AUDIENCE_TENANT', 'kyc-adapter-tenant'),
          ],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule, TypeOrmModule],
})
export class JwtAuthModule {}
