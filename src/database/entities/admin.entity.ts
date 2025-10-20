import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
// Admins do not own API keys; API keys are tenant-only

export type AdminStatus = 'active' | 'inactive' | 'suspended';
export type AdminRole = 'super_admin' | 'admin' | 'viewer';

@Entity('admins')
@Index(['email'], { unique: true })
@Index(['status'])
@Index(['role'])
export class Admin {
  @ApiProperty({ description: 'Unique admin identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Admin full name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Admin email address' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Admin password (min 8 characters)', writeOnly: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Exclude({ toPlainOnly: true }) // Exclude from API responses
  password?: string;

  @ApiProperty({
    description: 'Admin role',
    enum: ['super_admin', 'admin', 'viewer'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'admin',
    enum: ['super_admin', 'admin', 'viewer'],
  })
  @IsIn(['super_admin', 'admin', 'viewer'])
  role: AdminRole;

  @ApiProperty({
    description: 'Admin account status',
    enum: ['active', 'inactive', 'suspended'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsIn(['active', 'inactive', 'suspended'])
  status: AdminStatus;

  @ApiProperty({ description: 'Last login timestamp', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Admin creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  // Note: Admins no longer have API keys; authentication is via JWT/admin login

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

  isSuperAdmin(): boolean {
    return this.role === 'super_admin';
  }

  canManageTenants(): boolean {
    return this.role === 'super_admin' || this.role === 'admin';
  }

  canViewOnly(): boolean {
    return this.role === 'viewer';
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
