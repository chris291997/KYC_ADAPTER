# Verification Provider Integration - Development Plan

> **Integration Approach:** Template-First + Event-Driven (Async + WebSockets)  
> **Timeline:** 3 Weeks (15 working days)  
> **Team Size:** 1-2 Developers  
> **Risk Level:** Low-Medium

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
3. ✅ **Template-First Approach** - Use external provider templates for faster implementation
4. ✅ **Future-Proof** - Design allows upgrade to hybrid (template + custom) later
5. ✅ **Production Ready** - Proper error handling, logging, testing

### Scope

**In Scope:**
- ✅ Provider adapter implementation
- ✅ Template synchronization from external provider API
- ✅ Multi-step workflow handling (abstracted from client)
- ✅ Database schema updates
- ✅ Template-based verification
- ✅ ID-based verification (Philippine gov databases)
- ✅ Provider registration and configuration
- ✅ Unit and integration tests
- ✅ Documentation
 - ✅ Async event-driven processing (queue + worker + event bus)
 - ✅ WebSocket gateway for real-time progress updates
 - ✅ Async endpoint (POST /verifications/async) + polling fallback
 - ✅ Webhook dispatcher for completion notifications

**Out of Scope (Future Phases):**
- ❌ Custom workflow builder (non-template)
 - ❌ GraphQL/SSE alternative transport (optional)
- ❌ Advanced AML screening
- ❌ Admin UI for template management
- ❌ Multi-language support for verification UI

### Key Constraints

1. **No API Changes** - Client API must remain backward compatible
2. **Performance** - Multi-step workflow should complete in < 30 seconds
3. **Reliability** - 99.9% uptime requirement
4. **Security** - API credentials encrypted, PII protected

---

## Architecture Decisions

### Decision 1: Adapter Pattern for Multi-Step Workflow + Async Mode

**Problem:** Some providers use multi-step workflows; our API is single-step.

**Solution:** The provider adapter manages steps for sync requests; async mode offloads steps to background workers and streams progress via WebSockets.

```
Client makes 1 call (202) → Queue job → Worker runs steps → Events → WebSocket updates
```

**Rationale:**
- ✅ No breaking changes to client API
- ✅ Complexity hidden from clients
- ✅ Easier testing and debugging
- ❌ Longer processing time (acceptable trade-off)

**Alternatives Considered:**
- ❌ Expose multi-step workflow to clients → Breaks existing API
- ❌ Create vendor-specific endpoints → API fragmentation

---

### Decision 2: Database-Backed Template Caching

**Problem:** Provider templates change infrequently, fetching on every request is wasteful.

**Solution:** Cache templates in database, sync periodically.

```
Verification Request → Check DB for template → Use cached data
Background job → Sync templates every 24 hours
```

- **Rationale:**
- ✅ Faster verification creation (no API call)
- ✅ Works even if the provider API is temporarily down
- ✅ Audit trail of template changes
- ❌ Requires periodic sync job

**Alternatives Considered:**
- ❌ Always fetch from provider → Slow, unreliable
- ❌ In-memory cache only → Lost on server restart
- ❌ Redis cache → Extra infrastructure dependency

---

### Decision 3: Separate Session Tracking Table

**Problem:** Multi-step workflows need state tracking.

**Solution:** New `provider_verification_sessions` table links to `verifications`.

```
verifications (1) → (1) provider_verification_sessions
```

**Rationale:**
- ✅ Clean separation of concerns
- ✅ Provider-specific data isolated
- ✅ Easy to query workflow progress
- ✅ Supports future webhook updates
- ❌ Extra table to manage

**Alternatives Considered:**
- ❌ Store in `verifications.metadata` → Messy, hard to query
- ❌ No state tracking → Can't debug failed steps

---

### Decision 4: Extend (Not Replace) Provider Interface

**Problem:** Some providers have features (templates, ID verification) that others don't.

**Solution:** Optional methods on `IKycProvider` interface:

```typescript
interface IKycProvider {
  // Required for all providers
  createVerification(request): Promise<Response>;
  
  // Optional - only for providers that support it
  getAvailableTemplates?(): Promise<Template[]>;
  verifyById?(request): Promise<Response>;
}
```

**Rationale:**
- ✅ Regula provider doesn't need to implement optional methods
- ✅ Easy to add new capabilities
- ✅ Type-safe (TypeScript checks)
- ❌ Runtime checks needed (if provider.supportsTemplates)

**Alternatives Considered:**
- ❌ Separate interfaces → Provider switching complexity
- ❌ Throw errors on unsupported methods → Bad UX

---

## Task Breakdown

> **Important:** Tasks are organized by dependency order within each phase. Event-driven components are integrated throughout.

### Phase 1: Foundation & Infrastructure (Days 1-3)

#### Task 1.0: Environment & Package Setup
**Estimate:** 2 hours  
**Priority:** Critical  
**Dependencies:** None

**Subtasks:**
- [ ] Add Redis service to `docker-compose.yml` (or configure cloud Redis)
  - Image: `redis:7-alpine`
  - Port: 6379
  - Persistence: `appendonly yes`
  - Health check configured
- [ ] Install NestJS queue and WebSocket packages:
  ```bash
  npm install @nestjs/bull bull ioredis
  npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
  npm install -D @types/socket.io
  ```
- [ ] Add environment variables to `.env.example`:
  ```
  # Redis Configuration
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  
  # WebSocket Configuration
  WEBSOCKET_CORS_ORIGIN=http://localhost:3000,http://localhost:4200
  WEBSOCKET_PORT=3001
  
  # Provider Configuration
  PROVIDER_API_URL=https://integrate.idmetagroup.com/api
  PROVIDER_API_KEY=your_api_key_here
  PROVIDER_COMPANY_ID=your_company_id_here
  ```
- [ ] Update `.gitignore` for queue artifacts
- [ ] Document Redis setup in README

**Acceptance Criteria:**
- Redis container runs successfully
- All packages installed without conflicts
- Environment variables documented
- No breaking changes to existing setup

**Files to Create/Modify:**
```
docker-compose.yml (MODIFY)
.env.example (MODIFY)
.gitignore (MODIFY)
package.json (MODIFY - new dependencies)
```

---

### Phase 1: Foundation (Days 1-3)

#### Task 1.1: Database Migrations (Event-Driven Schema)
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 1.0

**Subtasks:**
- [ ] Create `provider_templates` table migration
  - Columns: id, provider_id, external_template_id, name, description, steps, is_active, metadata, created_at, updated_at
  - Indexes: provider_id, external_template_id, is_active
- [ ] Create `provider_plans` table migration
  - Columns: id, provider_id, plan_code, plan_name, category, pricing, is_active, metadata, created_at, updated_at
  - Indexes: provider_id, plan_code, is_active
