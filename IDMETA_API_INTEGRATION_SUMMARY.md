# IDmeta API Integration Summary

## ✅ Completed Updates

Based on the actual IDmeta API documentation retrieved from the Postman collection, the following files have been updated:

### 1. **Type Definitions** (`provider-api.types.ts`) ✅
**Status**: Complete

**Changes**:
- Added all IDmeta-specific request/response types
- Multi-step workflow types:
  - `ProviderCreateVerificationRequest` - requires `template_id` and `verification_id`
  - `ProviderDocumentVerificationRequest` - document upload and OCR
  - `ProviderIdVerificationRequest` - ID-based government database check
  - `ProviderFaceVerificationRequest`, `ProviderFaceRegistrationRequest`, `ProviderFaceComparisonRequest` - biometric verification
  - `ProviderSendOtpRequest`, `ProviderVerifyOtpRequest` - OTP verification
  - `ProviderAmlCheckRequest` - AML checks
  - `ProviderFinalizeVerificationRequest` - finalize session
  - `ProviderGetResultsRequest` - get results from v2 endpoint
- Added comprehensive result types with AML, ID verification, and OTP support
- Added webhook event types for step-by-step progress tracking

### 2. **HTTP Client** (`external-http.client.ts`) ✅
**Status**: Complete

**Changes**:
- Updated all endpoints to match IDmeta API structure:
  - `POST /v1/verification/create-verification` - create session
  - `POST /v1/verification/document-verification` - document OCR
  - `POST /v1/verification/id-verification` - ID-based verification
  - `POST /v1/verification/face-verification` - face matching
  - `POST /v1/verification/face-registration` - register face
  - `POST /v1/verification/face-comparison` - compare two faces
  - `POST /v1/verification/send-otp` - send OTP
  - `POST /v1/verification/verify-otp` - verify OTP code
  - `POST /v1/verification/aml-check` - AML screening
  - `POST /v1/verification/finalize-verification` - finalize session
  - `GET /v2/verification/get-verification/{id}` - get results
  - `POST /v1/verification/cancel-verification` - cancel verification
- Maintained retry logic, error handling, and correlation ID tracking

### 3. **Request Mapper** (`mappers/request.mapper.ts`) ✅
**Status**: Complete

**Changes**:
- Added mapper methods for all IDmeta request types:
  - `toProviderCreateRequest()` - create verification session
  - `toDocumentVerificationRequest()` - map document verification data
  - `toIdVerificationRequest()` - map ID-based verification
  - `toFaceVerificationRequest()`, `toFaceRegistrationRequest()`, `toFaceComparisonRequest()`
  - `toSendOtpRequest()`, `toVerifyOtpRequest()`
  - `toAmlCheckRequest()`
  - `toFinalizeVerificationRequest()`
- Added document type mapping (passport, driver_license, national_id, prc_id, police_clearance)
- Added ID type mapping (nbi_clearance, drivers_license, prc_id, police_clearance, social_security)
- Added `templateId` and `verificationId` support to internal request interface

### 4. **Response Mapper** (`mappers/response.mapper.ts`) ✅
**Status**: Complete

**Changes**:
- Updated `toInternalCreateResponse()` to handle IDmeta create response format
- Updated `toInternalStatusResponse()` to use `ProviderGetResultsResponse` from v2 endpoint
- Updated status mapping to include `created` and `finalized` statuses
- Updated result mapping to handle:
  - AML result structure (sanctions_match, pep_match, watchlist_match with matches array)
  - ID verification result
  - OTP verification result
  - Document validation checks (removed chip_valid, kept mrz_valid, image_quality, tamper_detection)
- Fixed address mapping (address is now under `personal_info.address`)

### 5. **Provider Implementation** (`external.provider.ts`) ✅
**Status**: Complete

**Changes**:
- Updated provider name to "IDmeta KYC Provider"
- Added multi-step workflow documentation in comments
- Updated `createVerification()` to:
  - Generate or use provided `verificationId`
  - Pass `templateId` (defaults to 'default_template')
  - Return metadata explaining that verification steps must be executed separately
- Updated `getVerificationStatus()` to use `httpClient.getResults()` (v2 endpoint)
- Added `generateVerificationId()` helper method
- Maintained webhook signature verification (HMAC SHA256)
- Updated response mapping to include `steps_completed` and `template_id` in metadata

## ⚠️ Pending Updates

### 6. **Unit Tests** - IN PROGRESS
**Status**: Needs Update

**Files Affected**:
- `external-http.client.spec.ts`
- `external.provider.spec.ts`
- `mappers/request.mapper.spec.ts` (likely OK, needs verification)
- `mappers/response.mapper.spec.ts` (likely OK, needs verification)

**Required Changes**:

#### `external-http.client.spec.ts`:
1. Update imports: `ProviderGetVerificationStatusResponse` → `ProviderGetResultsResponse`
2. Update mock requests to use new structure:
   ```typescript
   // OLD (remove these properties)
   {
     first_name: 'John',
     last_name: 'Doe',
     client_id: 'tenant-123',
     workflow_url: '...',
   }
   
   // NEW
   {
     template_id: 'template-123',
     verification_id: 'VER-123',
     callback_url: '...',
     metadata: {}
   }
   ```
