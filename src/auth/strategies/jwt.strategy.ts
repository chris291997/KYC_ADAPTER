import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminAuthService } from '../admin-auth.service';
import { JwtPayload } from '../jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'kyc-adapter',
      audience: 'kyc-adapter-admin',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // Get admin from database to ensure they still exist and are active
    const admin = await this.adminAuthService.getAdminById(payload.sub);

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    if (!admin.isActive()) {
      throw new UnauthorizedException('Admin account is not active');
    }

    // Update last login timestamp
    admin.lastLoginAt = new Date();

    // Return admin info for use in guards/decorators
    return {
      admin,
      type: 'admin_jwt',
      jwtPayload: payload,
    };
  }
}
