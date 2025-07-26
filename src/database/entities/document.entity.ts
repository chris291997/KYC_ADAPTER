import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsOptional, IsNumber } from 'class-validator';
import { Account } from './account.entity';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'approved'
  | 'rejected'
  | 'deleted';

@Entity('documents')
@Index(['accountId'])
@Index(['inquiryId'])
@Index(['verificationId'])
@Index(['kind'])
@Index(['status'])
export class Document {
  @ApiProperty({ description: 'Unique document identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Account ID this document belongs to' })
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ApiProperty({ description: 'Inquiry ID this document belongs to' })
  @Column({ type: 'uuid', name: 'inquiry_id' })
  inquiryId: string;

  @ApiProperty({ description: 'Verification ID this document belongs to', required: false })
  @Column({ type: 'uuid', nullable: true, name: 'verification_id' })
  @IsOptional()
  verificationId?: string;

  @ApiProperty({
    description: 'Document status',
    enum: ['uploaded', 'processing', 'processed', 'approved', 'rejected', 'deleted'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'uploaded',
    enum: ['uploaded', 'processing', 'processed', 'approved', 'rejected', 'deleted'],
  })
  @IsIn(['uploaded', 'processing', 'processed', 'approved', 'rejected', 'deleted'])
  status: DocumentStatus;

  @ApiProperty({ description: 'Document type/kind' })
  @Column({ type: 'varchar', length: 50 })
  @IsString()
  kind: string;

  @ApiProperty({ description: 'Stored filename' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Original uploaded filename', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'original_filename' })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiProperty({ description: 'File storage path or URL', required: false })
  @Column({ type: 'text', nullable: true, name: 'file_path' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ type: 'integer', name: 'byte_size' })
  @IsNumber()
  byteSize: number;

  @ApiProperty({ description: 'MIME type' })
  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File checksum for integrity', required: false })
  @Column({ type: 'varchar', length: 64, nullable: true })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiProperty({ description: 'Extracted document data (OCR, etc.)', required: false })
  @Column({ type: 'jsonb', nullable: true, name: 'extracted_data' })
  @IsOptional()
  extractedData?: Record<string, any>;

  @ApiProperty({ description: 'Document creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Account, (account) => account.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  // Helper methods
  isProcessed(): boolean {
    return ['processed', 'approved', 'rejected'].includes(this.status);
  }

  isApproved(): boolean {
    return this.status === 'approved';
  }

  getDisplayName(): string {
    return this.originalFilename || this.filename;
  }

  getFileExtension(): string {
    const name = this.originalFilename || this.filename;
    return name.split('.').pop()?.toLowerCase() || '';
  }
}