3. Update mock responses:
   ```typescript
   // Add template_id to create response
   {
     verification_id: 'ver_123',
     template_id: 'template-123',
     status: 'created',
     created_at: '2025-01-01T00:00:00Z',
     message: 'Verification session created'
   }
   ```
4. Replace `getVerificationStatus` calls with `getResults`
5. Add tests for new endpoints:
   - `documentVerification()`
   - `idVerification()`
   - `faceVerification()`
   - `faceRegistration()`
   - `faceComparison()`
   - `sendOtp()`
   - `verifyOtp()`
   - `amlCheck()`
   - `finalizeVerification()`

#### `external.provider.spec.ts`:
1. Update imports: `ProviderGetVerificationStatusResponse` → `ProviderGetResultsResponse`
2. Update mock provider create request:
   ```typescript
   // Remove client_id, add template_id
   {
     template_id: 'template-123',
     verification_id: expect.any(String),
     callback_url: '...',
     metadata: expect.any(Object)
   }
   ```
3. Update mock provider create response (remove `workflow_url`, add `template_id`, `message`)
4. Replace `httpClient.getVerificationStatus` mocks with `httpClient.getResults`
5. Update test descriptions to reflect multi-step workflow

### 7. **Manual Testing Guide** - PENDING
**Status**: Needs Complete Rewrite

**File**: `MANUAL_TESTING_GUIDE.md`

**Required Changes**:
1. Update all API examples to match actual IDmeta endpoints
2. Add multi-step workflow examples:
   ```bash
   # Step 1: Create verification session
   POST /api/v1/verification/create-verification
   {
     "template_id": "default_template",
     "verification_id": "VER-12345",
     "callback_url": "https://yourapp.com/webhooks/kyc"
   }
   
   # Step 2: Document verification
   POST /api/v1/verification/document-verification
   {
     "verification_id": "VER-12345",
     "document_type": "passport",
     "document_image_front": "<base64>",
     "document_number": "P1234567",
     "full_name": "John Doe"
   }
   
   # Step 3: Face verification
   POST /api/v1/verification/face-verification
   {
     "verification_id": "VER-12345",
     "face_image": "<base64>",
     "liveness_check": true
   }
   
   # Step 4: AML check
   POST /api/v1/verification/aml-check
   {
     "verification_id": "VER-12345",
     "full_name": "John Doe",
     "date_of_birth": "1990-01-01",
     "nationality": "PH"
   }
   
   # Step 5: Finalize
   POST /api/v1/verification/finalize-verification
   {
     "verification_id": "VER-12345"
   }
   
   # Step 6: Get results
   GET /api/v2/verification/get-verification/VER-12345
   ```
3. Add examples for all verification types:
   - Document verification
   - ID-based verification (NBI, PRC, Police Clearance, SSS)
   - Face verification, registration, and comparison
   - OTP (SMS and Email)
   - AML checks
4. Update webhook payload examples
5. Add Postman collection import instructions

### 8. **Technical Documentation** - PENDING
**Status**: Needs Update

**File**: `EXTERNAL_PROVIDER_INTEGRATION.md`

**Required Changes**:
1. Update "API Endpoints" section with actual IDmeta endpoints
2. Document multi-step verification workflow:
   ```
   1. Create Verification Session
      - POST /v1/verification/create-verification
      - Returns verification_id and template_id
   
   2. Execute Verification Steps (in any order)
      - Document Verification
      - ID-Based Verification
      - Face Verification
      - OTP Verification
      - AML Check
   
   3. Finalize Verification
      - POST /v1/verification/finalize-verification
      - Triggers final decision
   
   4. Get Results
      - GET /v2/verification/get-verification/{id}
      - Returns complete verification results
   ```
3. Update request/response examples with actual formats
4. Document all verification types:
   - Document types: passport, driver_license, national_id, birth_certificate, prc_id, police_clearance
   - ID types: nbi_clearance, drivers_license, prc_id, police_clearance, social_security
5. Add webhook event types:
   - verification.created
   - verification.step_completed (with step_type and step_status)
   - verification.finalized
   - verification.completed
   - verification.approved
   - verification.rejected
6. Update architecture diagrams if present

## 🔄 API Workflow Overview

