# IDmeta KYC Provider Integration - Development Plan

> **Current Status:** ✅ Phase 1 Complete - Core Adapter Implementation  
> **Next Phase:** Phase 2 - Service Integration & Testing  
> **Timeline:** 2-3 days remaining  
> **Updated:** October 21, 2025

---

## Table of Contents

1. [Current Status Overview](#current-status-overview)
2. [What We've Built](#what-weve-built)
3. [Architecture Decision](#architecture-decision)
4. [Remaining Tasks](#remaining-tasks)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Checklist](#deployment-checklist)

---

## Current Status Overview

### ✅ Completed (Phase 1)

**Core Adapter Implementation - 100% Complete**

- ✅ HTTP Client with all 11 IDmeta endpoints
- ✅ Request/Response mappers
- ✅ Provider adapter implementing `IKycProvider`
- ✅ Webhook signature verification (HMAC SHA256)
- ✅ Error handling and retry logic
- ✅ Comprehensive unit tests (60 tests, 100% passing)
- ✅ Type-safe interfaces for all API operations
- ✅ Proper logging with correlation IDs

**Test Coverage:**
- `external-http.client.spec.ts` - 16 tests ✅
- `external.provider.spec.ts` - 18 tests ✅
- `request.mapper.spec.ts` - 11 tests ✅
- `response.mapper.spec.ts` - 15 tests ✅

### 🔄 In Progress

None currently - ready for Phase 2

### ⏳ Remaining Work

**Phase 2: Service Integration (2-3 days)**
- Provider registration and factory integration
- Verification service integration
- End-to-end integration tests
- Manual testing with actual API
- Documentation updates

---

## What We've Built

### 1. HTTP Client (`external-http.client.ts`)

**All 11 IDmeta API Endpoints Implemented:**

1. ✅ `createVerification()` - POST /v1/verification/create-verification
2. ✅ `documentVerification()` - POST /v1/verification/document-verification
3. ✅ `idVerification()` - POST /v1/verification/id-verification
4. ✅ `faceVerification()` - POST /v1/verification/face-verification
5. ✅ `faceRegistration()` - POST /v1/verification/face-registration
6. ✅ `faceComparison()` - POST /v1/verification/face-comparison
7. ✅ `sendOtp()` - POST /v1/verification/send-otp
8. ✅ `verifyOtp()` - POST /v1/verification/verify-otp
9. ✅ `amlCheck()` - POST /v1/verification/aml-check
10. ✅ `finalizeVerification()` - POST /v1/verification/finalize-verification
11. ✅ `getResults()` - GET /v2/verification/get-verification/{id}
12. ✅ `cancelVerification()` - POST /v1/verification/cancel-verification
13. ✅ `healthCheck()` - GET /health

**Features:**
- Retry logic with exponential backoff
- Request/response interceptors for logging
- Correlation IDs for request tracking
- Timeout handling (30s default)
- Proper error transformation

### 2. Request Mapper (`request.mapper.ts`)

Maps internal KYC Adapter format → IDmeta API format

**Key Methods:**
- `toProviderCreateRequest()` - Session creation
- Template ID and verification ID mapping
- Callback URL configuration
- Metadata transformation

### 3. Response Mapper (`response.mapper.ts`)

Maps IDmeta API format → internal KYC Adapter format

**Key Methods:**
- `toInternalCreateResponse()` - Session creation response
- `toInternalStatusResponse()` - Verification results
- `fromWebhookPayload()` - Webhook event handling
- `extractValidatedData()` - User data extraction
- `mapProviderStatus()` - Status normalization

**Handles:**
- Personal info extraction
- Document validation results
- Biometric verification data
- AML checks (watchlist, sanctions, PEP)
- Error flags and risk assessment

### 4. Provider Adapter (`external.provider.ts`)

Implements `IKycProvider` interface

**Core Methods:**
- `initialize()` - Provider setup with credentials
- `createVerification()` - Start verification session
- `getVerificationStatus()` - Get results
- `cancelVerification()` - Cancel session
- `handleWebhook()` - Process webhook events
- `healthCheck()` - Provider health status
- `validateCredentials()` - Credential validation

**Provider Metadata:**
- Name: "IDmeta KYC Provider"
- Type: "external"
- Processing Mode: "async_webhook"
- Supports Templates: ✅
- Supports ID Verification: ✅
- Supports Async: ✅

---

## Architecture Decision

### Why We Built a "True Adapter" (Not Template Management)

**Original Plan:** Manage provider templates and plans in our database, sync periodically.

**Actual Implementation:** Pure adapter that translates between APIs, letting IDmeta manage its own templates.

**Rationale:**
1. ✅ **Simpler** - No template sync jobs or cron tasks
2. ✅ **More Reliable** - Always uses current provider data
3. ✅ **Less Coupling** - Provider can update templates without us knowing
4. ✅ **Easier Testing** - No database state to manage
5. ✅ **True Adapter Pattern** - We translate, not orchestrate

**What This Means:**
- Our adapter receives `template_id` and `verification_id` from clients
- We pass these directly to IDmeta
- IDmeta manages template definitions, steps, and workflow
- We focus purely on API translation and data mapping

---

## Remaining Tasks

### Phase 2: Service Integration & Testing (Days 1-3)

#### Task 2.1: Provider Registration & Factory
**Estimate:** 2 hours  
**Priority:** Critical

**Subtasks:**
- [ ] Register IDmeta provider in `ProviderFactory`
- [ ] Create database seed for provider entry
- [ ] Update provider capabilities in database:
  ```sql
  INSERT INTO providers (name, type, supports_webhooks, supports_hosted_workflow, api_version, base_url)
  VALUES ('IDmeta', 'external', true, false, 'v1', 'https://integrate.idmetagroup.com/api');
  ```
- [ ] Create test tenant configuration
- [ ] Test provider factory returns correct adapter

**Files to Create/Modify:**
```
src/providers/providers.factory.ts (MODIFY)
src/database/seeds/
  └── 010-idmeta-provider.seed.ts (NEW)
```

---

#### Task 2.2: Verification Service Integration
**Estimate:** 3 hours  
**Priority:** Critical

**Subtasks:**
- [ ] Update `VerificationsService` to use IDmeta provider
- [ ] Add provider selection logic based on tenant config
- [ ] Map verification request to provider format
- [ ] Store external verification ID in database
- [ ] Handle webhook callbacks
- [ ] Add error handling for provider failures

**Changes Needed:**
```typescript
// In VerificationsService
async create(tenantId: string, dto: CreateVerificationDto) {
  // 1. Get tenant's provider config
  const provider = await this.providerFactory.getProvider(tenantId);
  
  // 2. Create verification with provider
  const providerResponse = await provider.createVerification({
    tenantId,
    verificationType: dto.verificationType,
    templateId: dto.templateId, // New: required for IDmeta
    verificationId: dto.verificationId, // New: required for IDmeta
    callbackUrl: dto.callbackUrl,
    metadata: dto.metadata,
  });
  
  // 3. Store in database
  const verification = await this.verificationRepository.save({
    tenantId,
    providerId: provider.id,
    externalVerificationId: providerResponse.providerVerificationId,
    status: providerResponse.status,
    metadata: providerResponse.metadata,
  });
  
  return verification;
}
```

**Files to Modify:**
```
src/verifications/verifications.service.ts (MODIFY)
src/verifications/dto/create-verification.dto.ts (MODIFY - add templateId, verificationId)
```

---

#### Task 2.3: Webhook Handler Implementation
**Estimate:** 3 hours  
**Priority:** High

**Subtasks:**
- [ ] Create `POST /webhooks/idmeta` endpoint
- [ ] Verify webhook signature (HMAC SHA256)
- [ ] Parse webhook payload
- [ ] Update verification status in database
- [ ] Store provider response data
- [ ] Emit events for status changes
- [ ] Handle duplicate webhooks (idempotency)

**Implementation:**
```typescript
@Controller('webhooks')
export class WebhooksController {
  @Post('idmeta')
  async handleIdmetaWebhook(
    @Body() payload: any,
    @Headers('x-webhook-signature') signature: string,
  ) {
    // 1. Verify signature
    const provider = await this.providerFactory.getProvider('idmeta');
    const isValid = await provider.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    
    // 2. Process webhook
    const statusResponse = await provider.handleWebhook(payload);
    
    // 3. Update verification
    await this.verificationsService.updateFromWebhook(
      statusResponse.verificationId,
      statusResponse,
    );
    
    return { received: true };
  }
}
```

**Files to Create/Modify:**
```
src/webhooks/webhooks.controller.ts (MODIFY or NEW)
src/webhooks/dto/idmeta-webhook.dto.ts (NEW)
src/verifications/verifications.service.ts (MODIFY - add updateFromWebhook)
```

---

#### Task 2.4: Integration Tests
**Estimate:** 4 hours  
**Priority:** High

**Subtasks:**
- [ ] Create E2E test for full verification flow
- [ ] Test provider registration and selection
- [ ] Test webhook receipt and processing
- [ ] Test error handling scenarios
- [ ] Test multi-tenant isolation
- [ ] Mock IDmeta API responses

**Test Scenarios:**
```typescript
describe('IDmeta Integration (e2e)', () => {
  it('should create verification with IDmeta provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/verifications')
      .set('X-API-Key', tenantApiKey)
      .send({
        verificationType: 'document',
        templateId: 'template-123',
        verificationId: 'VER-123',
        callbackUrl: 'https://example.com/callback',
      })
      .expect(201);
    
    expect(response.body.id).toBeDefined();
    expect(response.body.status).toBe('pending');
  });
  
  it('should handle webhook and update status', async () => {
    const webhookPayload = {
      event_type: 'verification.completed',
      verification_id: 'VER-123',
      data: { status: 'completed', result: { decision: 'approved' } },
    };
    
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/idmeta')
      .set('x-webhook-signature', computeSignature(webhookPayload))
      .send(webhookPayload)
      .expect(200);
    
    const verification = await verificationsService.findOne('VER-123');
    expect(verification.status).toBe('completed');
  });
});
```

**Files to Create:**
```
test/integration/
  ├── idmeta-verification.e2e-spec.ts (NEW)
  ├── idmeta-webhook.e2e-spec.ts (NEW)
  └── multi-provider.e2e-spec.ts (NEW)
```

---

#### Task 2.5: Documentation Updates
**Estimate:** 2 hours  
**Priority:** Medium

**Subtasks:**
- [ ] Update API documentation with new fields (templateId, verificationId)
- [ ] Document webhook endpoint and signature verification
- [ ] Create integration guide for IDmeta
- [ ] Update Postman collection
- [ ] Add code examples for common flows
- [ ] Document error codes and handling

**Files to Update:**
```
README.md (MODIFY - add IDmeta section)
EXTERNAL_PROVIDER_INTEGRATION.md (UPDATE)
docs/
  ├── IDMETA_QUICK_START.md (NEW)
  ├── WEBHOOK_GUIDE.md (UPDATE)
  └── API_REFERENCE.md (UPDATE)
postman/KYC_Adapter_Collection.json (UPDATE)
```

---

#### Task 2.6: Manual Testing with Real API
**Estimate:** 3 hours  
**Priority:** Critical

**Prerequisites:**
- [ ] Obtain IDmeta API credentials (apiKey, apiSecret, webhookSecret)
- [ ] Get test template IDs from IDmeta
- [ ] Set up webhook endpoint (ngrok for local testing)
- [ ] Configure .env with credentials

**Test Checklist:**
```bash
# 1. Health Check
curl -H "Authorization: Bearer $IDMETA_API_KEY" \
  https://integrate.idmetagroup.com/api/health

# 2. Create Verification Session
curl -X POST \
  -H "Authorization: Bearer $IDMETA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "template-123",
    "verification_id": "VER-TEST-001",
    "callback_url": "https://your-ngrok-url.ngrok.io/api/v1/webhooks/idmeta"
  }' \
  https://integrate.idmetagroup.com/api/v1/verification/create-verification

# 3. Execute Document Verification
curl -X POST \
  -H "Authorization: Bearer $IDMETA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_id": "VER-TEST-001",
    "document_type": "passport",
    "document_image_front": "base64_encoded_image",
    "full_name": "John Doe"
  }' \
  https://integrate.idmetagroup.com/api/v1/verification/document-verification

# 4. Finalize Verification
curl -X POST \
  -H "Authorization: Bearer $IDMETA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "verification_id": "VER-TEST-001"
  }' \
  https://integrate.idmetagroup.com/api/v1/verification/finalize-verification

# 5. Get Results
curl -H "Authorization: Bearer $IDMETA_API_KEY" \
  https://integrate.idmetagroup.com/api/v2/verification/get-verification/VER-TEST-001
```

**Expected Results:**
- [ ] Session created successfully
- [ ] Document verification executed
- [ ] Verification finalized
- [ ] Results retrieved with validated data
- [ ] Webhook received and processed
- [ ] Database updated correctly

---

### Phase 3: Deployment Preparation (Day 4 - Optional)

#### Task 3.1: Environment Configuration
**Estimate:** 1 hour

**Subtasks:**
- [ ] Add production credentials to environment
- [ ] Configure webhook URL for production
- [ ] Set up monitoring alerts
- [ ] Configure log levels
- [ ] Test configuration validation

**Environment Variables:**
```bash
# IDmeta Configuration
IDMETA_API_URL=https://integrate.idmetagroup.com/api
IDMETA_API_KEY=prod_api_key_here
IDMETA_API_SECRET=prod_api_secret_here
IDMETA_WEBHOOK_SECRET=prod_webhook_secret_here
IDMETA_BASE_URL=https://integrate.idmetagroup.com/api

# Webhook Configuration
WEBHOOK_BASE_URL=https://your-production-domain.com
```

---

#### Task 3.2: Monitoring & Observability
**Estimate:** 2 hours

**Subtasks:**
- [ ] Add custom metrics for IDmeta provider
- [ ] Set up error rate alerts
- [ ] Configure response time monitoring
- [ ] Add webhook processing metrics
- [ ] Create health check dashboard

**Metrics to Track:**
```typescript
// Provider metrics
idmeta.verification.created (counter)
idmeta.verification.completed (counter)
idmeta.verification.failed (counter)
idmeta.api.response_time (histogram)
idmeta.webhook.received (counter)
idmeta.webhook.processed (counter)
idmeta.webhook.signature_invalid (counter)
```

---

#### Task 3.3: Security Review
**Estimate:** 1 hour

**Security Checklist:**
- [ ] API credentials encrypted at rest
- [ ] Webhook signature verification enabled
- [ ] Rate limiting on webhook endpoint
- [ ] No credentials logged
- [ ] HTTPS enforced for all API calls
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

---

## Testing Strategy

### Unit Tests ✅ COMPLETE

**Coverage: 100% (60 tests passing)**

- ✅ HTTP Client (16 tests)
- ✅ Provider Adapter (18 tests)
- ✅ Request Mapper (11 tests)
- ✅ Response Mapper (15 tests)

**Command:**
```bash
npm test -- src/providers/implementations/external
```

---

### Integration Tests 🔄 TODO

**Scenarios to Test:**

1. **Full Verification Flow**
   - Create verification with IDmeta
   - Execute verification steps
   - Receive webhook
   - Get final results

2. **Multi-Provider Support**
   - Tenant A uses Regula
   - Tenant B uses IDmeta
   - No cross-tenant interference

3. **Error Handling**
   - Invalid credentials
   - Network timeout
   - Provider API errors
   - Invalid webhook signatures

4. **Webhook Processing**
   - Valid webhook signature
   - Invalid signature rejected
   - Duplicate webhooks (idempotency)
   - Out-of-order webhooks

**Command:**
```bash
npm run test:e2e
```

---

### Manual Testing 🔄 TODO

**Test with Real IDmeta API:**

1. **Document Verification**
   - Upload passport image
   - Verify OCR extraction
   - Check validation results

2. **ID-Based Verification** (Philippine use case)
   - Verify using NBI clearance number
   - Verify using driver's license number
   - Check government database results

3. **Face Verification**
   - Register face
   - Verify against registered face
   - Compare two face images

4. **AML Check**
   - Test watchlist matching
   - Test sanctions screening
   - Test PEP verification

**Test Credentials Needed:**
- [ ] API Key
- [ ] API Secret
- [ ] Webhook Secret
- [ ] Test Template IDs

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (60/60) ✅
- [ ] All integration tests passing (0/4) ⏳
- [ ] Manual testing with real API completed
- [ ] Security review passed
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Database migration tested
- [ ] Rollback plan documented

---

### Deployment Steps

**1. Database Setup (5 minutes)**
```bash
# Run migration to add IDmeta support
npm run migration:run

# Seed IDmeta provider
npm run db:seed:idmeta
```

**2. Deploy Application (10 minutes)**
```bash
git checkout main
git pull origin main
npm install
npm run build
npm run start:prod
```

**3. Verify Deployment (5 minutes)**
```bash
# Health check
curl https://api.kyc-adapter.com/health

# Provider health check
curl -X GET https://api.kyc-adapter.com/api/v1/providers/health/idmeta

# Create test verification
curl -X POST https://api.kyc-adapter.com/api/v1/verifications \
  -H "X-API-Key: test_tenant_key" \
  -d '{"verificationType": "document", "templateId": "template-123", "verificationId": "VER-001"}'
```

---

### Post-Deployment Monitoring

**First 24 Hours:**
- [ ] Monitor error rates (target: < 1%)
- [ ] Monitor response times (target: < 2s for create, < 1s for status)
- [ ] Check webhook delivery rate (target: 100%)
- [ ] Review logs for anomalies
- [ ] Verify verification success rate (target: > 95%)

**Metrics Dashboard:**
```
Verifications Created: ___ per hour
Verifications Completed: ___ per hour
Average Response Time: ___ ms
Error Rate: ___ %
Webhook Success Rate: ___ %
```

---

### Rollback Plan

**Trigger Conditions:**
- Error rate > 5%
- Verification success rate < 80%
- Critical security issue
- Data corruption detected

**Rollback Steps (15 minutes):**
```bash
# 1. Disable IDmeta provider
UPDATE providers SET is_active = false WHERE name = 'IDmeta';

# 2. Revert code (if needed)
git revert <commit-hash>
npm install
npm run build
pm2 restart kyc-adapter

# 3. Notify team
echo "IDmeta provider disabled. Reverting to previous state."
```

---

## Success Criteria

### Functional Requirements ✅

- [x] HTTP client connects to all 11 IDmeta endpoints
- [x] Request mapper transforms data correctly
- [x] Response mapper extracts validated data
- [x] Provider adapter implements `IKycProvider`
- [x] Webhook signature verification works
- [x] Error handling comprehensive
- [x] All unit tests passing

### Functional Requirements ⏳

- [ ] Provider registered in factory
- [ ] Verifications service integrated
- [ ] Webhook endpoint processes events
- [ ] Database stores provider responses
- [ ] Integration tests passing
- [ ] Manual testing with real API successful
- [ ] Documentation complete

### Non-Functional Requirements

**Performance:**
- [ ] Verification creation < 3 seconds
- [ ] Status check < 1 second
- [ ] Webhook processing < 500ms

**Reliability:**
- [ ] 99.9% uptime
- [ ] Automatic retry on transient failures
- [ ] Graceful degradation on provider failure

**Security:**
- [ ] Credentials encrypted
- [ ] Webhook signatures verified
- [ ] No secrets in logs
- [ ] Rate limiting active

---

## Timeline Summary

### Week 1: Core Adapter ✅ COMPLETE
- **Days 1-5:** HTTP Client, Mappers, Provider Adapter, Unit Tests
- **Status:** 100% Complete (60 tests passing)

### Week 2: Integration & Testing 🔄 IN PROGRESS
- **Day 6 (Today):** Provider registration & service integration
- **Day 7:** Webhook handler & integration tests
- **Day 8:** Manual testing & documentation
- **Day 9:** Deployment prep & monitoring setup
- **Day 10:** Deploy to staging, final testing

---

## Key Decisions Made

### 1. ✅ True Adapter Pattern
**Decision:** Build a pure API adapter, not a template management system.

**Why:** Simpler, more reliable, less coupled to provider changes.

### 2. ✅ Webhook-First Architecture
**Decision:** Use webhooks for status updates, not polling.

**Why:** More efficient, real-time updates, less API load.

### 3. ✅ Multi-Step Support Without Orchestration
**Decision:** Provide all 11 endpoints but don't orchestrate workflow.

**Why:** Flexibility for clients, no complex state machine needed.

### 4. ✅ TypeScript-First Development
**Decision:** Strong typing for all API requests/responses.

**Why:** Catch errors at compile time, better IDE support, self-documenting.

---

## Next Immediate Steps (Today)

1. **Task 2.1:** Register IDmeta provider in factory (2 hours)
2. **Task 2.2:** Integrate with verifications service (3 hours)
3. **Test:** Verify provider selection and basic flow (1 hour)

**Command to Start:**
```bash
# Create provider seed
touch src/database/seeds/010-idmeta-provider.seed.ts

# Update factory
code src/providers/providers.factory.ts

# Update verifications service
code src/verifications/verifications.service.ts
```

---

## Questions to Resolve

1. **Template IDs:** Where do clients get valid template IDs? Do we need an endpoint to list them?
2. **Verification IDs:** Should we auto-generate verification IDs or require clients to provide them?
3. **Webhook URL:** What's the production webhook URL format? `/webhooks/idmeta` or `/webhooks/providers/idmeta`?
4. **Error Codes:** Do we map IDmeta error codes to our standard error codes?

---

## Resources

**Documentation:**
- [IDmeta Postman Collection](https://documenter.getpostman.com/view/46929893/2sB34mhJBq)
- [EXTERNAL_PROVIDER_INTEGRATION.md](./EXTERNAL_PROVIDER_INTEGRATION.md)
- [IDMETA_PROVIDER_FIX_SUMMARY.md](./IDMETA_PROVIDER_FIX_SUMMARY.md)

**Code:**
- [HTTP Client](./src/providers/implementations/external/external-http.client.ts)
- [Provider Adapter](./src/providers/implementations/external/external.provider.ts)
- [Request Mapper](./src/providers/implementations/external/mappers/request.mapper.ts)
- [Response Mapper](./src/providers/implementations/external/mappers/response.mapper.ts)

**Tests:**
- [HTTP Client Tests](./src/providers/implementations/external/external-http.client.spec.ts)
- [Provider Tests](./src/providers/implementations/external/external.provider.spec.ts)
- [Mapper Tests](./src/providers/implementations/external/mappers/)

---

**Document Version:** 2.0  
**Last Updated:** October 21, 2025  
**Status:** Phase 1 Complete, Phase 2 Ready to Start  

🚀 **Ready to proceed with service integration!**
