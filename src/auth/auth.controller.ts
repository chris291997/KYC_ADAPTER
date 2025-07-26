import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExtraModels } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from './guards/api-key.guard';
import { AdminAuthService } from './admin-auth.service';
import { JwtService } from './jwt.service';
import {
  LoginDto,
  RefreshTokenDto,
  LoginResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
} from './dto/auth.dto';

@ApiTags('Authentication Admin')
@ApiExtraModels(LoginResponseDto, RefreshResponseDto, LogoutResponseDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin Login',
    description: `
      Authenticate an admin user with email and password to receive JWT access and refresh tokens.
      
      **Authentication Flow:**
      1. Provide admin email and password
      2. Receive access token (15 minutes) and refresh token (7 days)
      3. Use access token in Authorization header for protected endpoints
      4. Use refresh token to get new access tokens when expired
      
      **Default Admin Credentials:**
      - Email: admin@kyc-adapter.dev
      - Password: admin123
      - Role: super_admin
    `,
  })
  @ApiBody({
    type: LoginDto,
    description: 'Admin login credentials',
    examples: {
      defaultAdmin: {
        summary: 'Default Admin',
        description: 'Login with the default development admin account',
        value: {
          email: 'admin@kyc-adapter.dev',
          password: 'admin123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT access token and refresh token',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials - Wrong email or password',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - Invalid request format',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    // Find admin by email
    const admin = await this.adminAuthService.findAdminByEmail(loginDto.email);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await admin.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if admin is active
    if (!admin.isActive()) {
      throw new UnauthorizedException('Admin account is not active');
    }

    // Generate JWT tokens
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    const tokens = await this.jwtService.generateTokens(admin, userAgent, ipAddress);

    // Update last login timestamp
    admin.lastLoginAt = new Date();
    await this.adminAuthService.saveAdmin(admin);

    return {
      ...tokens,
      tokenType: 'Bearer',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Access Token',
    description: `
      Exchange a valid refresh token for a new access token and refresh token pair.
      
      **When to Use:**
      - When access token expires (every 15 minutes)
      - To maintain user session without re-login
      - For long-running applications
      
      **Security Notes:**
      - Old refresh token is automatically revoked
      - New refresh token has extended expiry (7 days)
      - Tracks device and IP for security
    `,
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token obtained from login',
    examples: {
      refreshToken: {
        summary: 'Refresh Token Request',
        description: 'Use the refresh token from login response',
        value: {
          refreshToken: '3217702fda5cab0b558d11c357f8b11e88c0a97c652788d599aced5d1b3cb97',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully - Returns new access and refresh tokens',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<RefreshResponseDto> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const tokens = await this.jwtService.refreshAccessToken(
      refreshDto.refreshToken,
      userAgent,
      ipAddress,
    );

    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout Admin',
    description: `
      Revoke a refresh token to log out the admin user from a specific device/session.
      
      **What This Does:**
      - Invalidates the provided refresh token
      - Prevents further use of the refresh token
      - Does not affect access tokens (they expire naturally)
      
      **Best Practices:**
      - Call this when user explicitly logs out
      - For complete logout from all devices, use logout-all endpoint
      - Consider calling this on app close/unload events
    `,
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token to revoke',
    examples: {
      logout: {
        summary: 'Logout Request',
        description: 'Provide the refresh token to invalidate',
        value: {
          refreshToken: '3217702fda5cab0b558d11c357f8b11e88c0a97c652788d599aced5d1b3cb97',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful - Refresh token revoked',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token provided',
  })
  async logout(@Body() logoutDto: RefreshTokenDto): Promise<LogoutResponseDto> {
    await this.jwtService.revokeRefreshToken(logoutDto.refreshToken);

    return {
      message: 'Logout successful',
    };
  }
}