- [ ] Create `provider_verification_sessions` table migration (for async tracking)
  - Columns: id, verification_id, provider_session_id, template_id, current_step, total_steps, status, processing_steps, last_progress_message, progress_percentage, started_at, completed_at, failed_at, metadata
  - Indexes: verification_id (unique), provider_session_id, status, started_at
  - Foreign keys: verification_id → verifications(id), template_id → provider_templates(id)
- [ ] Add new columns to `verifications` table:
  - template_id (uuid, nullable, FK to provider_templates)
  - processing_mode (enum: 'sync', 'async', default: 'sync')
  - is_multi_step (boolean, default: false)
  - verification_method (enum: 'document', 'id_based', 'biometric', default: 'document')
  - job_id (varchar, nullable - Bull queue job ID)
  - webhook_url (varchar, nullable - for completion notifications)
- [ ] Add new columns to `providers` table:
  - supports_templates (boolean, default: false)
  - supports_id_verification (boolean, default: false)
  - supports_async (boolean, default: false)
  - processing_mode (enum: 'single_step', 'multi_step', 'async_webhook', default: 'single_step')
- [ ] Create composite indexes for query optimization
- [ ] Write rollback migrations for all changes
- [ ] Test migrations on local DB with sample data
- [ ] Test rollback migrations

**Acceptance Criteria:**
- All migrations run without errors
- Rollback works correctly
- Indexes improve query performance (verified with EXPLAIN)
- Foreign key constraints valid
- No data loss on rollback
- Session table supports progress tracking (current_step, total_steps, percentage)

**Files to Create/Modify:**
```
src/database/migrations/
  ├── 1753700000000-AddProviderTables.ts (NEW)
  ├── 1753700001000-UpdateVerificationsForAsyncProcessing.ts (NEW)
  └── 1753700002000-UpdateProvidersForCapabilities.ts (NEW)
src/database/entities/
  ├── provider-template.entity.ts (NEW)
  ├── provider-plan.entity.ts (NEW)
  └── provider-verification-session.entity.ts (NEW)
```

---

#### Task 1.2: Enhanced Provider Types & Interfaces
**Estimate:** 3 hours  
**Priority:** Critical  
**Dependencies:** Task 1.1

**Subtasks:**
- [ ] Update `IKycProvider` interface with optional async support:
  ```typescript
  interface IKycProvider {
    // Core methods (required)
    createVerification(request: VerificationRequest): Promise<VerificationResponse>;
    getVerificationStatus(id: string): Promise<VerificationResponse>;
    
    // Async support (optional)
    createVerificationAsync?(request: VerificationRequest): Promise<AsyncJobResponse>;
    
    // Template support (optional)
    supportsTemplates?: boolean;
    getAvailableTemplates?(): Promise<Template[]>;
    syncTemplates?(): Promise<void>;
    
    // ID-based verification (optional)
    supportsIdBasedVerification?: boolean;
    verifyById?(request: IdBasedVerificationRequest): Promise<VerificationResponse>;
    
    // Processing mode
    processingMode: 'single_step' | 'multi_step' | 'async_webhook';
  }
  ```
- [ ] Create `Template` interface for provider templates
- [ ] Create `ProviderPlan` interface for verification plans
- [ ] Create `IdBasedVerificationRequest` interface
- [ ] Create `AsyncJobResponse` interface (returns job_id, status_url, websocket_url)
- [ ] Create `VerificationProgress` interface (current_step, total_steps, percentage, message)
- [ ] Create `ProcessingMode` enum
- [ ] Create `VerificationMethod` enum
- [ ] Create event payload types (`VerificationCreatedEvent`, `StepCompletedEvent`, `VerificationCompletedEvent`, `VerificationFailedEvent`)
- [ ] Update `ProviderType` enum to include new provider
- [ ] Add JSDoc documentation to all interfaces
- [ ] Update existing Regula provider to implement new optional fields

**Acceptance Criteria:**
- TypeScript compilation succeeds
- Existing Regula provider compiles without changes to logic
- New types are well-documented with examples
- No breaking changes to existing code
- Event types ready for event bus implementation

**Files to Create/Modify:**
```
src/providers/
  ├── types/provider.types.ts (MODIFY)
  ├── types/processing-mode.enum.ts (NEW)
  ├── types/verification-method.enum.ts (NEW)
  ├── interfaces/kyc-provider.interface.ts (MODIFY)
  ├── interfaces/template.interface.ts (NEW)
  ├── interfaces/provider-plan.interface.ts (NEW)
  ├── interfaces/id-verification.interface.ts (NEW)
  ├── interfaces/async-job.interface.ts (NEW)
  └── interfaces/verification-progress.interface.ts (NEW)
src/common/events/
  ├── verification-created.event.ts (NEW)
  ├── step-completed.event.ts (NEW)
  ├── verification-completed.event.ts (NEW)
  └── verification-failed.event.ts (NEW)
```

---

#### Task 1.3: Queue Module & Event Bus Setup
**Estimate:** 3 hours  
**Priority:** Critical  
**Dependencies:** Task 1.0, 1.2

**Subtasks:**
- [ ] Create `QueueModule` with Bull configuration:
  ```typescript
  BullModule.forRoot({
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    },
  })
  ```
- [ ] Register verification queue: `BullModule.registerQueue({ name: 'verifications' })`
- [ ] Create `EventBusService` using Redis pub/sub
  - Publish method: `publish(event: string, data: any)`
  - Subscribe method: `subscribe(event: string, handler: Function)`
  - Event types: `verification.created`, `verification.step.completed`, `verification.completed`, `verification.failed`
- [ ] Create job payload interface (`VerificationJobPayload`)
- [ ] Add queue monitoring dashboard configuration (optional - Bull Board)
- [ ] Add graceful shutdown handlers for queue connections
- [ ] Document event schemas

**Acceptance Criteria:**
- Queue module initializes without errors
- Can enqueue and dequeue test jobs
- Event bus can publish/subscribe successfully
- Redis connection pool managed correctly
- Graceful shutdown on process termination

**Files to Create:**
```
src/queue/
  ├── queue.module.ts (NEW)
  ├── interfaces/job-payload.interface.ts (NEW)
  └── queue.config.ts (NEW)
src/common/events/
  ├── event-bus.service.ts (NEW)
  ├── event-bus.service.spec.ts (NEW)
  └── event-types.enum.ts (NEW)
```

---

#### Task 1.4: Provider Configuration
**Estimate:** 2 hours  
**Priority:** High  
**Dependencies:** Task 1.2

**Subtasks:**
- [ ] Create provider configuration interface
- [ ] Add provider-specific environment variables (already added in Task 1.0)
- [ ] Create configuration validation service
- [ ] Implement secure credential storage (encrypted at rest)
- [ ] Document required credentials and setup steps
- [ ] Add configuration validation on app startup

