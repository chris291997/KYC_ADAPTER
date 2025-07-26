# Database Migrations & Seeding

This document explains how to manage database schema changes and initial data using TypeORM migrations and custom seeders.

## 🚀 Quick Setup

```bash
# Install dependencies
npm install

# Run migrations (create tables)
npm run db:migrate

# Seed initial data (test clients, provider configs)
npm run db:seed

# Or do both at once
npm run db:setup
```

## 📁 File Structure

```
src/database/
├── data-source.ts              # TypeORM DataSource configuration
├── migrations/                 # Database schema versions
│   └── 1700000001000-CreateInitialSchema.ts
├── seeds/                      # Initial data scripts
│   ├── initial-data.seed.ts    # Test clients and providers
│   └── run-seeds.ts            # Seeder runner
└── entities/                   # TypeORM entities
    ├── client.entity.ts
    ├── provider-credential.entity.ts
    └── ...
```

## 🔄 Migration Commands

### Basic Migration Operations
```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Generate new migration from entity changes
npm run migration:generate -- src/database/migrations/AddNewFeature

# Create empty migration file
npm run migration:create -- src/database/migrations/AddCustomLogic
```

### Database Reset (Development Only)
```bash
# Complete database reset
npm run db:reset

# Drop all tables + run migrations + seed data
npm run schema:drop && npm run db:migrate && npm run db:seed
```

## 🌱 Seeding System

### Initial Data Seeder

The `InitialDataSeeder` creates:

1. **Provider Credentials**
   - Regula API configuration
   - Persona API configuration
   - Encrypted credential storage

2. **Test Clients**
   - Regula test client with API key
   - Persona test client with API key
   - Rate limiting configurations

3. **Client-Provider Mappings**
   - Pre-configured provider assignments
   - Provider-specific settings

### Running Seeders

```bash
# Run all seeders
npm run db:seed

# Run seeders programmatically
ts-node src/database/seeds/run-seeds.ts
```

### Test API Keys (After Seeding)

```bash
# Regula Test Client
API Key: test-api-key-regula-123
Email: test-regula@example.com

# Persona Test Client  
API Key: test-api-key-persona-456
Email: test-persona@example.com
```

## 📝 Creating New Migrations

### 1. Automatic Generation (Recommended)

When you modify entities, generate migrations automatically:

```bash
# Modify an entity file (e.g., add new column)
# Then generate migration
npm run migration:generate -- src/database/migrations/AddUserPreferences
```

### 2. Manual Migration Creation

For custom database changes:

```bash
# Create empty migration
npm run migration:create -- src/database/migrations/AddCustomIndexes
```

**Example Manual Migration:**
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomIndexes1700000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_verification_requests_performance" 
      ON "verification_requests" ("client_id", "created_at" DESC, "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_verification_requests_performance"`);
  }
}
```

## 🗃️ Creating New Seeders

### 1. Create Seeder Class

```typescript
// src/database/seeds/provider-settings.seed.ts
import { DataSource } from 'typeorm';
import { ProviderCredential } from '../entities/provider-credential.entity';

export class ProviderSettingsSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('🔧 Seeding provider settings...');
      
      // Your seeding logic here
      
      await queryRunner.commitTransaction();
      console.log('✅ Provider settings seeded!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### 2. Register in Runner

```typescript
// src/database/seeds/run-seeds.ts
import { ProviderSettingsSeeder } from './provider-settings.seed';

async function runSeeds() {
  await AppDataSource.initialize();
  
  // Run existing seeders
  const initialSeeder = new InitialDataSeeder(AppDataSource);
  await initialSeeder.run();
  
  // Run new seeder
  const providerSeeder = new ProviderSettingsSeeder(AppDataSource);
  await providerSeeder.run();
  
  await AppDataSource.destroy();
}
```

## 🏭 Production Deployment

### Migration Strategy

1. **Backup Database** (always!)
```bash
pg_dump kyc_adapter > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Test Migrations** (staging environment)
```bash
# Run on staging first
npm run migration:run
```

3. **Deploy to Production**
```bash
# Production deployment
NODE_ENV=production npm run migration:run
```

### Migration Best Practices

✅ **DO:**
- Always test migrations on staging first
- Use transactions for complex migrations
- Include rollback logic in `down()` methods
- Add indexes for better performance
- Use descriptive migration names

❌ **DON'T:**
- Never use `synchronize: true` in production
- Don't modify existing migrations (create new ones)
- Don't forget to backup before migrations
- Don't run seeders in production (create separate prod data scripts)

## 🔍 Troubleshooting

### Migration Errors

```bash
# Check migration status
npm run migration:show

# Revert problematic migration
npm run migration:revert

# Fix migration file and re-run
npm run migration:run
```

### Seeding Errors

```bash
# Check database connection
npm run typeorm -- query "SELECT 1"

# Clear and re-seed (development only)
npm run db:reset
```

### Common Issues

1. **"Migration already exists"**
   ```bash
   # Delete existing migration file and regenerate
   rm src/database/migrations/problematic-migration.ts
   npm run migration:generate -- src/database/migrations/FixedMigration
   ```

2. **"Entity not found"**
   - Ensure entities are properly exported
   - Check data-source.ts entity paths
   - Verify TypeScript compilation

3. **Connection Issues**
   - Verify .env file exists and has correct DB settings
   - Check PostgreSQL is running
   - Test connection: `psql -h localhost -U postgres -d kyc_adapter`

## 📊 Migration History

| Version | Description | Date |
|---------|-------------|------|
| 1700000001000 | Initial schema creation | Current |

Future migrations will be documented here automatically.

---

**⚡ Pro Tip:** Always run `npm run migration:show` before deploying to see what migrations will be executed! 