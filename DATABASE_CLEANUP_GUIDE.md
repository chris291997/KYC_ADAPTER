# Database Cleanup Guide

**Issue:** Day 1-3 event-driven tables exist in database but migration files were deleted.

**Tables to Remove:**
- `provider_plans`
- `provider_templates`
- `provider_verification_sessions`

**Migration to Remove:**
- Migration #5: `AddEventDrivenArchitecture1753700000000`

---

## Current Database State

**Database:** `kyc_adapter`  
**Total Tables:** 18  
**Applied Migrations:** 5 (should be 4)

**Unwanted Tables:**
```sql
provider_plans                 ← Remove (from Day 2)
provider_templates             ← Remove (from Day 2)
provider_verification_sessions ← Remove (from Day 2)
```

**Correct Tables (Keep):**
```sql
accounts
admin_api_keys
admin_refresh_tokens
admins
documents
inquiries
inquiry_templates
providers                      ← Keep
tenant_api_keys
tenant_provider_configs        ← Keep
tenant_refresh_tokens
tenants
typeorm_migrations
verifications                  ← Keep
webhooks
```

---

## Option 1: Fresh Start (RECOMMENDED) ✅

**Best for:** Clean slate, no existing data to preserve

### Steps:

1. **Run the reset script:**
```powershell
.\scripts\reset-database.ps1
```

2. **What it does:**
   - Drops `kyc_adapter` database completely
   - Creates fresh `kyc_adapter` database
   - Runs only the 4 base migrations
   - Verifies setup

3. **Confirmation required:**
   - Script will ask you to type `YES` to confirm
   - All data will be lost

4. **Expected Result:**
   - Clean database with 14 tables (no event-driven tables)
   - Only 4 migrations applied
   - Ready for fresh implementation

---

## Option 2: Manual Cleanup

**Best for:** Preserving existing test data

### Steps:

1. **Run the cleanup SQL:**
```powershell
$env:PGPASSWORD='password'
psql -U postgres -d kyc_adapter -f scripts/cleanup-old-tables.sql
```

2. **What it does:**
   - Drops 3 unwanted tables
   - Removes migration #5 from `typeorm_migrations`
   - Shows verification of cleanup

3. **Expected Result:**
   - Database has 15 tables (3 removed)
   - Only 4 migrations in `typeorm_migrations`
   - Existing data preserved in other tables

---

## Verification

After running either option, verify the cleanup:

### Check Tables:
```powershell
$env:PGPASSWORD='password'
psql -U postgres -d kyc_adapter -c "\dt"
```

**Expected: 14-15 tables, NOT including:**
- ❌ `provider_plans`
- ❌ `provider_templates`
- ❌ `provider_verification_sessions`

### Check Migrations:
```powershell
npm run migration:show
```

**Expected output:**
```
[X] 1 CreateCleanSchema1753640000000
[X] 2 SeedInitialData1753650000000
[X] 3 AddApiKeyPreviewSuffix1753660000000
[X] 4 AddApiKeyEncryptionColumns1753660001000
```

**Should NOT show:**
- ❌ `AddEventDrivenArchitecture1753700000000`

---

## Why These Tables?

**Tables from Day 1-3 Implementation (Deleted):**

1. **`provider_plans`** - Stored verification plans from external provider
   - Not needed for webhook-driven approach
   - Provider manages plans internally

2. **`provider_templates`** - Cached templates from external provider
   - Not needed initially
   - Can be added later as optional optimization

3. **`provider_verification_sessions`** - Tracked multi-step session state
   - Not needed for webhook-driven approach
   - Provider manages session state internally

**Migration #5 Issues:**
- Migration file was deleted (Day 1-3 rollback)
- But migration was already applied to database
- Leaves orphaned tables and migration record
- Clean removal required

---

## After Cleanup

Once database is clean, you're ready to start implementation:

### Next Steps:

1. ✅ Database is clean (verified above)
2. ✅ Documentation is generic (completed)
3. 🔜 **Start Day 1 implementation** (from `DEVELOPMENT_PLAN.md`)

### Day 1 Tasks:
- [ ] Create new migration: `AddExternalProviderSupport`
- [ ] Add columns to `verifications` table:
  - `external_verification_id`
  - `external_workflow_url`
  - `external_template_id`
  - `webhook_received_at`
  - `last_webhook_event`
- [ ] Add columns to `providers` table:
  - `supports_webhooks`
  - `supports_hosted_workflow`
  - `webhook_secret`
- [ ] Create optional `webhook_logs` table
- [ ] Implement HTTP client
- [ ] Test with provider API

---

## Troubleshooting

### Issue: Script fails with "database is being accessed"

**Solution:**
```powershell
# Terminate all connections to kyc_adapter
$env:PGPASSWORD='password'
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'kyc_adapter' AND pid <> pg_backend_pid();"

# Then re-run reset script
.\scripts\reset-database.ps1
```

### Issue: Permission denied

**Solution:**
```powershell
# Ensure you're using postgres user with correct password
$env:PGPASSWORD='password'
psql -U postgres -l
```

### Issue: Want to backup before cleanup

**Solution:**
```powershell
# Backup current database
$env:PGPASSWORD='password'
pg_dump -U postgres -d kyc_adapter -F c -f backup_kyc_adapter_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump

# Restore if needed
pg_restore -U postgres -d kyc_adapter backup_kyc_adapter_TIMESTAMP.dump
```

---

## Quick Commands

### Fresh Start (Recommended):
```powershell
.\scripts\reset-database.ps1
```

### Manual Cleanup:
```powershell
$env:PGPASSWORD='password'
psql -U postgres -d kyc_adapter -f scripts/cleanup-old-tables.sql
```

### Verify:
```powershell
npm run migration:show
$env:PGPASSWORD='password'
psql -U postgres -d kyc_adapter -c "\dt"
```

---

**Recommendation:** Use **Option 1 (Fresh Start)** for cleanest setup before starting new implementation.

