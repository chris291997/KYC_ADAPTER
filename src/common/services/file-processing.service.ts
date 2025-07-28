import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

export interface ProcessedFile {
  originalName: string;
  mimeType: string;
  size: number;
  base64: string;
  width?: number;
  height?: number;
  tempPath: string;
}

export interface FileProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToJpeg?: boolean;
  generateThumbnail?: boolean;
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private readonly tempDir = join(process.cwd(), 'temp', 'uploads');

  constructor() {
    this.ensureTempDirectory();
  }

  /**
   * Process uploaded files for verification
   * Converts to base64, optimizes images, and handles cleanup
   */
  async processVerificationFiles(
    files: { [fieldname: string]: Express.Multer.File[] },
    options: FileProcessingOptions = {},
  ): Promise<{ [fieldname: string]: ProcessedFile }> {
    this.logger.log(`Processing ${Object.keys(files).length} file fields for verification`);

    const processedFiles: { [fieldname: string]: ProcessedFile } = {};

    try {
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0]; // Take first file for each field
          processedFiles[fieldName] = await this.processFile(file, options);
        }
      }

      this.logger.log(`Successfully processed ${Object.keys(processedFiles).length} files`);
      return processedFiles;
    } catch (error) {
      this.logger.error(`File processing failed: ${error.message}`, error.stack);
      // Cleanup any processed files on error
      await this.cleanupFiles(Object.values(processedFiles));
      throw error;
    }
  }

  /**
   * Process a single file
   */
  private async processFile(
    file: Express.Multer.File,
    options: FileProcessingOptions,
  ): Promise<ProcessedFile> {
    const tempPath = await this.saveTemporaryFile(file);

    try {
      let processedBuffer: Buffer;
      let finalMimeType = file.mimetype;
      let width: number | undefined;
      let height: number | undefined;

      if (this.isImageFile(file.mimetype)) {
        // Process image with sharp
        const result = await this.processImage(tempPath, options);
        processedBuffer = result.buffer;
        width = result.width;
        height = result.height;
        finalMimeType = options.convertToJpeg ? 'image/jpeg' : file.mimetype;
      } else {
        // For non-image files (PDFs), read as-is
        processedBuffer = await fs.readFile(tempPath);
      }

      // Convert to base64
      const base64 = `data:${finalMimeType};base64,${processedBuffer.toString('base64')}`;

      return {
        originalName: file.originalname,
        mimeType: finalMimeType,
        size: processedBuffer.length,
        base64,
        width,
        height,
        tempPath,
      };
    } catch (error) {
      // Cleanup temp file on error
      await this.cleanupFile(tempPath);
      throw new BadRequestException(
        `Failed to process file "${file.originalname}": ${error.message}`,
      );
    }
  }

  /**
   * Process image with optimization
   */
  private async processImage(
    filePath: string,
    options: FileProcessingOptions,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    let pipeline = sharp(filePath);

    // Get metadata
    const metadata = await pipeline.metadata();
    let { width, height } = metadata;

    // Resize if needed
    const maxWidth = options.maxWidth || 2048;
    const maxHeight = options.maxHeight || 2048;

    if (width && height && (width > maxWidth || height > maxHeight)) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Update dimensions after resize
      const resizeInfo = await pipeline.clone().metadata();
      width = resizeInfo.width;
      height = resizeInfo.height;
    }

    // Convert format if requested
    if (options.convertToJpeg) {
      pipeline = pipeline.jpeg({
        quality: options.quality || 85,
        progressive: true,
      });
    }

    const buffer = await pipeline.toBuffer();

    return {
      buffer,
      width: width || 0,
      height: height || 0,
    };
  }

  /**
   * Save uploaded file to temporary location
   */
  private async saveTemporaryFile(file: Express.Multer.File): Promise<string> {
    const fileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}_${file.originalname}`;
    const tempPath = join(this.tempDir, fileName);

    await fs.writeFile(tempPath, file.buffer);

    this.logger.debug(`Saved temporary file: ${tempPath}`);
    return tempPath;
  }

  /**
   * Clean up temporary files
   */
  async cleanupFiles(files: ProcessedFile[]): Promise<void> {
    const cleanupPromises = files.map((file) => this.cleanupFile(file.tempPath));
    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Clean up a single temporary file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create temp directory: ${error.message}`);
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Get file info without processing
   */
  getFileInfo(file: Express.Multer.File): { name: string; size: string; type: string } {
    return {
      name: file.originalname,
      size: `${Math.round(file.size / 1024)}KB`,
      type: file.mimetype,
    };
  }
}
