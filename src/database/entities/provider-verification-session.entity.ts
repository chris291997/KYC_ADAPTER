import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Provider } from './provider.entity';
import { Verification } from './verification.entity';
import { ProviderTemplate } from './provider-template.entity';

export enum SessionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('provider_verification_sessions')
@Index(['verificationId'], { unique: true }) // One session per verification
@Index(['providerId'])
@Index(['providerSessionId'])
@Index(['status'])
@Index(['startedAt'])
export class ProviderVerificationSession {
  @ApiProperty({ description: 'Unique session identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Verification this session belongs to' })
  @Column({ type: 'uuid', name: 'verification_id' })
  @IsUUID()
  verificationId: string;

  @ApiProperty({ description: 'Provider this session uses' })
  @Column({ type: 'uuid', name: 'provider_id' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Template used for this session', required: false })
  @Column({ type: 'uuid', name: 'template_id', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: 'Provider-specific session ID' })
  @Column({ type: 'varchar', length: 255, name: 'provider_session_id' })
  @IsString()
  @IsNotEmpty()
  providerSessionId: string;

  @ApiProperty({ description: 'Current processing step (1-indexed)' })
  @Column({ type: 'integer', name: 'current_step', default: 0 })
  @IsNumber()
  @Min(0)
  currentStep: number;

  @ApiProperty({ description: 'Total number of steps in the workflow' })
  @Column({ type: 'integer', name: 'total_steps', default: 0 })
  @IsNumber()
  @Min(0)
  totalSteps: number;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'progress_percentage', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @ApiProperty({ description: 'Last progress message' })
  @Column({ type: 'text', name: 'last_progress_message', nullable: true })
  @IsOptional()
  @IsString()
  lastProgressMessage?: string;

  @ApiProperty({
    description: 'Session status',
    enum: SessionStatus,
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: SessionStatus.PENDING,
    enum: Object.values(SessionStatus),
  })
  @IsIn(Object.values(SessionStatus))
  status: SessionStatus;

  @ApiProperty({ description: 'Detailed step execution log' })
  @Column({ type: 'jsonb', name: 'processing_steps', default: [] })
  @IsOptional()
  processingSteps: Array<{
    step: number;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    result?: any;
    error?: string;
  }>;

  @ApiProperty({ description: 'Session metadata' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Error details if session failed' })
  @Column({ type: 'jsonb', name: 'error_details', nullable: true })
  @IsOptional()
  errorDetails?: {
    code: string;
    message: string;
    step?: number;
    details?: Record<string, any>;
  };

  @ApiProperty({ description: 'Session start timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'started_at', nullable: true })
  @IsOptional()
  startedAt?: Date;

  @ApiProperty({ description: 'Session completion timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'completed_at', nullable: true })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ description: 'Session failure timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'failed_at', nullable: true })
  @IsOptional()
  failedAt?: Date;

  @ApiProperty({ description: 'Session creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => Verification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'verification_id' })
  verification: Verification;

  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => ProviderTemplate, (template) => template.sessions, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template?: ProviderTemplate;

  // Helper methods
  calculateProgress(): number {
    if (this.totalSteps === 0) return 0;
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  updateProgress(step: number, message: string): void {
    this.currentStep = step;
    this.lastProgressMessage = message;
    this.progressPercentage = this.calculateProgress();
  }

  markStepCompleted(step: number, result?: any): void {
    const stepLog = this.processingSteps?.find((s) => s.step === step);
    if (stepLog) {
      stepLog.status = 'completed';
      stepLog.completedAt = new Date();
      stepLog.result = result;
    }
  }

  markStepFailed(step: number, error: string): void {
    const stepLog = this.processingSteps?.find((s) => s.step === step);
    if (stepLog) {
      stepLog.status = 'failed';
      stepLog.completedAt = new Date();
      stepLog.error = error;
    }
  }

  markCompleted(): void {
    this.status = SessionStatus.COMPLETED;
    this.completedAt = new Date();
    this.currentStep = this.totalSteps;
    this.progressPercentage = 100;
  }

  markFailed(error: {
    code: string;
    message: string;
    step?: number;
    details?: Record<string, any>;
  }): void {
    this.status = SessionStatus.FAILED;
    this.failedAt = new Date();
    this.errorDetails = error;
  }

  getDuration(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || this.failedAt || new Date();
    return endTime.getTime() - this.startedAt.getTime();
  }

  isCompleted(): boolean {
    return this.status === SessionStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === SessionStatus.FAILED;
  }

  isInProgress(): boolean {
    return this.status === SessionStatus.IN_PROGRESS;
  }

  isPending(): boolean {
    return this.status === SessionStatus.PENDING;
  }
}