**Acceptance Criteria:**
- Environment variables documented
- Configuration type-safe
- Validation catches missing/invalid credentials
- Credentials never logged or exposed
- Clear error messages for misconfiguration

**Files to Create/Modify:**
```
src/providers/implementations/external-provider/
  ├── config/
  │   ├── provider.config.ts (NEW)
  │   ├── provider.config.interface.ts (NEW)
  │   └── provider-config.validator.ts (NEW)
  └── provider.module.ts (NEW)
```

---

### Phase 2: Provider Core Implementation (Days 4-7)

#### Task 2.1: Provider HTTP Client
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 1.4

**Subtasks:**
- [ ] Create `ProviderHttpClient` class with Axios/HTTP Module
- [ ] Implement `getTemplates(page, perPage)` API call
- [ ] Implement `createSession(templateId, data)` API call
- [ ] Implement `executeStep(sessionId, stepData)` API call
- [ ] Implement `finalizeVerification(sessionId)` API call
- [ ] Implement `getVerificationStatus(sessionId)` API call
- [ ] Implement `cancelVerification(sessionId)` API call
- [ ] Add request/response interceptors for logging
- [ ] Add retry logic with exponential backoff (using axios-retry)
- [ ] Add timeout handling (30s default)
- [ ] Add correlation ID to all requests
- [ ] Mock HTTP responses for unit tests

**Acceptance Criteria:**
- All API endpoints accessible
- Proper error handling with typed exceptions
- Request logging includes correlation IDs
- Retries on 5xx errors (max 3 attempts with backoff)
- Timeout after 30 seconds
- Circuit breaker pattern for provider failures (optional)

**Files to Create:**
```
src/providers/implementations/external-provider/
  ├── clients/
  │   ├── provider-http.client.ts (NEW)
  │   ├── provider-http.client.spec.ts (NEW)
  │   └── http.config.ts (NEW)
  ├── dto/
  │   ├── create-session.dto.ts (NEW)
  │   ├── execute-step.dto.ts (NEW)
  │   └── finalize-verification.dto.ts (NEW)
  └── exceptions/
      ├── provider-api.exception.ts (NEW)
      └── provider-timeout.exception.ts (NEW)
```

---

#### Task 2.2: Template Service
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 2.1

**Subtasks:**
- [ ] Create `TemplateService` class
- [ ] Implement `syncTemplatesAndPlans()` method
  - Fetch from provider API (paginated)
  - Transform to database schema
  - Upsert to database
  - Return sync statistics
- [ ] Implement `getActiveTemplates(providerId)` method
- [ ] Implement `getTemplate(id)` method with caching
- [ ] Implement `getPlanByCode(providerId, code)` method
- [ ] Implement `getPlan(id)` method
- [ ] Add in-memory caching with TTL (5 minutes)
- [ ] Add error handling and fallback to cached data
- [ ] Create CLI command for manual sync: `npm run provider:sync-templates`

**Acceptance Criteria:**
- Can sync templates from provider API
- Templates stored in database (upsert, not duplicate)
- Plans stored in database
- Efficient queries (< 50ms with indexes)
- Handles API errors gracefully with fallback
- Sync command outputs clear progress and results

**Files to Create:**
```
src/providers/implementations/external-provider/
  ├── services/
  │   ├── template.service.ts (NEW)
  │   └── template.service.spec.ts (NEW)
  ├── repositories/
  │   ├── template.repository.ts (NEW)
  │   └── plan.repository.ts (NEW)
  └── cli/
      └── sync-templates.command.ts (NEW - NestJS Commander)
```

---

#### Task 2.3: Session Service (Progress Tracking)
**Estimate:** 4 hours  
**Priority:** Critical  
**Dependencies:** Task 1.1, 2.2

**Subtasks:**
- [ ] Create `SessionService` class
- [ ] Implement `createSession(verificationId, templateId, providerSessionId)` method
- [ ] Implement `updateProgress(sessionId, currentStep, totalSteps, message)` method
  - Calculate progress percentage
  - Update `last_progress_message`
  - Publish `step.completed` event to event bus
- [ ] Implement `getSession(verificationId)` method
- [ ] Implement `getProgress(verificationId)` method (returns current progress snapshot)
- [ ] Implement `completeSession(sessionId, result)` method
  - Set `completed_at` timestamp
  - Update status to 'completed'
  - Publish `verification.completed` event
- [ ] Implement `failSession(sessionId, error)` method
  - Set `failed_at` timestamp
  - Store error details in metadata
  - Publish `verification.failed` event
- [ ] Add pessimistic locking for concurrent updates
- [ ] Add error handling and transaction rollback

**Acceptance Criteria:**
- Sessions created in database
- Session state tracked correctly (status, current_step, total_steps, percentage)
- Step progress updated atomically
- Handles concurrent updates safely (no race conditions)
- Events published correctly for progress tracking
- Progress percentage calculated accurately

**Files to Create:**
```
src/providers/implementations/external-provider/
  ├── services/
  │   ├── session.service.ts (NEW)
  │   └── session.service.spec.ts (NEW)
  └── repositories/
      └── session.repository.ts (NEW)
```

---

#### Task 2.4: Provider Adapter Implementation (Sync Mode)
**Estimate:** 5 hours  
**Priority:** Critical  
**Dependencies:** Task 2.1, 2.2, 2.3

**Subtasks:**
- [ ] Create `ExternalProviderAdapter` class implementing `IKycProvider`
- [ ] Implement `initialize()` method
- [ ] Implement `createVerification(request)` method (synchronous multi-step workflow):
  - Create session via HTTP client
  - Execute each step sequentially
  - Finalize verification
  - Map response to unified format
  - Return completed verification
- [ ] Implement `createVerificationAsync(request)` method (placeholder - will be enhanced in Phase 3)
- [ ] Implement `getVerificationStatus(id)` method
- [ ] Implement `cancelVerification(id)` method
- [ ] Implement `healthCheck()` method (ping provider API)
- [ ] Implement `validateCredentials()` method
- [ ] Implement `syncTemplates()` method (delegates to TemplateService)
- [ ] Implement `getAvailableTemplates()` method
- [ ] Implement `verifyById(request)` method (ID-based verification)
- [ ] Create response mappers (provider format → unified KYC Adapter format)
- [ ] Create request mappers (KYC Adapter format → provider format)
- [ ] Add comprehensive error handling with custom exceptions
- [ ] Add detailed step-by-step logging with correlation IDs
- [ ] Add unit tests with mocked HTTP client

**Acceptance Criteria:**
- Implements `IKycProvider` interface correctly
- Synchronous multi-step workflow works end-to-end
- Response format matches Regula provider (unified interface)
- All error cases handled with clear messages
- Logging includes step-by-step progress and correlation IDs
- Unit tests achieve 85%+ coverage

