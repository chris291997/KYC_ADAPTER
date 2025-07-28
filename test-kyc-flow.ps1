# ===================================================================
# KYC ADAPTER - COMPLETE E2E TESTING SCRIPT
# ===================================================================

Write-Host "=== KYC ADAPTER E2E TESTING ===" -ForegroundColor Green
Write-Host "Testing complete verification flow..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as Tenant
Write-Host "Step 1: Authenticating as Tenant..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/tenant/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email": "test@kyc-adapter.dev", "password": "tenant123"}'
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $accessToken = $loginData.accessToken
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Token: $($accessToken.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create Document Verification (with production-ready data)
Write-Host "Step 2: Creating production-ready document verification..." -ForegroundColor Yellow

# Sample base64 images (tiny 1x1 pixel images for testing)
$frontImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k="
$backImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k="
$selfieImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA9/9k="

$verificationBody = @{
    verificationType = "comprehensive"
    documentImages = @{
        front = $frontImageBase64
        back = $backImageBase64
        selfie = $selfieImageBase64
    }
    allowedDocumentTypes = @("passport", "drivers_license", "id_card")
    expectedCountries = @("US", "CA", "GB")
    callbackUrl = "https://yourapp.com/webhooks/verification-complete"
    expiresIn = 3600
    requireLiveness = $true
    requireAddressVerification = $false
    minimumConfidence = 85
    metadata = @{
        userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        ipAddress = "192.168.1.100"
        location = @{
            country = "US"
            state = "California"
            city = "San Francisco"
            latitude = 37.7749
            longitude = -122.4194
        }
        device = @{
            type = "desktop"
            os = "Windows 10"
            browser = "Chrome 120.0"
            model = "Desktop PC"
        }
        sessionId = "sess_$(Get-Date -UFormat '%s')_test"
        referrer = "https://yourapp.com/signup"
        initiatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        appVersion = "1.0.0"
        custom = @{
            testEnvironment = $true
            automatedTest = $true
        }
    }
    customProperties = @{
        kycLevel = "enhanced"
        riskProfile = "standard"
        complianceRegion = "US"
        campaignId = "powershell_test_$(Get-Date -UFormat '%s')"
        source = "api_test"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/verifications" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        } `
        -Body $verificationBody
    
    $data = $response.Content | ConvertFrom-Json
    $verificationId = $data.id
    
    Write-Host "✅ Production verification created!" -ForegroundColor Green
    Write-Host "ID: $verificationId" -ForegroundColor Gray
    Write-Host "Status: $($data.status)" -ForegroundColor Gray
    Write-Host "Provider: $($data.providerName)" -ForegroundColor Gray
    Write-Host "Type: $($data.verificationType)" -ForegroundColor Gray
    Write-Host "Method: $($data.processingMethod)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Verification creation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# Step 3: Get Verification Status
Write-Host "Step 3: Checking verification status..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/verifications/$verificationId" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $accessToken"}
    
    $statusData = $statusResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Verification status retrieved!" -ForegroundColor Green
    Write-Host "Status: $($statusData.status)" -ForegroundColor Gray
    Write-Host "Confidence: $($statusData.result.overall.confidence)%" -ForegroundColor Gray
    Write-Host "Risk Level: $($statusData.result.overall.riskLevel)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Status check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: List All Verifications
Write-Host "Step 4: Listing all verifications..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/verifications?limit=5" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $accessToken"}
    
    $listData = $listResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Verification list retrieved!" -ForegroundColor Green
    Write-Host "Total verifications: $($listData.total)" -ForegroundColor Gray
    Write-Host "Current page: $($listData.page)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ List verifications failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Get Verified Users
Write-Host "Step 5: Getting verified users..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/verifications/users?limit=10" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $accessToken"}
    
    $usersData = $usersResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Verified users retrieved!" -ForegroundColor Green
    Write-Host "Total verified users: $($usersData.total)" -ForegroundColor Gray
    Write-Host "Users on this page: $($usersData.users.Count)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ Get verified users failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Display Results Summary
Write-Host "=== TEST RESULTS SUMMARY ===" -ForegroundColor Green
Write-Host "✅ Tenant Authentication: PASSED" -ForegroundColor Green
Write-Host "✅ Document Verification Creation: PASSED" -ForegroundColor Green
Write-Host "✅ Verification Status Check: PASSED" -ForegroundColor Green
Write-Host "✅ Verification List: PASSED" -ForegroundColor Green
Write-Host "✅ Verified Users List: PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 ALL TESTS PASSED! KYC system with user management is working correctly." -ForegroundColor Green
Write-Host ""

# Display comprehensive verification results
if ($statusData.result) {
    Write-Host "=== COMPREHENSIVE VERIFICATION RESULTS ===" -ForegroundColor Cyan
    
    # Overall results
    if ($statusData.result.overall) {
        Write-Host "📊 OVERALL ASSESSMENT:" -ForegroundColor Yellow
        Write-Host "Status: $($statusData.result.overall.status)" -ForegroundColor White
        Write-Host "Confidence: $($statusData.result.overall.confidence)%" -ForegroundColor White
        Write-Host "Risk Level: $($statusData.result.overall.riskLevel)" -ForegroundColor White
        Write-Host ""
    }
    
    # Document extraction results
    if ($statusData.result.document.extracted) {
        Write-Host "📄 EXTRACTED DOCUMENT DATA:" -ForegroundColor Yellow
        $extracted = $statusData.result.document.extracted
        Write-Host "Full Name: $($extracted.firstName) $($extracted.lastName)" -ForegroundColor White
        Write-Host "Date of Birth: $($extracted.dateOfBirth)" -ForegroundColor White
        Write-Host "Nationality: $($extracted.nationality)" -ForegroundColor White
        Write-Host "Document Number: $($extracted.documentNumber)" -ForegroundColor White
        Write-Host "Expiry Date: $($extracted.expiryDate)" -ForegroundColor White
        Write-Host "Issuing Country: $($extracted.issuingCountry)" -ForegroundColor White
        Write-Host ""
    }
    
    # Security checks
    if ($statusData.result.document.checks) {
        Write-Host "🔒 SECURITY VERIFICATION:" -ForegroundColor Yellow
        $checks = $statusData.result.document.checks
        Write-Host "Authenticity: $($checks.authenticity)" -ForegroundColor White
        Write-Host "Validity: $($checks.validity)" -ForegroundColor White
        Write-Host "Data Consistency: $($checks.dataConsistency)" -ForegroundColor White
        Write-Host ""
    }
    
    # Processing metadata
    if ($statusData.result.metadata) {
        Write-Host "⚙️ PROCESSING DETAILS:" -ForegroundColor Yellow
        $meta = $statusData.result.metadata
        Write-Host "Provider: $($meta.provider)" -ForegroundColor White
        Write-Host "Processing Time: $($meta.processingTime)ms" -ForegroundColor White
        Write-Host "Timestamp: $($meta.timestamp)" -ForegroundColor White
        if ($meta.authenticityChecksPerformed) {
            Write-Host "Security Features Checked: $($meta.authenticityChecksPerformed.Count)" -ForegroundColor White
        }
        Write-Host ""
    }
}

# Display verified users
if ($usersData.users -and $usersData.users.Count -gt 0) {
    Write-Host "=== VERIFIED USERS DATABASE ===" -ForegroundColor Cyan
    foreach ($user in $usersData.users) {
        Write-Host "User ID: $($user.id)" -ForegroundColor White
        if ($user.name) {
            Write-Host "Name: $($user.name.first) $($user.name.last)" -ForegroundColor White
        }
        if ($user.birthdate) {
            Write-Host "Birth Date: $($user.birthdate)" -ForegroundColor White
        }
        if ($user.referenceId) {
            Write-Host "Reference: $($user.referenceId)" -ForegroundColor White
        }
        Write-Host "Verifications: $($user.verificationCount)" -ForegroundColor White
        Write-Host "Created: $($user.createdAt)" -ForegroundColor White
        Write-Host "---" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "Test completed successfully! 🚀" -ForegroundColor Green 