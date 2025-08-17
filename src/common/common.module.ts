import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FileProcessingService } from './services/file-processing.service';
import { ImgbbService } from './services/imgbb.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Global()
@Module({
  providers: [
    FileProcessingService,
    ImgbbService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [FileProcessingService, ImgbbService],
})
export class CommonModule {}
