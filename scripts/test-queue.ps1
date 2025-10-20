# Test Queue and Event Bus
# PowerShell version for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Queue & Event Bus Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Redis is running
Write-Host "Checking Redis connection..." -ForegroundColor Yellow
$redisRunning = docker ps --filter "name=kyc-adapter-redis" --format "{{.Names}}" 2>$null

if ($redisRunning -eq "kyc-adapter-redis") {
    Write-Host "OK Redis container is running`n" -ForegroundColor Green
} else {
    Write-Host "WARN Redis container is not running" -ForegroundColor Red
    Write-Host "Starting Redis...`n" -ForegroundColor Yellow
    docker-compose up -d redis
    Start-Sleep -Seconds 2
}

Write-Host "Running tests...`n" -ForegroundColor Yellow

# Run the test script
npx ts-node -r tsconfig-paths/register src/queue/test-queue-and-events.ts

Write-Host "`n========================================" -ForegroundColor Cyan

