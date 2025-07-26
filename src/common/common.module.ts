import { Module } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Module({
  providers: [AllExceptionsFilter, LoggingInterceptor, TransformInterceptor],
  exports: [AllExceptionsFilter, LoggingInterceptor, TransformInterceptor],
})
export class CommonModule {}