**Files to Create:**
```
src/providers/implementations/external-provider/
  ├── external-provider.adapter.ts (NEW)
  ├── external-provider.adapter.spec.ts (NEW)
  ├── mappers/
  │   ├── response.mapper.ts (NEW)
  │   ├── response.mapper.spec.ts (NEW)
  │   ├── request.mapper.ts (NEW)
  │   └── request.mapper.spec.ts (NEW)
  └── index.ts (NEW)
```

---

### Phase 3: Event-Driven & Async Processing (Days 8-11)

#### Task 3.1: Verification Queue Processor (Worker)
**Estimate:** 5 hours  
**Priority:** Critical  
**Dependencies:** Task 1.3, 2.4

**Subtasks:**
- [ ] Create `VerificationsProcessor` class decorated with `@Processor('verifications')`
- [ ] Implement `@Process('verify-async')` handler:
  - Extract job payload (verificationId, tenantId, request data)
  - Load provider adapter from factory
  - Create session in database
  - Execute multi-step workflow:
    - For each step: call provider API, update progress, publish event
  - Handle success: complete session, publish `verification.completed` event
  - Handle failure: fail session, publish `verification.failed` event, retry if transient
- [ ] Add job-level retry configuration (max 3 retries, exponential backoff)
- [ ] Add job timeout (5 minutes max)
- [ ] Add graceful error handling and dead-letter queue for permanent failures
- [ ] Add structured logging with job context (verificationId, tenantId, jobId)
- [ ] Add job progress tracking (job.progress(percentage))
- [ ] Unit tests with mocked provider adapter

**Acceptance Criteria:**
- Jobs processed successfully
- Events published at each step (step.completed, verification.completed, verification.failed)
- Progress percentage calculated and updated
- Retries work correctly for transient errors
- Dead-letter queue captures permanent failures
- Logging includes full context for debugging

**Files to Create:**
```
src/queue/
  ├── processors/
  │   ├── verifications.processor.ts (NEW)
  │   └── verifications.processor.spec.ts (NEW)
  └── interfaces/
      └── verification-job-payload.interface.ts (NEW)
```

---

#### Task 3.2: WebSocket Gateway for Real-Time Updates
**Estimate:** 4 hours  
**Priority:** High  
**Dependencies:** Task 1.3 (Event Bus), Task 3.1

**Subtasks:**
- [ ] Create `VerificationsGateway` class with `@WebSocketGateway({ namespace: '/verifications' })`
- [ ] Implement connection handlers:
  - `@SubscribeMessage('subscribe')` - subscribe client to verification updates by ID
  - `@SubscribeMessage('unsubscribe')` - unsubscribe client
- [ ] Subscribe to event bus events on gateway initialization:
  - `verification.step.completed` → emit `progress` to subscribed clients
  - `verification.completed` → emit `completed` to subscribed clients
  - `verification.failed` → emit `failed` to subscribed clients
- [ ] Add authentication middleware (validate API key or JWT in handshake)
- [ ] Add CORS configuration (from WEBSOCKET_CORS_ORIGIN env)
- [ ] Add connection tracking (store client ID → verificationId mapping)
- [ ] Add automatic cleanup on disconnect
- [ ] Handle backpressure (drop messages if client slow)
- [ ] Add logging for connections, subscriptions, and errors

**Acceptance Criteria:**
- Clients can connect and subscribe to verification IDs
- Real-time progress updates received by subscribed clients
- Completion and failure events received
- Authentication blocks unauthorized connections
- CORS allows only whitelisted origins
- Reconnection works correctly
- No memory leaks from stale subscriptions

**Files to Create:**
```
src/verifications/
  ├── gateways/
  │   ├── verifications.gateway.ts (NEW)
  │   ├── verifications.gateway.spec.ts (NEW)
  │   └── ws-auth.guard.ts (NEW - WebSocket auth guard)
  └── dto/
      ├── subscribe.dto.ts (NEW)
      └── ws-response.dto.ts (NEW)
```

---

#### Task 3.3: Async Verification Endpoint
**Estimate:** 3 hours  
**Priority:** Critical  
**Dependencies:** Task 1.3, 3.1

**Subtasks:**
- [ ] Add `POST /verifications/async` endpoint:
  - Validate request DTO
  - Create verification record in database (status: 'pending')
  - Enqueue job to 'verifications' queue
  - Return 202 Accepted with: `{ id, status: 'pending', statusUrl, websocketUrl }`
- [ ] Update `GET /verifications/:id` to return progress:
  - If sync verification: return standard response
  - If async verification: return `{ id, status, progress: { currentStep, totalSteps, percentage, message }, result? }`
- [ ] Keep existing `POST /verifications` endpoint for backward compatibility (sync mode)
- [ ] Add DTO for async request (`CreateAsyncVerificationDto`)
- [ ] Add response DTO (`AsyncJobResponseDto`)
- [ ] Add Swagger/OpenAPI documentation for new endpoint
- [ ] Add integration test for async flow

**Acceptance Criteria:**
- `POST /verifications/async` returns 202 immediately (< 100ms)
- Job enqueued successfully
- `GET /verifications/:id` returns real-time progress
- Existing sync endpoint still works
- API documentation accurate
- Integration test passes

**Files to Modify/Create:**
```
src/verifications/
  ├── verifications.controller.ts (MODIFY - add async endpoint)
  ├── verifications.service.ts (MODIFY - add async create method)
  └── dto/
      ├── create-async-verification.dto.ts (NEW)
      └── async-job-response.dto.ts (NEW)
```

---

#### Task 3.4: Webhook Dispatcher
**Estimate:** 4 hours  
**Priority:** Medium  
**Dependencies:** Task 3.1

**Subtasks:**
- [ ] Create `WebhookService` class
- [ ] Implement `dispatchVerificationCompleted(verification, webhookUrl)` method:
  - Build webhook payload (id, status, result, timestamp)
  - Sign payload with HMAC SHA-256 (using secret)
  - Send POST request to webhook URL
  - Retry on failure (max 3 retries with exponential backoff: 1s, 5s, 15s)
  - Log all attempts and results
- [ ] Implement `dispatchVerificationFailed(verification, error, webhookUrl)` method
- [ ] Subscribe to event bus events:
  - `verification.completed` → dispatch completed webhook
  - `verification.failed` → dispatch failed webhook
- [ ] Add webhook signature verification helper (for documentation)
- [ ] Add dead-letter logging for permanent webhook failures
- [ ] Add webhook delivery status tracking (optional - store attempts in DB)
- [ ] Unit tests with mocked HTTP client

**Acceptance Criteria:**
- Webhooks sent on verification completion and failure
- Payload signed correctly (HMAC SHA-256)
- Retries work with exponential backoff
- Permanent failures logged to dead-letter
- Signature verification helper documented for clients
- Unit tests cover all scenarios

