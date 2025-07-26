import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { TenantApiKey } from './tenant-api-key.entity';
import { Account } from './account.entity';
import { InquiryTemplate } from './inquiry-template.entity';
import { Inquiry } from './inquiry.entity';
import { Webhook } from './webhook.entity';

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'pending';

@Entity('tenants')
@Index(['email'], { unique: true })
@Index(['status'])
export class Tenant {
  @ApiProperty({ description: 'Unique tenant identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant organization name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tenant account status',
    enum: ['active', 'inactive', 'suspended', 'pending'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
    enum: ['active', 'inactive', 'suspended', 'pending'],
  })
  @IsIn(['active', 'inactive', 'suspended', 'pending'])
  status: TenantStatus;

  @ApiProperty({ description: 'Tenant primary email address' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Tenant password (min 8 characters)', writeOnly: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Exclude({ toPlainOnly: true }) // Exclude from API responses
  password?: string;

  @ApiProperty({ description: 'Tenant configuration settings', required: false })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  settings: Record<string, any>;

  @ApiProperty({ description: 'Tenant creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => TenantApiKey, (apiKey) => apiKey.tenant)
  apiKeys: TenantApiKey[];

  @OneToMany(() => Account, (account) => account.tenant)
  accounts: Account[];

  @OneToMany(() => InquiryTemplate, (template) => template.tenant)
  inquiryTemplates: InquiryTemplate[];

  @OneToMany(() => Inquiry, (inquiry) => inquiry.tenant)
  inquiries: Inquiry[];

  @OneToMany(() => Webhook, (webhook) => webhook.tenant)
  webhooks: Webhook[];

  // Password hashing hooks
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      // Only hash if it's not already a bcrypt hash
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // Helper methods
  isActive(): boolean {
    return this.status === 'active';
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plainPassword, this.password);
  }

  async setPassword(plainPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(plainPassword, salt);
  }
}
