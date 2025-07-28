import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Tenant } from './tenant.entity';
import { Inquiry } from './inquiry.entity';
import { Document } from './document.entity';
import { Verification } from './verification.entity';

export interface PersonName {
  first?: string;
  middle?: string;
  last?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

@Entity('accounts')
@Index(['tenantId'])
@Index(['tenantId', 'referenceId'])
@Index(['tenantId', 'email'])
export class Account {
  @ApiProperty({ description: 'Unique account identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this account belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Tenant internal reference ID', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reference_id' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Account holder name', required: false })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  name?: PersonName;

  @ApiProperty({ description: 'Email address', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  @IsDateString()
  birthdate?: Date;

  @ApiProperty({ description: 'Address information', required: false })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  address?: Address;

  @ApiProperty({ description: 'Account creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Inquiry, (inquiry) => inquiry.account)
  inquiries: Inquiry[];

  @OneToMany(() => Document, (document) => document.account)
  documents: Document[];

  @OneToMany(() => Verification, (verification) => verification.account)
  verifications: Verification[];

  // Helper methods
  getFullName(): string {
    if (!this.name) return '';
    const { first = '', middle = '', last = '' } = this.name;
    return [first, middle, last].filter(Boolean).join(' ');
  }

  getDisplayName(): string {
    return this.getFullName() || this.email || this.referenceId || this.id;
  }
}