**Files to Create:**
```
src/webhooks/
  ├── webhook.service.ts (NEW)
  ├── webhook.service.spec.ts (NEW)
  ├── dto/
  │   ├── webhook-payload.dto.ts (NEW)
  │   └── webhook-signature.dto.ts (NEW)
  └── helpers/
      └── signature.helper.ts (NEW)
```

---

### Phase 4: Provider Registration & Integration (Days 12-13)

#### Task 4.1: Provider Registration & Factory Integration
**Estimate:** 3 hours  
**Priority:** Critical  
**Dependencies:** Task 2.4

**Subtasks:**
- [ ] Update `ProviderFactory` to include new provider
- [ ] Create database seed for new provider entry:
  - name, type, capabilities (supports_templates, supports_async, etc.)
- [ ] Create tenant configuration seed for testing
- [ ] Update provider selection logic in verification service
- [ ] Test provider factory returns correct adapter based on tenant config
- [ ] Document provider registration process

**Acceptance Criteria:**
- Provider appears in provider factory
- Database seed idempotent
- Tenant can be configured with new provider
- Factory correctly instantiates adapter
- Documentation clear and accurate

**Files to Create/Modify:**
```
src/providers/
  └── providers.factory.ts (MODIFY)
src/database/seeds/
  ├── 006-external-provider.seed.ts (NEW)
  └── 007-test-tenant-provider-config.seed.ts (NEW)
```

---

#### Task 4.2: End-to-End Integration Testing
**Estimate:** 4 hours  
**Priority:** High  
**Dependencies:** Task 3.4, 4.1

**Subtasks:**
- [ ] Create integration test for sync verification flow
- [ ] Create integration test for async verification flow with real queue
- [ ] Create integration test for WebSocket real-time updates
- [ ] Create integration test for webhook delivery
- [ ] Create integration test for template synchronization
- [ ] Create integration test for ID-based verification
- [ ] Test error handling and retry logic
- [ ] Test multi-tenant isolation (Tenant A with Regula, Tenant B with new provider)

**Acceptance Criteria:**
- All E2E scenarios pass
- Real Redis queue used (or test container)
- WebSocket connection established and receives updates
- Webhook mock receives signed payload
- Template sync works end-to-end
- No cross-tenant data leaks

**Files to Create:**
```
test/integration/
  ├── provider-verification-sync.e2e-spec.ts (NEW)
  ├── provider-verification-async.e2e-spec.ts (NEW)
  ├── provider-websocket.e2e-spec.ts (NEW)
  ├── provider-webhook.e2e-spec.ts (NEW)
  ├── provider-templates.e2e-spec.ts (NEW)
  ├── provider-id-verification.e2e-spec.ts (NEW)
  └── multi-tenant.e2e-spec.ts (NEW)
test/fixtures/
  └── provider-test-data.ts (NEW)
```

---

### Phase 5: Testing, Documentation & Deployment Prep (Days 14-15)

#### Task 5.1: Comprehensive Unit Tests
**Estimate:** 4 hours  
**Priority:** High  
**Dependencies:** All implementation tasks

**Subtasks:**
- [ ] Write tests for `ExternalProviderAdapter`
- [ ] Write tests for `TemplateService`
- [ ] Write tests for `SessionService`
- [ ] Write tests for `ProviderHttpClient`
- [ ] Write tests for `VerificationsProcessor` (queue worker)
- [ ] Write tests for `VerificationsGateway` (WebSocket)
- [ ] Write tests for `WebhookService`
- [ ] Write tests for `EventBusService`
- [ ] Write tests for response/request mappers
- [ ] Achieve 85%+ code coverage
- [ ] Mock all external API calls and Redis

**Acceptance Criteria:**
- All tests passing
- Code coverage ≥ 85%
- No flaky tests
- Tests run in < 60 seconds
- Clear test descriptions and assertions

**Files to Create:**
```
src/**/*.spec.ts (Multiple - see individual tasks above)
```

---

#### Task 5.2: API Documentation & Examples
**Estimate:** 3 hours  
**Priority:** Medium  
**Dependencies:** Task 3.3

**Subtasks:**
- [ ] Update Swagger/OpenAPI documentation for all new endpoints:
  - `POST /verifications/async` with request/response examples
  - Updated `GET /verifications/:id` with progress response
  - WebSocket connection examples
- [ ] Add code examples for async flow:
  - TypeScript/JavaScript client connecting to WebSocket
  - Polling fallback example
  - Webhook signature verification example
- [ ] Document template selection process
- [ ] Document ID-based verification flow
- [ ] Update Postman collection with async requests and WebSocket examples
- [ ] Create integration guide for clients (README section)
- [ ] Document event payload schemas

**Acceptance Criteria:**
- Swagger UI shows all endpoints with accurate schemas
- Code examples are copy-paste ready
- Postman collection includes async flow
- README section explains async vs sync modes
- Event schemas documented with examples

**Files to Modify:**
```
src/verifications/verifications.controller.ts (MODIFY - add @ApiOperation decorators)
src/verifications/gateways/verifications.gateway.ts (MODIFY - add @ApiOperation)
README.md (MODIFY - add async integration guide)
docs/
  ├── ASYNC_VERIFICATION_GUIDE.md (NEW)
  ├── WEBSOCKET_CLIENT_EXAMPLES.md (NEW)
  └── EVENT_SCHEMAS.md (NEW)
postman/KYC_Adapter_Collection.json (MODIFY)
```

---

#### Task 5.3: Observability & Monitoring Setup
**Estimate:** 3 hours  
**Priority:** High  
**Dependencies:** All implementation tasks

**Subtasks:**
- [ ] Add structured logging with correlation IDs to all services
- [ ] Add metrics collection:
  - Queue depth and processing time (Bull metrics)
  - WebSocket connection count
  - Webhook success/failure rates
  - Provider API response times
- [ ] Add health check endpoints:
  - `/health/redis` - Redis connectivity
  - `/health/queue` - Bull queue status
  - `/health/provider` - Provider API health
- [ ] Configure log aggregation (Winston transports)
- [ ] Add performance monitoring (optional - New Relic/DataDog)
- [ ] Document monitoring setup and metrics

**Acceptance Criteria:**
- All logs include correlation IDs
- Metrics exported (Prometheus format recommended)
- Health checks return accurate status
- Log levels configurable via env
- Monitoring guide documented

**Files to Create:**
```
src/common/
  ├── logging/
  │   ├── correlation-id.middleware.ts (NEW)
  │   └── logger.service.ts (MODIFY - add correlation ID)
  ├── metrics/
  │   ├── metrics.service.ts (NEW)
  │   └── metrics.controller.ts (NEW - /metrics endpoint)
  └── health/
      ├── redis.health.ts (NEW)
      ├── queue.health.ts (NEW)
      └── provider.health.ts (NEW)
docs/
  └── MONITORING.md (NEW)
```

---

## Day-by-Day Implementation Plan (3 Weeks)

