import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Provider configuration class with validation
 */
export class ProviderConfigClass {
  @IsString()
  PROVIDER_API_URL: string;

  @IsString()
  PROVIDER_API_KEY: string;

  @IsString()
  PROVIDER_COMPANY_ID: string;

  @IsNumber()
  @Min(5000)
  @Max(120000)
  @IsOptional()
  PROVIDER_TIMEOUT?: number = 30000;

  @IsString()
  @IsOptional()
  PROVIDER_WEBHOOK_SECRET?: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  PROVIDER_MAX_RETRIES?: number = 3;

  @IsNumber()
  @Min(1000)
  @Max(30000)
  @IsOptional()
  PROVIDER_RETRY_DELAY?: number = 2000;

  @IsBoolean()
  @IsOptional()
  PROVIDER_ENABLE_LOGGING?: boolean = true;

  @IsBoolean()
  @IsOptional()
  PROVIDER_ENABLE_CACHING?: boolean = true;

  @IsNumber()
  @Min(60)
  @Max(86400)
  @IsOptional()
  PROVIDER_CACHE_TTL?: number = 3600; // 1 hour in seconds
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(ProviderConfigClass, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Provider configuration validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}

/**
 * Provider configuration factory
 */
export default registerAs('provider', () => {
  const config = {
    PROVIDER_API_URL: process.env.PROVIDER_API_URL,
    PROVIDER_API_KEY: process.env.PROVIDER_API_KEY,
    PROVIDER_COMPANY_ID: process.env.PROVIDER_COMPANY_ID,
    PROVIDER_TIMEOUT: process.env.PROVIDER_TIMEOUT,
    PROVIDER_WEBHOOK_SECRET: process.env.PROVIDER_WEBHOOK_SECRET,
    PROVIDER_MAX_RETRIES: process.env.PROVIDER_MAX_RETRIES,
    PROVIDER_RETRY_DELAY: process.env.PROVIDER_RETRY_DELAY,
    PROVIDER_ENABLE_LOGGING: process.env.PROVIDER_ENABLE_LOGGING,
    PROVIDER_ENABLE_CACHING: process.env.PROVIDER_ENABLE_CACHING,
    PROVIDER_CACHE_TTL: process.env.PROVIDER_CACHE_TTL,
  };

  return validateProviderConfig(config);
});