### IDmeta Multi-Step Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE VERIFICATION SESSION                                 │
│    POST /v1/verification/create-verification                    │
│    ├─ Input: template_id, verification_id, callback_url        │
│    └─ Output: verification_id, template_id, status: created     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXECUTE VERIFICATION STEPS (any order, as needed)           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Document Verification                                   │    │
│  │ POST /v1/verification/document-verification            │    │
│  │ ├─ Upload document images (front/back)                 │    │
│  │ └─ Extract and validate document data                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ID-Based Verification                                  │    │
│  │ POST /v1/verification/id-verification                  │    │
│  │ ├─ Check government database (NBI, PRC, etc.)          │    │
│  │ └─ Verify ID number and personal info                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Face Verification                                      │    │
│  │ POST /v1/verification/face-verification                │    │
│  │ ├─ Face matching (with document or reference)          │    │
│  │ └─ Liveness check                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ OTP Verification                                       │    │
│  │ POST /v1/verification/send-otp                         │    │
│  │ POST /v1/verification/verify-otp                       │    │
│  │ └─ Phone/Email verification                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ AML Check                                              │    │
│  │ POST /v1/verification/aml-check                        │    │
│  │ └─ Sanctions, PEP, Watchlist screening                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  * Steps can be executed in parallel or sequentially           │
│  * Webhooks sent for each step completion                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FINALIZE VERIFICATION                                        │
│    POST /v1/verification/finalize-verification                  │
│    ├─ Triggers final decision based on completed steps         │
│    └─ Status changes to: finalized                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. GET RESULTS (v2 API)                                         │
│    GET /v2/verification/get-verification/{verification_id}      │
│    ├─ Returns complete verification results                    │
│    ├─ Includes all step data and final decision                │
│    └─ Status: approved / rejected / manual_review              │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Quick Reference

### Base URL
```
https://integrate.idmetagroup.com/api
```

### Authentication
```http
Authorization: Bearer {api_token}
```

### Key Endpoints

| Method | Endpoint | Version | Purpose |
|--------|----------|---------|---------|
| POST | `/v1/verification/create-verification` | v1 | Create session |
| POST | `/v1/verification/document-verification` | v1 | Document OCR |
| POST | `/v1/verification/id-verification` | v1 | ID database check |
| POST | `/v1/verification/face-verification` | v1 | Face matching |
| POST | `/v1/verification/face-registration` | v1 | Register face |
| POST | `/v1/verification/face-comparison` | v1 | Compare faces |
| POST | `/v1/verification/send-otp` | v1 | Send OTP |
| POST | `/v1/verification/verify-otp` | v1 | Verify OTP |
| POST | `/v1/verification/aml-check` | v1 | AML screening |
| POST | `/v1/verification/finalize-verification` | v1 | Finalize session |
| GET | `/v2/verification/get-verification/{id}` | v2 | Get results |
| POST | `/v1/verification/cancel-verification` | v1 | Cancel |

### Document Types
- `passport`
- `driver_license`
- `national_id`
- `birth_certificate`
- `prc_id`
- `police_clearance`

### ID Types (for ID-Based Verification)
- `nbi_clearance`
- `drivers_license`
- `prc_id`
- `police_clearance`
- `social_security`

### Verification Statuses
- `created` - Session created
- `pending` - Waiting for steps
- `processing` / `in_progress` - Steps being executed
- `finalized` - Finalization complete
- `completed` / `approved` - Verification passed
- `rejected` / `declined` - Verification failed
- `failed` - Technical error
- `expired` - Session expired
- `cancelled` - Manually cancelled

### Webhook Events
- `verification.created` - Session created
- `verification.step_completed` - Step finished (includes step_type and step_status)
- `verification.processing` - Processing
- `verification.finalized` - Finalized
- `verification.completed` - All steps done
- `verification.approved` - Approved
- `verification.rejected` - Rejected
- `verification.failed` - Failed
- `verification.expired` - Expired
- `verification.cancelled` - Cancelled

## 🚀 Next Steps

1. **Fix Unit Tests** (Priority: HIGH)
   - Update `external-http.client.spec.ts` to use new request/response formats
   - Update `external.provider.spec.ts` to use `getResults` instead of `getVerificationStatus`
   - Add tests for new endpoints (document, ID, face, OTP, AML)
   - Run `npm test` to verify all tests pass

2. **Update Manual Testing Guide** (Priority: HIGH)
   - Replace all generic examples with actual IDmeta examples
   - Add multi-step workflow examples
   - Add examples for all verification types
   - Include Postman collection usage instructions

3. **Update Technical Documentation** (Priority: MEDIUM)
   - Update `EXTERNAL_PROVIDER_INTEGRATION.md` with actual API details
   - Document multi-step workflow
   - Add architecture diagrams if needed
   - Include webhook payload examples

4. **Integration Testing** (Priority: HIGH)
   - Test with actual IDmeta sandbox/test environment
   - Verify all endpoints work as expected
   - Test webhook signature verification
   - Validate request/response mappings

5. **Update CHANGELOG** (Priority: LOW)
   - Document all changes made
   - Include breaking changes (API structure change)
   - Add migration guide if needed

## 📝 Notes

- The adapter is now accurately aligned with the actual IDmeta API structure
- The multi-step workflow requires orchestration at a higher level (not in the provider adapter itself)
- Templates and plans management is not part of the adapter's responsibility (as per user requirement)
- The adapter stores validated user data and metadata, translating between IDmeta's API and the internal format
- Webhook support is fully implemented with HMAC SHA256 signature verification
- All type definitions are comprehensive and match the Postman collection