### Week 1: Infrastructure & Foundation (Days 1-5)

#### Day 1 (Monday): Environment Setup & Database Schema
**Goal:** Set up Redis, install packages, create database migrations

**Tasks:**
- ✅ Task 1.0: Environment & Package Setup (2h)
- ✅ Task 1.1: Database Migrations (4h)
- ✅ Initial testing of migrations (1h)
- ✅ Code review and commit (1h)

**Deliverables:**
- Redis running locally
- All packages installed
- Migrations tested and committed
- PR #1: "Foundation - Redis + Event-Driven Database Schema"

**End of Day Checklist:**
- [ ] Redis container healthy
- [ ] Migrations run successfully
- [ ] Entities created and compiling
- [ ] No breaking changes

---

#### Day 2 (Tuesday): TypeScript Types & Queue Infrastructure
**Goal:** Create interfaces and set up queue module

**Tasks:**
- ✅ Task 1.2: Enhanced Provider Types & Interfaces (3h)
- ✅ Task 1.3: Queue Module & Event Bus Setup (3h)
- ✅ Test queue with dummy job (1h)
- ✅ Code review (1h)

**Deliverables:**
- All TypeScript interfaces defined
- Queue module operational
- Event bus can publish/subscribe
- PR #2: "Types, Queue, and Event Bus Infrastructure"

**End of Day Checklist:**
- [ ] TypeScript compiles without errors
- [ ] Can enqueue and process test job
- [ ] Event bus publishes/subscribes correctly
- [ ] Unit tests for event bus passing

---

#### Day 3 (Wednesday): Provider Configuration & HTTP Client
**Goal:** Create provider configuration and HTTP client

**Tasks:**
- ✅ Task 1.4: Provider Configuration (2h)
- ✅ Task 2.1: Provider HTTP Client (4h)
- ✅ Test API connectivity (1h)
- ✅ Code review (1h)

**Deliverables:**
- Provider configuration validated
- HTTP client complete with all endpoints
- PR #3: "Provider Configuration & HTTP Client"

**End of Day Checklist:**
- [ ] All provider API endpoints accessible
- [ ] Retry logic and timeout working
- [ ] Correlation IDs in logs
- [ ] Unit tests with mocked HTTP

---

#### Day 4 (Thursday): Template & Session Services
**Goal:** Implement template sync and session tracking

**Tasks:**
- ✅ Task 2.2: Template Service (4h)
- ✅ Task 2.3: Session Service (Progress Tracking) (4h)

**Deliverables:**
- Template sync working
- Session service complete
- PR #4: "Template & Session Services"

**End of Day Checklist:**
- [ ] Templates synced from API to DB
- [ ] Sessions track progress correctly
- [ ] Events published on progress updates
- [ ] Unit tests passing

---

#### Day 5 (Friday): Provider Adapter Implementation
**Goal:** Complete provider adapter (sync mode)

**Tasks:**
- ✅ Task 2.4: Provider Adapter Implementation (Sync Mode) (5h)
- ✅ End-to-end sync verification test (2h)
- ✅ Code review (1h)

**Deliverables:**
- Provider adapter complete
- Sync verification works end-to-end
- PR #5: "Provider Adapter - Sync Mode"

**End of Day Checklist:**
- [ ] `createVerification()` works
- [ ] Response mapping correct
- [ ] Error handling comprehensive
- [ ] 85%+ test coverage

**Weekend Break** 🎉

---

### Week 2: Event-Driven Processing & Real-Time Features (Days 6-10)

#### Day 6 (Monday): Queue Worker Processor
**Goal:** Implement async verification worker

**Tasks:**
- ✅ Task 3.1: Verification Queue Processor (Worker) (5h)
- ✅ Test worker with mock provider (2h)
- ✅ Code review (1h)

**Deliverables:**
- Worker processes async jobs
- Events published during processing
- PR #6: "Async Verification Worker"

**End of Day Checklist:**
- [ ] Jobs processed successfully
- [ ] Progress events published
- [ ] Retries work correctly
- [ ] Dead-letter queue configured

---

#### Day 7 (Tuesday): WebSocket Gateway
**Goal:** Real-time progress updates via WebSocket

**Tasks:**
- ✅ Task 3.2: WebSocket Gateway for Real-Time Updates (4h)
- ✅ Test WebSocket connections (2h)
- ✅ Integration with worker events (1h)
- ✅ Code review (1h)

**Deliverables:**
- WebSocket gateway operational
- Clients receive real-time updates
- PR #7: "WebSocket Gateway for Real-Time Updates"

**End of Day Checklist:**
- [ ] Clients can subscribe to verifications
- [ ] Progress events broadcast correctly
- [ ] Authentication and CORS working
- [ ] No memory leaks

---

#### Day 8 (Wednesday): Async API Endpoint
**Goal:** Create async verification endpoint

**Tasks:**
- ✅ Task 3.3: Async Verification Endpoint (3h)
- ✅ Test async flow end-to-end (2h)
- ✅ Update GET endpoint for progress (2h)
- ✅ Code review (1h)

**Deliverables:**
- `POST /verifications/async` working
- `GET /verifications/:id` returns progress
- PR #8: "Async Verification Endpoint"

**End of Day Checklist:**
- [ ] Async endpoint returns 202 immediately
- [ ] Job enqueued successfully
- [ ] Progress polling works
- [ ] Backward compatibility maintained

---

#### Day 9 (Thursday): Webhook Dispatcher
**Goal:** Implement webhook notifications

**Tasks:**
- ✅ Task 3.4: Webhook Dispatcher (4h)
- ✅ Test webhook delivery (2h)
- ✅ Document signature verification (1h)
- ✅ Code review (1h)

**Deliverables:**
- Webhook service complete
- Webhooks sent on completion/failure
- PR #9: "Webhook Dispatcher"

**End of Day Checklist:**
- [ ] Webhooks sent correctly
- [ ] Payload signed with HMAC
- [ ] Retries with backoff working
- [ ] Dead-letter logging configured

---

#### Day 10 (Friday): Provider Registration & Integration
**Goal:** Register provider and test multi-provider setup

**Tasks:**
- ✅ Task 4.1: Provider Registration & Factory Integration (3h)
- ✅ Manual testing of full async flow (3h)
- ✅ Test multi-tenant isolation (1h)
- ✅ Code review (1h)

**Deliverables:**
- Provider registered in factory
- Full async flow working
- PR #10: "Provider Registration & Integration"

**End of Day Checklist:**
- [ ] Provider factory returns correct adapter
- [ ] Async flow works end-to-end
- [ ] Regula provider still works
- [ ] No cross-tenant data leaks

**Weekend Break** 🎉

---

### Week 3: Testing, Documentation & Deployment (Days 11-15)

#### Day 11 (Monday): End-to-End Integration Tests
**Goal:** Comprehensive E2E testing

