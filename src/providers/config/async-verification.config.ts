import { registerAs } from '@nestjs/config';
import { IsBoolean, IsNumber, IsOptional, Min, Max, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Async verification configuration class with validation
 */
export class AsyncVerificationConfigClass {
  @IsBoolean()
  @IsOptional()
  ENABLE_WEBHOOKS?: boolean = true;

  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  WEBHOOK_RETRY_ATTEMPTS?: number = 3;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  @IsOptional()
  WEBHOOK_RETRY_DELAY?: number = 5000; // 5 seconds

  @IsNumber()
  @Min(30000)
  @Max(3600000)
  @IsOptional()
  JOB_TIMEOUT?: number = 300000; // 5 minutes

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  MAX_JOB_RETRIES?: number = 3;

  @IsBoolean()
  @IsOptional()
  ENABLE_REALTIME_UPDATES?: boolean = true;

  @IsNumber()
  @Min(500)
  @Max(10000)
  @IsOptional()
  PROGRESS_UPDATE_INTERVAL?: number = 2000; // 2 seconds

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  QUEUE_CONCURRENCY?: number = 5;
}

/**
 * Validate async verification configuration
 */
export function validateAsyncVerificationConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(AsyncVerificationConfigClass, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Async verification configuration validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}

/**
 * Async verification configuration factory
 */
export default registerAs('asyncVerification', () => {
  const config = {
    ENABLE_WEBHOOKS: process.env.ENABLE_WEBHOOKS !== 'false',
    WEBHOOK_RETRY_ATTEMPTS: process.env.WEBHOOK_RETRY_ATTEMPTS || 3,
    WEBHOOK_RETRY_DELAY: process.env.WEBHOOK_RETRY_DELAY || 5000,
    JOB_TIMEOUT: process.env.QUEUE_JOB_TIMEOUT || 300000,
    MAX_JOB_RETRIES: process.env.QUEUE_MAX_RETRIES || 3,
    ENABLE_REALTIME_UPDATES: process.env.ENABLE_REALTIME_UPDATES !== 'false',
    PROGRESS_UPDATE_INTERVAL: process.env.PROGRESS_UPDATE_INTERVAL || 2000,
    QUEUE_CONCURRENCY: process.env.QUEUE_VERIFICATION_CONCURRENCY || 5,
  };

  return validateAsyncVerificationConfig(config);
});
