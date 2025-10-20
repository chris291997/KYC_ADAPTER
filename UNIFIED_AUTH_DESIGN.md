# Unified Authentication System Design

## Current State Analysis

### Existing Tables:
1. **`admin_api_keys`** - Admin API keys
2. **`tenant_api_keys`** - Tenant API keys (with encryption fields)
3. **`admin_refresh_tokens`** - Admin refresh tokens
4. **`tenant_refresh_tokens`** - Tenant refresh tokens

### Key Differences:
- **API Keys**: Tenant keys have `preview_suffix`, `key_encrypted`, `key_iv` (encryption)
- **Refresh Tokens**: Identical structure
- **Foreign Keys**: `admin_id` vs `tenant_id`

---

## Unified Design

### New Tables:

#### 1. `api_keys` (Unified API Keys)
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner identification
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('admin', 'tenant')),
    owner_id UUID NOT NULL,
    
    -- Key details
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Optional fields (for tenant keys)
    preview_suffix VARCHAR(8),
    key_encrypted TEXT,
    key_iv VARCHAR(24),
    
    -- Timestamps
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_owner CHECK (
        (owner_type = 'admin' AND owner_id IN (SELECT id FROM admins)) OR
        (owner_type = 'tenant' AND owner_id IN (SELECT id FROM tenants))
    )
);

-- Indexes
CREATE INDEX idx_api_keys_owner ON api_keys(owner_type, owner_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status);
```

#### 2. `refresh_tokens` (Unified Refresh Tokens)
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner identification
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('admin', 'tenant')),
    owner_id UUID NOT NULL,
    
    -- Token details
    token VARCHAR(255) NOT NULL UNIQUE,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Session info
    user_agent TEXT,
    ip_address VARCHAR(45),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_owner CHECK (
        (owner_type = 'admin' AND owner_id IN (SELECT id FROM admins)) OR
        (owner_type = 'tenant' AND owner_id IN (SELECT id FROM tenants))
    )
);

-- Indexes
CREATE INDEX idx_refresh_tokens_owner ON refresh_tokens(owner_type, owner_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## Migration Strategy

### Phase 1: Create New Tables
1. Create `api_keys` table
2. Create `refresh_tokens` table
3. Add indexes and constraints

### Phase 2: Migrate Data
1. Migrate `admin_api_keys` → `api_keys` (owner_type='admin')
2. Migrate `tenant_api_keys` → `api_keys` (owner_type='tenant')
3. Migrate `admin_refresh_tokens` → `refresh_tokens` (owner_type='admin')
4. Migrate `tenant_refresh_tokens` → `refresh_tokens` (owner_type='tenant')

### Phase 3: Update Code
1. Update entities
2. Update services
3. Update guards
4. Update API endpoints

### Phase 4: Cleanup
1. Drop old tables
2. Update foreign key constraints

---

## Code Changes Required

### 1. New Entity: `ApiKey`
```typescript
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  ownerType: 'admin' | 'tenant';

  @Column('uuid')
  ownerId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  keyHash: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  // Optional fields for tenant keys
  @Column({ type: 'varchar', length: 8, nullable: true })
  previewSuffix?: string;

  @Column({ type: 'text', nullable: true })
  keyEncrypted?: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  keyIv?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual relationships
  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  admin?: Admin;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  tenant?: Tenant;
}
```

### 2. New Entity: `RefreshToken`
```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  ownerType: 'admin' | 'tenant';

  @Column('uuid')
  ownerId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Virtual relationships
  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  admin?: Admin;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  tenant?: Tenant;
}
```

### 3. Updated Services
```typescript
@Injectable()
export class ApiKeyService {
  async createApiKey(ownerType: 'admin' | 'tenant', ownerId: string, data: CreateApiKeyDto) {
    // Unified logic for both admin and tenant
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    // Find by hash regardless of owner type
  }

  async findByOwner(ownerType: 'admin' | 'tenant', ownerId: string): Promise<ApiKey[]> {
    // Get all keys for an owner
  }
}
```

### 4. Updated Guards
```typescript
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    const key = await this.apiKeyService.findByHash(hash);
    if (!key) return false;
    
    // Set owner info based on type
    if (key.ownerType === 'admin') {
      request.admin = await this.adminService.findById(key.ownerId);
    } else {
      request.tenant = await this.tenantService.findById(key.ownerId);
    }
    
    return true;
  }
}
```

---

## Benefits

1. **Unified Codebase** - Single service for API keys and refresh tokens
2. **Easier Maintenance** - One set of CRUD operations
3. **Better Scalability** - Easy to add new owner types
4. **Consistent API** - Same endpoints for all key types
5. **Simplified Guards** - One guard handles all authentication
6. **Better Testing** - Fewer duplicate test cases

---

## Migration Risks & Mitigation

### Risks:
1. **Data Loss** - If migration fails
2. **Downtime** - During migration
3. **Code Breaking** - Services using old tables

### Mitigation:
1. **Backup** - Full database backup before migration
2. **Gradual Migration** - Migrate data first, then update code
3. **Rollback Plan** - Keep old tables until code is updated
4. **Testing** - Thorough testing in staging environment

---

## Implementation Order

1. ✅ **Create Migration** - New tables + data migration
2. ✅ **Update Entities** - New unified entities
3. ✅ **Update Services** - Unified API key and refresh token services
4. ✅ **Update Guards** - Unified authentication guards
5. ✅ **Update Controllers** - Unified API endpoints
6. ✅ **Update Tests** - Test new unified system
7. ✅ **Drop Old Tables** - Remove old tables after verification
8. ✅ **Update Documentation** - Update API docs and guides
