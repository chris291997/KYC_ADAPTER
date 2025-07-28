import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export interface FileUploadOptions {
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
  maxFiles?: number;
  requiredFields?: string[];
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  constructor(private readonly options: FileUploadOptions = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const files = request.files as
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] };

    // Validate uploaded files
    this.validateFiles(files);

    return next.handle();
  }

  private validateFiles(
    files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined,
  ): void {
    if (!files) {
      if (this.options.requiredFields && this.options.requiredFields.length > 0) {
        throw new BadRequestException(
          `Required file fields: ${this.options.requiredFields.join(', ')}`,
        );
      }
      return;
    }

    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
    const maxFileSize = this.options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    const allowedMimeTypes = this.options.allowedMimeTypes || [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'application/pdf',
    ];
    const maxFiles = this.options.maxFiles || 5;

    // Check file count
    if (fileArray.length > maxFiles) {
      throw new BadRequestException(`Too many files. Maximum allowed: ${maxFiles}`);
    }

    // Validate each file
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File "${file.originalname}" is too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        );
      }

      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File "${file.originalname}" has unsupported format. Allowed: ${allowedMimeTypes.join(', ')}`,
        );
      }

      // Check if file is empty
      if (file.size === 0) {
        throw new BadRequestException(`File "${file.originalname}" is empty`);
      }

      // Basic file name validation
      if (!file.originalname || file.originalname.length > 255) {
        throw new BadRequestException(`Invalid file name: "${file.originalname}"`);
      }
    }

    // Check required fields
    if (this.options.requiredFields) {
      const fileFields = Array.isArray(files) ? [] : Object.keys(files);
      const missingFields = this.options.requiredFields.filter(
        (field) => !fileFields.includes(field),
      );

      if (missingFields.length > 0) {
        throw new BadRequestException(`Missing required file fields: ${missingFields.join(', ')}`);
      }
    }
  }
}
