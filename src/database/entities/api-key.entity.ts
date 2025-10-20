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
import { Tenant } from './tenant.entity';

export type OwnerType = 'tenant';
export type ApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked';

@Entity('api_keys')
@Index(['ownerType', 'ownerId'])
@Index(['status'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 20 })
  ownerType: OwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 64, unique: true })
  keyHash: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'active' })
  status: ApiKeyStatus;

  // Optional fields for tenant keys (encryption)
  @Column({ name: 'preview_suffix', type: 'varchar', length: 8, nullable: true })
  previewSuffix?: string;

  @Column({ name: 'key_encrypted', type: 'text', nullable: true })
  keyEncrypted?: string;

  @Column({ name: 'key_iv', type: 'varchar', length: 24, nullable: true })
  keyIv?: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual relationships (only one will be populated based on ownerType)
  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  tenant?: Tenant;

  // Helper methods
  get owner(): Tenant | undefined {
    return this.tenant;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }

  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }
}
