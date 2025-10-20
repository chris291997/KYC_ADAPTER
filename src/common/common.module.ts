import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { FileProcessingService } from './services/file-processing.service';
import { ImgbbService } from './services/imgbb.service';
import { EventBusService } from './services/event-bus.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    FileProcessingService,
    ImgbbService,
    EventBusService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [FileProcessingService, ImgbbService, EventBusService],
})
export class CommonModule {}
