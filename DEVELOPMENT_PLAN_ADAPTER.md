# External KYC Provider Adapter - Development Plan

> **Architecture:** Adapter Pattern with Webhook-Driven Integration  
> **Timeline:** 1.5 Weeks (7 working days)  
> **Team Size:** 1-2 Developers  
> **Risk Level:** Low  
> **Focus:** Generic adapter that works with any external KYC provider

---

## Table of Contents

1. [Planning Overview](#planning-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Task Breakdown](#task-breakdown)
4. [Day-by-Day Implementation Plan](#day-by-day-implementation-plan)
5. [Data Storage Strategy](#data-storage-strategy)
6. [Success Criteria](#success-criteria)

---

## Planning Overview

### Objectives

1. ✅ **Generic Adapter Pattern** - Work with any external KYC provider
2. ✅ **Zero Breaking Changes** - Existing Regula integrations continue working
3. ✅ **Webhook-Driven Model** - Modern async provider integration
4. ✅ **Validated Data Storage** - Store user data and verification results
5. ✅ **Production Ready** - Proper error handling, logging, testing, security

### Scope

**In Scope:**
- ✅ Generic external provider adapter implementation
- ✅ Webhook handler for status updates
- ✅ Request/response mappers (our format ↔ provider format)
- ✅ Validated user data storage (inquiries, accounts, documents)
- ✅ Hosted workflow support (redirect to provider UI)
- ✅ Webhook signature verification
- ✅ Unit and integration tests
- ✅ Documentation

**Out of Scope (Future Phases):**
- ❌ Provider-specific template management
- ❌ Provider-specific plan management
- ❌ Custom workflow builder
- ❌ Advanced AML screening configuration

### Key Constraints

1. **No API Changes** - Client API must remain backward compatible
2. **Performance** - Webhook processing < 500ms, verification creation < 2s
3. **Reliability** - 99.9% uptime requirement, webhook retry logic
4. **Security** - Webhook signature verification, encrypted credentials, audit logs

---

## Architecture Decisions

### Decision 1: Adapter Pattern (Not Provider Management)

**Problem:** How to integrate with external KYC providers without managing their business logic?

**Solution:** Implement a pure adapter pattern.

**Flow:**
```
1. Client → KYC Adapter: "Create verification"
2. KYC Adapter → External Provider: "Create verification" (provider handles templates/plans)
3. External Provider → KYC Adapter: "Verification created, here's the workflow URL"
4. KYC Adapter: Store verification_id and workflow_url
5. External Provider → KYC Adapter: Webhook with status updates
6. KYC Adapter: Update verification status and store validated data
```

**Rationale:**
- ✅ True adapter pattern - we adapt, don't manage
- ✅ Provider agnostic - works with any provider
- ✅ Simpler code - less complexity, easier to maintain
- ✅ Faster implementation - focus on core adapter functionality
- ✅ Future proof - easy to add new providers

---

### Decision 2: Validated Data Storage

**Problem:** Where do we store validated user data and verification results?

**Solution:** Use existing inquiry/account/document tables for validated data storage.

**Data Flow:**
```
1. Client creates verification request
2. KYC Adapter creates inquiry record
3. External provider validates user data
4. Webhook returns validated data
5. KYC Adapter stores validated data in inquiry.validated_data
6. KYC Adapter creates/updates account record with validated info
7. KYC Adapter stores documents and validation results
```

**Tables Used:**
- `inquiries` - Verification requests and validated user data
- `accounts` - Validated user information
- `documents` - Uploaded documents and validation results
- `inquiry_templates` - Tenant-specific verification configurations
- `inquiry_sessions` - User sessions during verification

**Rationale:**
- ✅ Reuse existing data model
- ✅ Store validated user data (our goal!)
- ✅ Maintain data relationships
- ✅ Support multi-tenant architecture

---

### Decision 3: Minimal Database Changes

**Problem:** Need to track provider-specific data without breaking existing schema.

**Solution:** Add minimal columns to existing tables, optional audit table.

**New Columns:**
```sql
-- providers table
supports_webhooks BOOLEAN
supports_hosted_workflow BOOLEAN
webhook_secret VARCHAR(255)
api_version VARCHAR(20)
base_url VARCHAR(500)

-- verifications table
external_verification_id VARCHAR(255)
external_workflow_url TEXT
webhook_received_at TIMESTAMP
last_webhook_event VARCHAR(100)
provider_response JSONB
validated_user_data JSONB

-- inquiries table (enhanced for adapter integration)
verification_id UUID
provider_verification_id VARCHAR(255)
verification_status VARCHAR(50)
validated_data JSONB
provider_response JSONB
webhook_events JSONB

-- webhook_logs table (for debugging)
id UUID PRIMARY KEY
verification_id UUID
provider_id UUID
event_type VARCHAR(100)
payload JSONB
status VARCHAR(20)
retry_count INTEGER
error_message TEXT
processed_at TIMESTAMP
created_at TIMESTAMP
```

**Rationale:**
- ✅ Minimal schema changes
- ✅ Backward compatible
- ✅ Easy to rollback
- ✅ Focus on adapter functionality

---

## Task Breakdown

### Phase 1: Foundation (Days 1-2)

#### Task 1.1: Database Schema Updates
**Estimate:** 2 hours  
**Priority:** Critical  
**Dependencies:** None

**Subtasks:**
- [ ] Create migration to remove provider-specific tables
- [ ] Add essential columns to providers table
- [ ] Add essential columns to verifications table
- [ ] Enhance inquiries table for adapter integration
- [ ] Create webhook_logs table for debugging
- [ ] Add indexes for performance
- [ ] Test migrations on local DB

**Acceptance Criteria:**
- Migrations run without errors
- Rollback works correctly
- Indexes improve query performance
- No breaking changes to existing queries

---

#### Task 1.2: HTTP Client
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 1.1

**Subtasks:**
- [ ] Create `ExternalHttpClient` class
- [ ] Implement `configure(apiKey, baseUrl)` method
- [ ] Implement `createVerification(request)` API call
- [ ] Implement `getVerificationStatus(verificationId)` API call
- [ ] Implement `cancelVerification(verificationId)` API call
- [ ] Add retry logic with exponential backoff
- [ ] Add timeout handling (30s default)
- [ ] Add request/response logging
- [ ] Test with provider test account

**Acceptance Criteria:**
- All API endpoints accessible
- Proper error handling with typed exceptions
- Request logging includes correlation IDs
- Retries on 5xx errors (max 3 attempts)
- Timeout after 30 seconds

---

#### Task 1.3: Request/Response Mappers
**Estimate:** 3 hours  
**Priority:** Critical  
**Dependencies:** Task 1.2

**Subtasks:**
- [ ] Create `ExternalRequestMapper` class
- [ ] Implement `toProviderCreateRequest(verificationRequest)` method
- [ ] Create `ExternalResponseMapper` class
- [ ] Implement `toVerificationResponse(providerResponse)` method
- [ ] Implement `toStatusResponse(providerStatus)` method
- [ ] Implement `fromWebhookToStatus(webhookPayload)` method
- [ ] Add unit tests for all mappers
- [ ] Test edge cases (missing fields, null values)

**Acceptance Criteria:**
- All request fields mapped correctly
- All response fields mapped correctly
- Webhook payloads parsed correctly
- Unit tests achieve 90%+ coverage
- Edge cases handled gracefully

---

### Phase 2: Adapter & Webhook Integration (Days 3-5)

#### Task 2.1: Provider Adapter Implementation
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 1.3

**Subtasks:**
- [ ] Create `ExternalProvider` class implementing `IKycProvider`
- [ ] Implement `initialize(credentials, config)` method
- [ ] Implement `createVerification(request)` method
- [ ] Implement `getVerificationStatus(providerVerificationId)` method
- [ ] Implement `cancelVerification(providerVerificationId)` method
- [ ] Implement `handleWebhook(payload, signature)` method
- [ ] Implement `healthCheck()` method
- [ ] Implement `validateCredentials()` method
- [ ] Add comprehensive error handling
- [ ] Add detailed logging
- [ ] Unit tests with mocked HTTP client

**Acceptance Criteria:**
- Implements `IKycProvider` interface correctly
- All methods work end-to-end
- Webhook signature validation working
- Error cases handled with clear messages
- Unit tests achieve 85%+ coverage

---

#### Task 2.2: Webhook Handler
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 2.1

**Subtasks:**
- [ ] Create `ProviderWebhookController`
- [ ] Implement `POST /webhooks/provider` endpoint
- [ ] Create `ProviderWebhookService`
- [ ] Implement `processWebhook(payload, signature)` method
- [ ] Add error handling
- [ ] Add idempotency check
- [ ] Add retry mechanism for transient errors
- [ ] Update inquiry records with validated data
- [ ] Update account records with validated info
- [ ] Unit tests with mock repository

**Acceptance Criteria:**
- Webhook endpoint accepts POST requests
- Signature validation working
- All event types handled correctly
- Verification status updated in DB
- Validated data stored in inquiry records
- Webhook logs created for audit trail
- Idempotency prevents duplicate processing
- Returns 200 even on errors

---

#### Task 2.3: Provider Registration
**Estimate:** 2 hours  
**Priority:** High  
**Dependencies:** Task 2.1, 2.2

**Subtasks:**
- [ ] Update `ProviderFactory` to include external provider
- [ ] Create database seed for provider entry
- [ ] Create tenant configuration seed for testing
- [ ] Update provider selection logic
- [ ] Test factory returns correct adapter
- [ ] Document provider registration process

**Acceptance Criteria:**
- Provider appears in provider factory
- Database seed idempotent
- Tenant can be configured with provider
- Factory correctly instantiates adapter
- Documentation clear and accurate

---

### Phase 3: Testing & Polish (Days 6-7)

#### Task 3.1: Integration Tests
**Estimate:** 4 hours  
**Priority:** High  
**Dependencies:** Task 2.3

**Subtasks:**
- [ ] Create integration test for document verification
- [ ] Create integration test for hosted workflow
- [ ] Create integration test for webhook signature validation
- [ ] Create integration test for multi-tenant isolation
- [ ] Test error handling and retry logic
- [ ] Test webhook idempotency
- [ ] Test validated data storage

**Acceptance Criteria:**
- All E2E scenarios pass
- Real provider test account used (or mocked consistently)
- Webhook handling tested end-to-end
- Signature validation tested
- No cross-tenant data leaks
- Validated data properly stored
- All tests pass consistently

---

#### Task 3.2: Documentation & Examples
**Estimate:** 3 hours  
**Priority:** Medium  
**Dependencies:** Task 3.1

**Subtasks:**
- [ ] Update Swagger/OpenAPI documentation
- [ ] Create code examples
- [ ] Update Postman collection
- [ ] Create integration guide
- [ ] Document webhook events and payloads
- [ ] Document environment variables
- [ ] Document deployment steps

**Acceptance Criteria:**
- Swagger UI shows all workflows
- Code examples are copy-paste ready
- Postman collection includes provider flows
- README section explains workflows clearly
- Webhook events documented
- Environment variables documented

---

## Data Storage Strategy

### Validated User Data Flow

```
1. Client Request
   ↓
2. Create Inquiry Record
   ↓
3. Call External Provider
   ↓
4. Store Provider Response
   ↓
5. Webhook with Validated Data
   ↓
6. Update Inquiry with Validated Data
   ↓
7. Create/Update Account Record
   ↓
8. Store Documents & Results
```

### Key Tables

**`inquiries`** - Main verification tracking
- `verification_id` - Links to verifications table
- `provider_verification_id` - External provider's ID
- `validated_data` - JSONB with validated user information
- `provider_response` - JSONB with full provider response
- `webhook_events` - JSONB array of webhook events

**`accounts`** - Validated user information
- Standard user fields (name, email, etc.)
- Validated by external provider
- Linked to inquiries

**`documents`** - Uploaded documents and validation
- Document metadata
- Validation results from provider
- Linked to inquiries

**`verifications`** - Provider communication tracking
- `external_verification_id` - Provider's verification ID
- `external_workflow_url` - Provider's hosted workflow URL
- `provider_response` - Full provider response
- `validated_user_data` - Extracted validated data

---

## Day-by-Day Implementation Plan (1.5 Weeks)

### Day 1: Database & HTTP Client
**Goal:** Set up database schema and provider API client

**Tasks:**
- ✅ Task 1.1: Database Schema Updates (2h)
- ✅ Task 1.2: HTTP Client (4h)
- ✅ Test HTTP client with provider test account (1h)
- ✅ Code review and commit (1h)

**Deliverables:**
- Migrations tested and committed
- HTTP client working with provider API
- Test verification can be created
- PR #1: "External Provider Adapter Foundation"

---

### Day 2: Mappers & Provider Adapter
**Goal:** Transform data between our format and provider's

**Tasks:**
- ✅ Task 1.3: Request/Response Mappers (3h)
- ✅ Task 2.1: Provider Implementation (4h)
- ✅ Code review (1h)

**Deliverables:**
- Request/response mappers complete
- Provider implements IKycProvider
- PR #2: "External Provider Adapter & Mappers"

---

### Day 3: Webhook Handler
**Goal:** Receive and process webhook callbacks

**Tasks:**
- ✅ Task 2.2: Webhook Handler (4h)
- ✅ Test webhook with ngrok (2h)
- ✅ Test signature verification (1h)
- ✅ Code review (1h)

**Deliverables:**
- Webhook endpoint operational
- Signature verification working
- Webhook updates verification status
- Validated data stored in inquiries
- PR #3: "Provider Webhook Handler"

---

### Day 4: Provider Registration & Testing
**Goal:** Register provider in factory and test end-to-end

**Tasks:**
- ✅ Task 2.3: Provider Registration (2h)
- ✅ Manual end-to-end testing (4h)
- ✅ Fix bugs found (1h)
- ✅ Code review (1h)

**Deliverables:**
- Provider registered in provider factory
- Full verification flow working
- Validated data properly stored
- PR #4: "External Provider Registration"

---

### Day 5: Integration Tests
**Goal:** Comprehensive testing of all scenarios

**Tasks:**
- ✅ Task 3.1: Integration Tests (6h)
- ✅ Fix any issues found (1h)
- ✅ Code review (1h)

**Deliverables:**
- All E2E tests passing
- Validated data storage tested
- PR #5: "External Provider Integration Tests"

---

### Day 6: Documentation
**Goal:** Complete developer documentation

**Tasks:**
- ✅ Task 3.2: Documentation & Examples (5h)
- ✅ Update Postman collection (2h)
- ✅ Code review (1h)

**Deliverables:**
- Swagger docs complete
- Integration guides published
- PR #6: "External Provider Documentation"

---

### Day 7: Final Testing & Deployment
**Goal:** Ensure everything works perfectly

**Tasks:**
- ✅ Full regression testing (4h)
- ✅ Fix any remaining bugs (2h)
- ✅ Final code review (1h)
- ✅ Deployment preparation (1h)

**Deliverables:**
- All tests passing
- Zero critical bugs
- Ready for production deployment
- PR #7: "Final Polish & Deployment Ready"

**🎉 External Provider Adapter Complete! 🚀**

---

## Success Criteria

### Functional Requirements

- [ ] Provider implements `IKycProvider` interface
- [ ] Document verification works end-to-end
- [ ] Hosted workflow redirects working
- [ ] Webhooks received and processed correctly
- [ ] Validated user data stored in inquiries
- [ ] Account records updated with validated info
- [ ] Existing Regula integrations unaffected
- [ ] Signature verification prevents spoofed webhooks

### Non-Functional Requirements

**Performance:**
- [ ] Verification creation < 2 seconds
- [ ] Status retrieval < 1 second
- [ ] Webhook processing < 500ms

**Reliability:**
- [ ] 99.9% uptime
- [ ] Zero data loss
- [ ] Automatic recovery from transient failures

**Security:**
- [ ] Credentials encrypted
- [ ] No secrets in logs
- [ ] Webhook signatures verified
- [ ] SQL injection protected

**Maintainability:**
- [ ] 85%+ test coverage
- [ ] All code documented
- [ ] Logging comprehensive
- [ ] Runbooks complete

---

**Document End**

*Ready to start coding? Follow Day 1 tasks! 🚀*
