import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

@Entity('webhook_deliveries')
@Index(['webhookId'])
@Index(['status'])
@Index(['eventType'])
export class WebhookDelivery {
  @ApiProperty({ description: 'Unique delivery identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Webhook ID this delivery belongs to' })
  @Column({ type: 'uuid', name: 'webhook_id' })
  webhookId: string;

  @ApiProperty({ description: 'Event type that triggered the webhook' })
  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Webhook payload data' })
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @ApiProperty({
    description: 'Delivery status',
    enum: ['pending', 'delivered', 'failed', 'retrying'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    enum: ['pending', 'delivered', 'failed', 'retrying'],
  })
  @IsIn(['pending', 'delivered', 'failed', 'retrying'])
  status: WebhookDeliveryStatus;

  @ApiProperty({ description: 'HTTP response status code', required: false })
  @Column({ type: 'integer', nullable: true, name: 'response_status_code' })
  @IsOptional()
  @IsNumber()
  responseStatusCode?: number;

  @ApiProperty({ description: 'HTTP response body', required: false })
  @Column({ type: 'text', nullable: true, name: 'response_body' })
  @IsOptional()
  @IsString()
  responseBody?: string;

  @ApiProperty({ description: 'Number of delivery attempts' })
  @Column({ type: 'integer', default: 0 })
  @IsNumber()
  attempts: number;

  @ApiProperty({ description: 'Last attempt timestamp', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'last_attempt_at' })
  @IsOptional()
  @IsDateString()
  lastAttemptAt?: Date;

  @ApiProperty({ description: 'Successful delivery timestamp', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'delivered_at' })
  @IsOptional()
  @IsDateString()
  deliveredAt?: Date;

  @ApiProperty({ description: 'Delivery creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  // Helper methods
  isDelivered(): boolean {
    return this.status === 'delivered';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  canRetry(maxAttempts: number): boolean {
    return this.attempts < maxAttempts && this.status !== 'delivered';
  }

  markAsDelivered(statusCode: number, responseBody?: string): void {
    this.status = 'delivered';
    this.responseStatusCode = statusCode;
    this.responseBody = responseBody;
    this.deliveredAt = new Date();
  }

  markAsFailed(statusCode?: number, responseBody?: string): void {
    this.status = 'failed';
    this.responseStatusCode = statusCode;
    this.responseBody = responseBody;
    this.lastAttemptAt = new Date();
  }
}
