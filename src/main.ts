import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

/**
 * Bootstrap function to start the KYC Adapter application
 *
 * Features:
 * - Multi-tenant authentication (JWT + API keys)
 * - Comprehensive security middleware
 * - Interactive API documentation
 * - Request validation and transformation
 * - Performance optimizations
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ========================
  // SECURITY MIDDLEWARE
  // ========================

  // Security headers and protection
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow Swagger UI embedding
    }),
  );

  // Response compression for better performance
  app.use(compression());

  // ========================
  // CORS CONFIGURATION
  // ========================

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Admin-API-Key',
      'X-Requested-With',
    ],
    credentials: true,
  });

  // ========================
  // GLOBAL CONFIGURATION
  // ========================

  // API prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Global validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert string numbers to numbers
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Trust proxy for correct IP addresses
  if (configService.get<boolean>('TRUST_PROXY', false)) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // ========================
  // API DOCUMENTATION
  // ========================

  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);
  const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api/docs');

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('KYC Adapter API')
      .setDescription(
        `
        ## KYC Adapter - Multi-Tenant Identity Verification Platform
        
        A comprehensive NestJS backend that provides a unified API for integrating 
        multiple KYC (Know Your Customer) providers. Supports both admin and tenant 
        authentication with JWT and API key methods.
        
        ### Authentication Methods
        
        **Admin Authentication:**
        - JWT Bearer Token: Login with email/password to get access token
        - API Key: Use \`kya_admin_*\` format keys
        
        **Tenant Authentication:**
        - JWT Bearer Token: Login with email/password to get access token  
        - API Key: Use \`kya_*\` format keys
        
        ### Default Credentials
        
        **Admin Account:**
        - Email: admin@kyc-adapter.dev
        - Password: admin123
        
        **Test Tenant:**
        - Email: test@kyc-adapter.dev
        - Password: tenant123
        
        ### Response Format
        
        All responses follow a standardized format with success/error status,
        data payload, timestamp, and request ID for tracking.
      `,
      )
      .setVersion('1.0.0')
      .setContact(
        'KYC Adapter Development Team',
        'https://github.com/your-org/kyc-adapter',
        'dev@kyc-adapter.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')

      // Admin Authentication Options
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Admin JWT Token',
          description: 'JWT access token obtained from admin login',
          in: 'header',
        },
        'admin-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-Admin-API-Key',
          in: 'header',
          description: 'Admin API key in format: kya_admin_...',
        },
        'admin-api-key',
      )

      // Tenant Authentication Options
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Tenant JWT Token',
          description: 'JWT access token obtained from tenant login',
          in: 'header',
        },
        'tenant-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'Tenant API key in format: kya_...',
        },
        'tenant-api-key',
      )

      // Servers
      .addServer('http://localhost:3000', 'Development Server')
      .addServer('https://api.kyc-adapter.com', 'Production Server')

      // Tags for organization
      .addTag('Admin - Tenant Management', 'Admin operations for managing tenants')
      .addTag('Tenant - Identity Verification', 'Tenant identity verification operations')
      .addTag('API Keys', 'API key management operations')
      .addTag('Future KYC', 'Planned KYC verification endpoints')
      .addTag('Authentication Tenant', 'Tenant authentication endpoints')
      .addTag('Authentication Admin', 'Admin authentication endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
      },
      customSiteTitle: 'KYC Adapter API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { color: #2c3e50; }
      `,
    });

    logger.log(`📚 API Documentation available at: /${swaggerPath}`);
  }

  // ========================
  // START SERVER
  // ========================

  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  await app.listen(port);

  // ========================
  // STARTUP INFORMATION
  // ========================

  const appUrl = `http://localhost:${port}`;

  logger.log(`🚀 KYC Adapter Server started successfully!`);
  logger.log(`📍 Environment: ${nodeEnv}`);
  logger.log(`🌐 Server URL: ${appUrl}`);
  logger.log(`📋 API Base: ${appUrl}/api/v1`);

  if (swaggerEnabled) {
    logger.log(`📚 API Docs: ${appUrl}/${swaggerPath}`);
  }

  logger.log(`🔐 Admin Email: admin@kyc-adapter.dev`);
  logger.log(`🔐 Tenant Email: test@kyc-adapter.dev`);

  if (nodeEnv === 'development') {
    logger.warn(`⚠️  Development mode - Change default passwords in production!`);
  }

  // ========================
  // GRACEFUL SHUTDOWN
  // ========================

  process.on('SIGTERM', async () => {
    logger.log('🛑 SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('🛑 SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

// Start the application
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application:', error);
  process.exit(1);
});
