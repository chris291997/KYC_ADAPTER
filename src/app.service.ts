import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getApiInfo() {
    return {
      name: this.configService.get('APP_NAME', 'KYC-Adapter'),
      version: this.configService.get('API_VERSION', 'v1'),
      description: 'Identity verification adapter for multiple KYC providers',
      environment: this.configService.get('NODE_ENV', 'development'),
      documentation: `/api/${this.configService.get('API_VERSION', 'v1')}/docs`,
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: this.configService.get('API_VERSION', 'v1'),
    };
  }
}
