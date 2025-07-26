import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from './guards/api-key.guard';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import {
  TenantLoginDto,
  TenantRefreshTokenDto,
  TenantLoginResponseDto,
  TenantRefreshResponseDto,
  TenantLogoutResponseDto,
} from './dto/tenant-auth.dto';

@ApiTags('Authentication Tenant')
@ApiExtraModels(TenantLoginResponseDto, TenantRefreshResponseDto, TenantLogoutResponseDto)
@Controller('tenant/auth')
export class TenantAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tenant Login',
    description: `
      Authenticate a tenant user with email and password to receive JWT access and refresh tokens.
      
      **Authentication Flow:**
      1. Provide tenant email and password
      2. Receive access token (15 minutes) and refresh token (7 days)
      3. Use access token in Authorization header for tenant-specific operations
      4. Use refresh token to get new access tokens when expired
      
      **Default Tenant Credentials:**
      - Email: test@kyc-adapter.dev
      - Password: tenant123
      - Status: active
      
      **Use Cases:**
      - Web applications with user sessions
      - Mobile apps requiring re-authentication
      - Dashboard applications for tenant users
    `,
  })
  @ApiBody({
    type: TenantLoginDto,
    description: 'Tenant login credentials',
    examples: {
      defaultTenant: {
        summary: 'Default Test Tenant',
        description: 'Login with the default development tenant account',
        value: {
          email: 'test@kyc-adapter.dev',
          password: 'tenant123',
        },
      },
      customTenant: {
        summary: 'Custom Tenant',
        description: 'Example of a custom tenant login',
        value: {
          email: 'demo@company.com',
          password: 'secure-password',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT access token and refresh token',
    type: TenantLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication failed - Invalid credentials or inactive account',
  })
  async login(
    @Body() loginDto: TenantLoginDto,
    @Req() req: Request,
  ): Promise<TenantLoginResponseDto> {
    // Find tenant by email
    const tenant = await this.authService.findTenantByEmail(loginDto.email);
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await tenant.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if tenant is active
    if (!tenant.isActive()) {
      throw new UnauthorizedException('Tenant account is not active');
    }

    // Generate JWT tokens
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    const tokens = await this.jwtService.generateTenantTokens(tenant, userAgent, ipAddress);

    return {
      ...tokens,
      tokenType: 'Bearer',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
      },
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh Tenant Access Token',
    description: `
      Exchange a valid tenant refresh token for a new access token and refresh token pair.
      
      **Token Lifecycle:**
      - Access tokens expire every 15 minutes
      - Refresh tokens are valid for 7 days
      - Each refresh invalidates the old refresh token
      - New tokens maintain the same tenant context
    `,
  })
  @ApiBody({
    type: TenantRefreshTokenDto,
    description: 'Tenant refresh token from login response',
    examples: {
      refreshToken: {
        summary: 'Tenant Refresh Request',
        value: {
          refreshToken: 'b7e4f1a8c5d2f9e6a3c8d5f2b9e6a1d4c7f2a5b8e1d4c7f2a9e6c3f8b5e2a9',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TenantRefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() refreshDto: TenantRefreshTokenDto,
    @Req() req: Request,
  ): Promise<TenantRefreshResponseDto> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const tokens = await this.jwtService.refreshTenantAccessToken(
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
    summary: 'Logout Tenant (Single Device)',
    description: `
      Revoke a specific refresh token to log out the tenant from one device/session.
      
      **Single Device Logout:**
      - Invalidates only the provided refresh token
      - Other devices/sessions remain active
      - Access tokens continue to work until natural expiry
      
      **Security Benefits:**
      - Prevents token reuse if compromised
      - Allows granular session management
      - Maintains security across multiple devices
    `,
  })
  @ApiBody({
    type: TenantRefreshTokenDto,
    description: 'Refresh token to revoke for this session',
    examples: {
      logout: {
        summary: 'Single Device Logout',
        value: {
          refreshToken: 'b7e4f1a8c5d2f9e6a3c8d5f2b9e6a1d4c7f2a5b8e1d4c7f2a9e6c3f8b5e2a9',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful - Specific refresh token revoked',
    type: TenantLogoutResponseDto,
  })
  async logout(@Body() logoutDto: TenantRefreshTokenDto): Promise<TenantLogoutResponseDto> {
    await this.jwtService.revokeTenantRefreshToken(logoutDto.refreshToken);

    return {
      message: 'Logout successful',
    };
  }

  @Post('logout-all')
  @ApiBearerAuth('tenant-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout From All Devices',
    description: `
      Revoke ALL refresh tokens for the authenticated tenant, logging them out from every device.
      
      **Global Logout:**
      - Requires valid access token (JWT or API key)
      - Invalidates all refresh tokens for the tenant
      - Forces re-authentication on all devices
      - Immediate security response capability
      
      **Use Cases:**
      - Security breach response
      - Password change follow-up
      - Account compromise protection
      - Administrative security action
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out from all devices',
    type: TenantLogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required - Valid JWT token needed',
  })
  async logoutAll(@Req() req: any): Promise<TenantLogoutResponseDto> {
    // Extract tenant from authenticated request
    const tenantId = req.user?.sub || req.tenant?.id;

    if (!tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.jwtService.revokeAllTenantRefreshTokens(tenantId);

    return {
      message: 'Logged out from all devices',
    };
  }
}