**Tasks:**
- ✅ Task 4.2: End-to-End Integration Testing (6h)
- ✅ Fix any issues found (1h)
- ✅ Code review (1h)

**Deliverables:**
- All E2E tests passing
- PR #11: "E2E Integration Tests"

**End of Day Checklist:**
- [ ] Sync and async flows tested
- [ ] WebSocket updates tested
- [ ] Webhook delivery tested
- [ ] Multi-tenant tested

---

#### Day 12 (Tuesday): Comprehensive Unit Tests
**Goal:** Achieve 85%+ code coverage

**Tasks:**
- ✅ Task 5.1: Comprehensive Unit Tests (6h)
- ✅ Fix coverage gaps (1h)
- ✅ Code review (1h)

**Deliverables:**
- 85%+ code coverage
- PR #12: "Comprehensive Unit Tests"

**End of Day Checklist:**
- [ ] All unit tests passing
- [ ] Coverage ≥ 85%
- [ ] No flaky tests
- [ ] Tests run in < 60 seconds

---

#### Day 13 (Wednesday): API Documentation & Examples
**Goal:** Complete developer documentation

**Tasks:**
- ✅ Task 5.2: API Documentation & Examples (5h)
- ✅ Update Postman collection (2h)
- ✅ Code review (1h)

**Deliverables:**
- Swagger docs complete
- Integration guides published
- PR #13: "API Documentation & Examples"

**End of Day Checklist:**
- [ ] Swagger UI accurate
- [ ] Code examples work
- [ ] Postman collection updated
- [ ] Event schemas documented

---

#### Day 14 (Thursday): Observability & Final Polish
**Goal:** Add monitoring and fix any remaining issues

**Tasks:**
- ✅ Task 5.3: Observability & Monitoring Setup (5h)
- ✅ Performance testing and optimization (2h)
- ✅ Final code review and cleanup (1h)

**Deliverables:**
- Monitoring setup complete
- All tests passing
- PR #14: "Observability & Final Polish"

**End of Day Checklist:**
- [ ] Correlation IDs in all logs
- [ ] Metrics endpoint working
- [ ] Health checks accurate
- [ ] No linter warnings

---

#### Day 15 (Friday): Deployment Preparation & Knowledge Transfer
**Goal:** Deploy to staging and train team

**Tasks:**
- ✅ Deploy to staging environment (2h)
- ✅ Smoke tests on staging (2h)
- ✅ Team demo and knowledge transfer (3h)
- ✅ Deployment documentation (1h)

**Deliverables:**
- Staging deployment successful
- Deployment guide complete
- Team trained

**End of Day Checklist:**
- [ ] Staging deployment verified
- [ ] Smoke tests passing
- [ ] Team understands architecture
- [ ] Deployment runbook complete
- [ ] Ready for production deployment

**🎉 Event-Driven Integration Complete! Ready for Production 🚀**

---

## Quality Assurance

### Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types (use proper types or `unknown`)
- All functions have return type annotations
- ESLint passing with zero warnings

**Testing:**
- Unit test coverage ≥ 85%
- Integration tests for critical paths
- All tests must pass before merge
- No test mocking of database (use test DB)

**Code Review:**
- All PRs require 1 approval
- Review checklist:
  - [ ] Tests passing
  - [ ] No security vulnerabilities
  - [ ] Performance acceptable
  - [ ] Documentation updated
  - [ ] No breaking changes

### Performance Benchmarks

**Verification Creation:**
- Target: < 15 seconds (90th percentile)
- Maximum: < 30 seconds (99th percentile)

**Template Sync:**
- Target: < 5 seconds for 100 templates
- Maximum: < 10 seconds

**Database Queries:**
- Target: < 50ms for simple queries
- Maximum: < 200ms for complex queries

### Security Checklist

- [ ] API credentials encrypted at rest
- [ ] No credentials in logs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] Rate limiting on all endpoints
- [ ] CORS configured correctly
- [ ] HTTPS enforced in production

---

## Risk Management

### Risk 1: Provider API Changes

**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Version lock API endpoints
- Monitor provider release notes
- Implement API version detection
- Have fallback to cached templates

**Contingency:**
- Quick rollback to Regula provider
- Alert team within 15 minutes
- Contact provider support

---

### Risk 2: Multi-Step Workflow Timeout

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement step-level retry logic
- Store progress in database
- Allow resume from last completed step
- Set reasonable timeouts (30s per step)

**Contingency:**
- Fail verification gracefully
- Provide clear error message to user
- Log for manual review

---

### Risk 3: Template Sync Failures

**Probability:** Low  
**Impact:** Low  
**Mitigation:**
- Use cached templates if API fails
- Retry sync with exponential backoff
- Alert on sync failures
- Manual sync command available

**Contingency:**
- Use last known good templates
- Manual sync by admin
- Temporary disable new template selection

---

### Risk 4: Database Migration Issues

**Probability:** Low  
**Impact:** High  
**Mitigation:**
- Test migrations on staging first
- Have rollback script ready
- Backup database before migration
- Run migrations during low traffic

**Contingency:**
- Immediate rollback
- Restore from backup if needed
- Run in maintenance window

---

### Risk 5: Performance Degradation

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Load testing before deployment
- Database query optimization
- Add monitoring and alerting
- Implement caching aggressively

**Contingency:**
- Scale horizontally (add servers)
- Optimize slow queries
- Implement circuit breaker

---

## Success Criteria

### Functional Requirements

- [x] Provider adapter implements `IKycProvider` interface
- [ ] Template-based verification works end-to-end
- [ ] ID-based verification works (NBI, PRC, etc.)
- [ ] Multi-step workflow abstracted from client
- [ ] Existing Regula integrations unaffected
- [ ] Template sync works automatically
- [ ] Admin can manually trigger template sync
- [ ] Errors are handled gracefully with clear messages

### Non-Functional Requirements

**Performance:**
- [ ] Verification completes in < 30 seconds (99th percentile)
- [ ] Template sync in < 10 seconds
- [ ] Database queries < 200ms

**Reliability:**
- [ ] 99.9% uptime
- [ ] Zero data loss
- [ ] Automatic recovery from transient failures

**Security:**
- [ ] Credentials encrypted
- [ ] No secrets in logs
- [ ] SQL injection protected
- [ ] Rate limiting active

**Maintainability:**
- [ ] 85%+ test coverage
- [ ] All code documented
- [ ] Logging comprehensive
- [ ] Error messages actionable

### Acceptance Test Scenarios

#### Scenario 1: Basic Document Verification

```bash
# Setup
- Tenant configured with provider adapter
- Template 306 ("First Philippine ID") active

# Test
POST /api/v1/verifications
{
  "verificationType": "document",
  "documentImages": {
    "front": "base64_encoded_image"
  }
}

# Expected Result
- HTTP 201 Created
- Verification ID returned
- Status: "completed"
- Extracted data includes name, DOB, document number
- Processing time < 30 seconds
```

