import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min } from 'class-validator';

import { Client } from './client.entity';

export enum WindowType {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
}

@Entity('rate_limit_tracking')
@Unique(['clientId', 'windowStart', 'windowType'])
@Index('idx_rate_limit_client_window', ['clientId', 'windowType', 'windowStart'])
@Index('idx_rate_limit_cleanup', ['windowStart'])
export class RateLimitTracking {
  @ApiProperty({
    description: 'Unique identifier for the rate limit tracking record',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Client ID this tracking belongs to',
    format: 'uuid',
  })
  @Column({ name: 'client_id' })
  @IsString()
  clientId: string;

  @ApiProperty({
    description: 'Start of the time window',
  })
  @Column({ name: 'window_start', type: 'timestamptz' })
  windowStart: Date;

  @ApiProperty({
    description: 'Type of time window (minute, hour, day)',
    enum: WindowType,
  })
  @Column({ name: 'window_type', type: 'varchar', length: 20 })
  @IsString()
  windowType: WindowType;

  @ApiProperty({
    description: 'Number of requests in this window',
    minimum: 1,
    default: 1,
  })
  @Column({ name: 'request_count', default: 1 })
  @IsInt()
  @Min(1)
  requestCount: number;

  @ApiProperty({
    description: 'When the tracking record was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Client, (client) => client.rateLimitTracking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
