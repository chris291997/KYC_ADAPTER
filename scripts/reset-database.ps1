# Database Reset Script
# Drops and recreates the KYC Adapter database

Write-Host "`n=== KYC Adapter Database Reset ===" -ForegroundColor Cyan
Write-Host "`nThis will:" -ForegroundColor Yellow
Write-Host "  1. Drop kyc_adapter database (if exists)" -ForegroundColor White
Write-Host "  2. Create fresh kyc_adapter database" -ForegroundColor White
Write-Host "  3. Run all base migrations (4 total)" -ForegroundColor White
Write-Host "`nWARNING: All data will be lost!" -ForegroundColor Red

$confirmation = Read-Host "`nType 'YES' to confirm"

if ($confirmation -ne "YES") {
    Write-Host "`nAborted." -ForegroundColor Yellow
    exit 1
}

# Set PostgreSQL password
$env:PGPASSWORD = "password"

Write-Host "`n[1/4] Dropping kyc_adapter database..." -ForegroundColor Cyan
psql -U postgres -c "DROP DATABASE IF EXISTS kyc_adapter;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Database dropped" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to drop database" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/4] Creating fresh kyc_adapter database..." -ForegroundColor Cyan
psql -U postgres -c "CREATE DATABASE kyc_adapter OWNER postgres;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Database created" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to create database" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/4] Running migrations..." -ForegroundColor Cyan
npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Migrations completed" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Migrations failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n[4/4] Verifying database setup..." -ForegroundColor Cyan
$env:PGPASSWORD = "password"
$tables = psql -U postgres -d kyc_adapter -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
$tableCount = $tables.Trim()
Write-Host "  Tables created: $tableCount" -ForegroundColor White

$migrations = psql -U postgres -d kyc_adapter -t -c "SELECT COUNT(*) FROM typeorm_migrations;"
$migrationCount = $migrations.Trim()
Write-Host "  Migrations applied: $migrationCount" -ForegroundColor White

Write-Host "`n=== Database Reset Complete! ===" -ForegroundColor Green
Write-Host "`nYou can now start fresh implementation." -ForegroundColor Cyan
Write-Host "Next step: Follow Day 1 in DEVELOPMENT_PLAN.md" -ForegroundColor Yellow

