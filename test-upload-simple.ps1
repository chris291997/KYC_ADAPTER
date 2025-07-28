# ===================================
# SIMPLE UPLOAD TEST
# ===================================
# Test the fixed upload endpoint with correct field names

Write-Host "🧪 Testing Upload Endpoint Fix..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/tenant/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email": "test@kyc-adapter.dev", "password": "tenant123"}'
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $accessToken = $loginData.accessToken
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create test image file
Write-Host "Step 2: Creating test image..." -ForegroundColor Yellow
$testImageData = [Convert]::FromBase64String("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k=")
$frontImagePath = "$env:TEMP\test_front.jpg"
[System.IO.File]::WriteAllBytes($frontImagePath, $testImageData)

Write-Host "✅ Test image created: $frontImagePath" -ForegroundColor Green
Write-Host ""

# Step 3: Test upload with curl (simulated with PowerShell)
Write-Host "Step 3: Testing upload with correct field names..." -ForegroundColor Yellow

try {
    # Use Invoke-RestMethod with form data
    $form = @{
        front = Get-Item $frontImagePath
        verificationType = 'document'
        callbackUrl = 'https://yourapp.com/webhook'
        metadata = '{"testMode": true, "method": "multipart"}'
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/verifications/upload" `
        -Method POST `
        -Headers @{"Authorization" = "Bearer $accessToken"} `
        -Form $form
    
    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host "Verification ID: $($response.id)" -ForegroundColor Gray
    Write-Host "Status: $($response.status)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
finally {
    # Cleanup
    if (Test-Path $frontImagePath) { 
        Remove-Item $frontImagePath 
        Write-Host "🧹 Cleaned up test file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== CORRECT USAGE ===" -ForegroundColor Cyan
Write-Host "curl -X POST http://localhost:3000/api/v1/verifications/upload \\" -ForegroundColor White
Write-Host "  -H 'Authorization: Bearer YOUR_TOKEN' \\" -ForegroundColor White
Write-Host "  -F 'front=@front.jpg' \\" -ForegroundColor Yellow
Write-Host "  -F 'back=@back.jpg' \\" -ForegroundColor Yellow
Write-Host "  -F 'verificationType=document' \\" -ForegroundColor Yellow
Write-Host "  -F 'callbackUrl=https://yourapp.com/webhook'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Field names must be: front, back, selfie, additional" -ForegroundColor Cyan 