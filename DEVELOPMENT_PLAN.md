# External KYC Provider Integration - Development Plan

> **Integration Approach:** Webhook-Driven Architecture  
> **Timeline:** 2 Weeks (10 working days)  
> **Team Size:** 1-2 Developers  
> **Risk Level:** Low  
> **Reference:** Based on modern webhook-driven KYC provider APIs

---

## Table of Contents

1. [Planning Overview](#planning-overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Task Breakdown](#task-breakdown)
4. [Day-by-Day Implementation Plan](#day-by-day-implementation-plan)
5. [Quality Assurance](#quality-assurance)
6. [Risk Management](#risk-management)
7. [Success Criteria](#success-criteria)

---

## Planning Overview

### Objectives

1. ✅ **Maintain Generic Architecture** - Keep multi-provider support intact
2. ✅ **Zero Breaking Changes** - Existing Regula integrations continue working
3. ✅ **Webhook-Driven Model** - Modern async provider integration
4. ✅ **Hosted Workflow Support** - Leverage provider's white-labeled UI
5. ✅ **Production Ready** - Proper error handling, logging, testing, security

### Scope

**In Scope:**
- ✅ External provider adapter implementation
- ✅ Webhook handler for status updates
- ✅ Request/response mappers (our format ↔ provider format)
- ✅ Database schema updates (minimal)
- ✅ Hosted workflow support (redirect to provider UI)
- ✅ Government registry verification (if supported)
- ✅ Webhook signature verification
- ✅ Unit and integration tests
- ✅ Documentation

**Out of Scope (Future Phases):**
- ❌ Custom workflow builder
- ❌ Template management UI
- ❌ Advanced AML screening configuration
- ❌ Multi-language support

### Key Constraints

1. **No API Changes** - Client API must remain backward compatible
2. **Performance** - Webhook processing < 500ms, verification creation < 2s
3. **Reliability** - 99.9% uptime requirement, webhook retry logic
4. **Security** - Webhook signature verification, encrypted credentials, audit logs

---

## Architecture Decisions

### Decision 1: Webhook-Driven (Not Multi-Step Orchestration)

**Problem:** How to integrate async verification providers?

**Solution:** Embrace webhook-driven architecture.

**Flow:**
```
1. Client creates verification via our API
2. We call Provider's /verifications/create
3. Provider returns verification_id + workflow_url + status "pending"
4. Provider processes verification internally
5. Provider sends webhooks on status changes
6. We handle webhooks, update DB
7. Client polls our API for updated status
```

**Rationale:**
- ✅ Aligns with modern provider API designs
- ✅ Simpler than multi-step orchestration
- ✅ Provider handles all workflow complexity
- ✅ Natural event-driven architecture via webhooks
- ✅ Faster implementation (2 weeks vs 3 weeks)

---

### Decision 2: Minimal Database Changes

**Problem:** Need to track provider-specific data without breaking existing schema.

**Solution:** Add columns to existing tables, optional audit table.

**New Columns:**
```sql
-- verifications table
external_verification_id VARCHAR(255) UNIQUE
external_workflow_url TEXT
external_template_id VARCHAR(255)
webhook_received_at TIMESTAMP
last_webhook_event VARCHAR(100)

-- providers table
supports_webhooks BOOLEAN
supports_hosted_workflow BOOLEAN
webhook_secret VARCHAR(255)
```

**Rationale:**
- ✅ Minimal schema changes
- ✅ No new tables required (except optional audit log)
- ✅ Backward compatible
- ✅ Easy to rollback

---

### Decision 3: Hosted Workflow Preference

**Problem:** Should we upload documents or redirect to provider UI?

**Solution:** Support both, prefer hosted workflow.

**Hosted Workflow:**
```
Client → Create verification (no documents) →
Provider returns workflow_url →
Redirect user to workflow_url →
User uploads on Provider's UI →
Webhook notifies us
```

**API Workflow:**
```
Client → Create verification (with documents) →
Provider processes documents →
Webhook notifies us
```

**Rationale:**
- ✅ Hosted workflow provides better UX
- ✅ Reduces our bandwidth
- ✅ Provider handles document validation
- ✅ White-labeled, seamless experience

---

### Decision 4: Webhook Security

**Problem:** Webhooks can be spoofed.

**Solution:** Verify HMAC SHA-256 signatures on all webhooks.

**Implementation:**
```typescript
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', webhookSecret);
const expectedSignature = 'sha256=' + hmac.update(rawBody).digest('hex');

if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid signature');
}
```

**Rationale:**
- ✅ Prevents spoofed webhooks
- ✅ Standard practice (GitHub, Stripe use same method)
- ✅ Simple to implement

---

## Task Breakdown

### Phase 1: Foundation (Days 1-3)

#### Task 1.1: Database Schema Updates
**Estimate:** 2 hours  
**Priority:** Critical  
**Dependencies:** None

**Subtasks:**
- [ ] Create migration for `verifications` table updates
- [ ] Create migration for `providers` table updates
- [ ] Create optional `webhook_logs` table for audit trail
- [ ] Add indexes for performance
- [ ] Write rollback migration
- [ ] Test migrations on local DB

**Acceptance Criteria:**
- Migrations run without errors
- Rollback works correctly
- Indexes improve query performance
- No breaking changes to existing queries

**Files to Create:**
```
src/database/migrations/
  └── [timestamp]-AddExternalProviderSupport.ts (NEW)
src/database/entities/
  └── webhook-log.entity.ts (NEW - optional)
```

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
- [ ] Implement `getTemplates()` API call
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
- Test account verification succeeds

**Files to Create:**
```
src/providers/implementations/external/
  ├── external-http.client.ts (NEW)
  ├── external-http.client.spec.ts (NEW)
  └── types/
      ├── provider-api.types.ts (NEW)
      └── provider-request.types.ts (NEW)
```

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

**Files to Create:**
```
src/providers/implementations/external/mappers/
  ├── request.mapper.ts (NEW)
  ├── request.mapper.spec.ts (NEW)
  ├── response.mapper.ts (NEW)
  └── response.mapper.spec.ts (NEW)
```

---

### Phase 2: Provider & Webhook Integration (Days 4-7)

#### Task 2.1: Provider Implementation
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

**Files to Create:**
```
src/providers/implementations/external/
  ├── external.provider.ts (NEW)
  ├── external.provider.spec.ts (NEW)
  └── index.ts (NEW)
```

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
- [ ] Unit tests with mock repository

**Acceptance Criteria:**
- Webhook endpoint accepts POST requests
- Signature validation working
- All event types handled correctly
- Verification status updated in DB
- Webhook logs created for audit trail
- Idempotency prevents duplicate processing
- Returns 200 even on errors
- Unit tests achieve 85%+ coverage

**Files to Create:**
```
src/webhooks/
  ├── provider-webhook.controller.ts (NEW)
  ├── provider-webhook.controller.spec.ts (NEW)
  ├── provider-webhook.service.ts (NEW)
  ├── provider-webhook.service.spec.ts (NEW)
  └── types/
      └── provider-webhook.types.ts (NEW)
```

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

**Files to Create/Modify:**
```
src/providers/
  └── providers.factory.ts (MODIFY)
src/database/seeds/
  ├── 008-external-provider.seed.ts (NEW)
  └── 009-test-tenant-external.seed.ts (NEW)
```

---

### Phase 3: Testing & Polish (Days 8-10)

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

**Acceptance Criteria:**
- All E2E scenarios pass
- Real provider test account used (or mocked consistently)
- Webhook handling tested end-to-end
- Signature validation tested
- No cross-tenant data leaks
- All tests pass consistently

**Files to Create:**
```
test/integration/
  ├── external-verification.e2e-spec.ts (NEW)
  ├── external-webhook.e2e-spec.ts (NEW)
  └── multi-tenant-external.e2e-spec.ts (NEW)
test/fixtures/
  └── external-test-data.ts (NEW)
```

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

**Files to Modify:**
```
src/verifications/verifications.controller.ts (MODIFY)
src/webhooks/provider-webhook.controller.ts (MODIFY)
README.md (MODIFY)
docs/
  ├── PROVIDER_HOSTED_WORKFLOW.md (NEW)
  └── PROVIDER_WEBHOOKS.md (NEW)
```

---

#### Task 3.3: Security Hardening & Monitoring
**Estimate:** 3 hours  
**Priority:** High  
**Dependencies:** Task 3.1

**Subtasks:**
- [ ] Review webhook signature verification
- [ ] Add rate limiting to webhook endpoint
- [ ] Add structured logging with correlation IDs
- [ ] Add metrics collection
- [ ] Add health checks
- [ ] Configure log aggregation
- [ ] Document monitoring setup

**Acceptance Criteria:**
- All logs include correlation IDs
- Webhook signature verification robust
- Rate limiting prevents abuse
- Metrics exported
- Health check returns accurate status
- Log levels configurable
- Monitoring guide documented

**Files to Create:**
```
src/common/
  ├── logging/
  │   └── correlation-id.middleware.ts (MODIFY)
  └── health/
      └── external-provider.health.ts (NEW)
docs/
  └── MONITORING.md (NEW)
```

---

## Day-by-Day Implementation Plan (2 Weeks)

### Week 1: Foundation & Core Integration

#### Day 1 (Monday): Database & HTTP Client
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
- PR #1: "External Provider Foundation"

**End of Day Checklist:**
- [ ] Migrations run successfully
- [ ] Provider API accessible via HTTP client
- [ ] Test verification created successfully
- [ ] No breaking changes

---

#### Day 2 (Tuesday): Mappers & Provider Adapter
**Goal:** Transform data between our format and provider's

**Tasks:**
- ✅ Task 1.3: Request/Response Mappers (3h)
- ✅ Task 2.1: Provider Implementation (4h)
- ✅ Code review (1h)

**Deliverables:**
- Request/response mappers complete
- Provider implements IKycProvider
- PR #2: "External Provider & Mappers"

**End of Day Checklist:**
- [ ] Mappers transform data correctly
- [ ] Provider adapter compiles without errors
- [ ] Unit tests for mappers passing
- [ ] Provider can create verification

---

#### Day 3 (Wednesday): Webhook Handler
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
- PR #3: "Provider Webhook Handler"

**End of Day Checklist:**
- [ ] Webhook endpoint accepts POST
- [ ] Signature validation working
- [ ] Verification status updated on webhook
- [ ] Webhook logs created

---

#### Day 4 (Thursday): Provider Registration & Testing
**Goal:** Register provider in factory and test end-to-end

**Tasks:**
- ✅ Task 2.3: Provider Registration (2h)
- ✅ Manual end-to-end testing (4h)
- ✅ Fix bugs found (1h)
- ✅ Code review (1h)

**Deliverables:**
- Provider registered in provider factory
- Full verification flow working
- PR #4: "External Provider Registration"

**End of Day Checklist:**
- [ ] Factory returns provider correctly
- [ ] Full flow works (create → webhook → status)
- [ ] Hosted workflow URL accessible
- [ ] Regula provider still works

---

#### Day 5 (Friday): Integration Tests
**Goal:** Comprehensive testing of all scenarios

**Tasks:**
- ✅ Task 3.1: Integration Tests (6h)
- ✅ Fix any issues found (1h)
- ✅ Code review (1h)

**Deliverables:**
- All E2E tests passing
- PR #5: "External Provider Integration Tests"

**End of Day Checklist:**
- [ ] Document verification test passing
- [ ] Hosted workflow test passing
- [ ] Webhook handling test passing
- [ ] Multi-tenant isolation verified

**Weekend Break** 🎉

---

### Week 2: Polish, Documentation & Deployment

#### Day 6 (Monday): Documentation
**Goal:** Complete developer documentation

**Tasks:**
- ✅ Task 3.2: Documentation & Examples (5h)
- ✅ Update Postman collection (2h)
- ✅ Code review (1h)

**Deliverables:**
- Swagger docs complete
- Integration guides published
- PR #6: "External Provider Documentation"

**End of Day Checklist:**
- [ ] Swagger UI accurate
- [ ] Code examples work
- [ ] Postman collection updated
- [ ] Webhook events documented

---

#### Day 7 (Tuesday): Security & Monitoring
**Goal:** Harden security and add observability

**Tasks:**
- ✅ Task 3.3: Security Hardening & Monitoring (5h)
- ✅ Performance testing (2h)
- ✅ Code review (1h)

**Deliverables:**
- Security measures in place
- Monitoring operational
- PR #7: "Security & Monitoring"

**End of Day Checklist:**
- [ ] Correlation IDs in all logs
- [ ] Webhook signature verification robust
- [ ] Rate limiting active
- [ ] Health checks working

---

#### Day 8 (Wednesday): Final Testing & Bug Fixes
**Goal:** Ensure everything works perfectly

**Tasks:**
- ✅ Full regression testing (4h)
- ✅ Fix any remaining bugs (3h)
- ✅ Final code review (1h)

**Deliverables:**
- All tests passing
- Zero critical bugs
- PR #8: "Final Polish & Bug Fixes"

**End of Day Checklist:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] No linter warnings
- [ ] Performance acceptable

---

#### Day 9 (Thursday): Deployment Preparation
**Goal:** Prepare for production deployment

**Tasks:**
- ✅ Create deployment runbook (3h)
- ✅ Test database migrations (2h)
- ✅ Prepare rollback plan (2h)
- ✅ Team review (1h)

**Deliverables:**
- Deployment guide complete
- Rollback plan documented
- All stakeholders briefed

**End of Day Checklist:**
- [ ] Deployment steps documented
- [ ] Rollback plan tested
- [ ] Team understands process
- [ ] Production credentials ready

---

#### Day 10 (Friday): Deployment
**Goal:** Deploy to staging and prepare for production

**Tasks:**
- ✅ Deploy to staging (2h)
- ✅ Smoke tests on staging (2h)
- ✅ Update production documentation (2h)
- ✅ Team demo and knowledge transfer (2h)

**Deliverables:**
- Staging deployment successful
- Production deployment guide complete
- Team trained

**End of Day Checklist:**
- [ ] Staging deployment verified
- [ ] Smoke tests passing
- [ ] Deployment runbook complete
- [ ] Team understands architecture
- [ ] Ready for production deployment

**🎉 External Provider Integration Complete! 🚀**

---

## Quality Assurance

### Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types
- All functions have return type annotations
- ESLint passing with zero warnings

**Testing:**
- Unit test coverage ≥ 85%
- Integration tests for critical paths
- All tests must pass before merge

**Code Review:**
- All PRs require 1 approval
- Review checklist includes tests, security, performance, documentation

### Performance Benchmarks

**API Operations:**
- Verification creation: < 2 seconds
- Status retrieval: < 1 second
- Webhook processing: < 500ms

---

## Risk Management

### Risk 1: Provider API Changes

**Probability:** Low  
**Impact:** High  
**Mitigation:**
- Version lock API endpoints
- Monitor provider status page
- Have fallback error handling

**Contingency:**
- Quick rollback to Regula provider
- Update adapter within 24-48 hours

---

### Risk 2: Webhook Delivery Failures

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement polling fallback
- Provider retries failed webhooks
- Log all webhook attempts

**Contingency:**
- Manual status polling for affected verifications
- Review webhook logs

---

### Risk 3: Signature Verification Issues

**Probability:** Low  
**Impact:** High  
**Mitigation:**
- Thoroughly test signature verification
- Log signatures securely
- Document algorithm clearly

**Contingency:**
- Temporarily disable (with alert)
- Investigate cause
- Re-enable after fix

---

## Success Criteria

### Functional Requirements

- [ ] Provider implements `IKycProvider` interface
- [ ] Document verification works end-to-end
- [ ] Hosted workflow redirects working
- [ ] Webhooks received and processed correctly
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

## Deployment Checklist

### Pre-Deployment

- [ ] Provider API credentials obtained
- [ ] Test account verified
- [ ] Database migrations tested
- [ ] Webhook endpoint secured
- [ ] All tests passing
- [ ] Documentation updated

### Deployment Steps

1. **Database Migration:**
```bash
npm run migration:run
```

2. **Configure Provider:**
```sql
INSERT INTO providers (name, type, is_active, supports_webhooks, supports_hosted_workflow, credentials)
VALUES (
  'External KYC Provider',
  'external',
  true,
  true,
  true,
  jsonb_build_object(
    'apiKey', 'encrypted_api_key',
    'webhookSecret', 'encrypted_webhook_secret',
    'baseUrl', 'https://provider-api.com/api/v1'
  )
);
```

3. **Configure Webhook URL in Provider Dashboard**

4. **Smoke Tests**

### Post-Deployment

- [ ] Monitor webhook delivery
- [ ] Check verification completion rates
- [ ] Verify workflow URLs accessible
- [ ] Review webhook logs

---

**Document End**

*Ready to start coding? Follow Day 1 tasks! 🚀*

