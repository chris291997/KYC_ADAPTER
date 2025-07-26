import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/guards/api-key.guard';
import { CurrentTenant, GetTenant } from './auth/decorators/current-tenant.decorator';
import { Tenant } from './database/entities';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Health status' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('auth-test')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test authenticated endpoint' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  testAuth(@GetTenant() tenant: Tenant, @CurrentTenant() auth: any) {
    return {
      message: 'Authentication successful!',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
      },
      apiKey: {
        id: auth.apiKey.id,
        name: auth.apiKey.name,
        status: auth.apiKey.status,
        lastUsedAt: auth.apiKey.lastUsedAt,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