#### Scenario 2: ID-Based Verification (NBI)

```bash
# Setup
- Tenant configured with provider adapter
- NBI plan (170) available

# Test
POST /api/v1/verifications/verify-by-id
{
  "verificationType": "philippines_nbi_clearance",
  "idNumber": "NBI-123456789",
  "userData": {
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "dateOfBirth": "1990-01-01"
  }
}

# Expected Result
- HTTP 201 Created
- Verification ID returned
- Status: "completed"
- Clearance status from government database
- No document upload required
- Processing time < 15 seconds
```

#### Scenario 3: Template Sync

```bash
# Test
npm run idmeta:sync-templates

# Expected Result
- Templates fetched from provider API
- Templates stored in database
- Plans stored in database
- Console output shows count of synced items
- Execution time < 10 seconds
```

#### Scenario 4: Multi-Provider Support

```bash
# Setup
- Tenant A configured with Regula
- Tenant B configured with provider adapter

# Test Tenant A (Regula)
POST /api/v1/verifications
X-API-Key: tenant_a_key
{ "verificationType": "document", ... }

# Test Tenant B (Provider)
POST /api/v1/verifications
X-API-Key: tenant_b_key
{ "verificationType": "document", ... }

# Expected Result
- Both verifications succeed
- Tenant A uses Regula provider
- Tenant B uses provider adapter
- Response format identical
- No cross-tenant interference
```

#### Scenario 5: Error Handling

```bash
# Test: Invalid Template ID
POST /api/v1/verifications
{
  "verificationType": "document",
  "metadata": { "idmeta_template_id": 99999 }
}

# Expected Result
- HTTP 400 Bad Request
- Clear error message: "Template 99999 not found"
- Suggested action: "Use valid template ID or omit for default"

# Test: Provider API Down
# (Simulate by blocking network to provider)
POST /api/v1/verifications
{ "verificationType": "document", ... }

# Expected Result
- HTTP 503 Service Unavailable
- Error message: "Provider service temporarily unavailable"
- Suggested action: "Please try again in a few minutes"
- Error logged with correlation ID
```

---

## Deployment Checklist

### Pre-Deployment (Day -1)

- [ ] All PRs merged to `develop` branch
- [ ] All tests passing on CI/CD
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Database backup taken
- [ ] Staging environment tested
- [ ] Rollback plan documented
- [ ] Team briefed on deployment

### Deployment Steps (Day 0)

**1. Database Migration (5 minutes)**
```bash
# On production server
npm run migration:run
npm run db:seed:idmeta
```

**2. Deploy Application (10 minutes)**
```bash
# Deploy to production
git checkout main
git pull origin main
npm install
npm run build
pm2 restart kyc-adapter
```

**3. Sync Templates (2 minutes)**
```bash
npm run idmeta:sync-templates
```

**4. Configure Test Tenant (5 minutes)**
```sql
-- Configure a test tenant with provider adapter
UPDATE tenant_provider_configs
SET provider_id = (SELECT id FROM providers WHERE name = 'External Provider'),
    is_enabled = true,
    config = '{"default_template_id": 306}'
WHERE tenant_id = 'test-tenant-uuid';
```

**5. Smoke Tests (10 minutes)**
```bash
# Test Regula (existing)
curl -X POST https://api.kyc-adapter.com/v1/verifications \
  -H "X-API-Key: regula_tenant_key" \
  -d '{"verificationType": "document", ...}'

# Test Provider (new)
curl -X POST https://api.kyc-adapter.com/v1/verifications \
  -H "X-API-Key: idmeta_tenant_key" \
  -d '{"verificationType": "document", ...}'
```

### Post-Deployment (Day +1)

- [ ] Monitor error rates (< 1%)
- [ ] Monitor response times (< 30s)
- [ ] Check verification success rates (> 95%)
- [ ] Review logs for errors
- [ ] Verify template sync cron job
- [ ] Test ID-based verification
- [ ] Get feedback from test users
- [ ] Update production documentation

### Rollback Plan (If Needed)

**Trigger Conditions:**
- Error rate > 5%
- Verification success rate < 80%
- Critical security issue
- Data corruption detected

**Rollback Steps (15 minutes):**
```bash
# 1. Revert code
git checkout <previous-commit>
npm install
npm run build
pm2 restart kyc-adapter

# 2. Rollback database
npm run migration:revert

# 3. Verify
curl https://api.kyc-adapter.com/health

# 4. Notify team
# Send alert to #kyc-adapter Slack channel
```

---

## Next Steps After Completion

### Immediate (Week 3)

1. **Monitor Production:**
   - Error rates
   - Performance metrics
   - User feedback

2. **Documentation:**
   - Internal wiki update
   - Customer-facing API docs
   - Integration guide for new tenants

3. **Training:**
   - Support team training
   - Sales team demo
   - Customer success guide

### Short-Term (Months 2-3)

1. **Feature Enhancements:**
   - Webhook support from provider
   - Admin UI for template management
   - Custom workflow builder (hybrid approach)

2. **Optimization:**
   - Query performance tuning
   - Caching improvements
   - Cost optimization

3. **Additional Providers:**
   - Evaluate other providers (Persona, Onfido, etc.)
   - Abstract common patterns
   - Improve provider factory

### Long-Term (Months 4-6)

1. **Advanced Features:**
   - Real-time verification status updates (SSE/WebSockets)
   - Multi-language support
   - Mobile SDK for direct integration
   - Batch verification API

2. **Scale:**
   - Horizontal scaling
   - Multi-region deployment
   - CDN for document images

3. **Analytics:**
   - Verification success rate dashboard
   - Provider performance comparison
   - Cost per verification tracking
   - Fraud detection ML model

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev                      # Start dev server
npm run migration:run            # Run migrations
npm run migration:revert         # Rollback migrations
npm run db:seed                  # Seed database

# Provider-specific
npm run provider:sync-templates    # Sync templates from provider
npm run provider:list-templates    # List cached templates
npm run provider:test-verification # Run test verification
npm run provider:health-check      # Check provider API health

# Testing
npm run test                     # Unit tests
npm run test:watch               # Watch mode
npm run test:cov                 # Coverage report
npm run test:e2e                 # Integration tests

# Production
npm run build                    # Build for production
npm run start:prod               # Start production server
```

### Team Contacts

**Development Team:**
- Lead Developer: [Your Name]
- Backend Engineer: [Name]
- QA Engineer: [Name]

**Stakeholders:**
- Product Manager: [Name]
- Technical Lead: [Name]
- DevOps: [Name]

**External:**
- Provider Support: support@provider.example
- Provider Account Manager: [Contact]

---

**Document End**

*Ready to start coding? Let's build this! 🚀*

