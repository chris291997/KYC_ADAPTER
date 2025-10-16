# Verification Provider Integration - Quick Start Guide

> **TL;DR:** Template-First + event-driven (async queue + WebSockets), 3-week timeline, zero breaking changes

---

## 📚 Document Overview

### 1. **IDMETA_INTEGRATION_DOCUMENTATION.md**
**When to read:** Before coding, for reference during development

**What's inside:**
- ✅ Technical architecture and design patterns (event-driven)
- ✅ Provider-agnostic API specifications and examples
- ✅ Complete database schema with migrations
- ✅ Provider implementation details
- ✅ Security, testing, and deployment guides

**Key sections:**
- **Section 2:** Provider Overview (understand the external provider)
- **Section 3:** Architecture Design (how it fits in)
- **Section 5:** Database Schema (what to create)
- **Section 6:** Provider Implementation (code structure)

---

### 2. **IDMETA_DEVELOPMENT_PLAN.md**
**When to read:** Daily during implementation

**What's inside:**
- ✅ 3-week step-by-step implementation plan (async queue + WebSockets)
- ✅ Task breakdown with time estimates
- ✅ Detailed acceptance criteria for each task
- ✅ Risk management and mitigation strategies
- ✅ Deployment checklist and success criteria

**Key sections:**
- **Section 3:** Task Breakdown (what to build)
- **Section 4:** Day-by-Day Plan (when to build it)
- **Section 7:** Success Criteria (how to know it's done)

---

## 🎯 Critical Decisions Made

### Why Template-First?

| Template-First | Hybrid (Alternative) |
|----------------|----------------------|
| ✅ 2-3 weeks | ❌ 4-5 weeks |
| ✅ Use provider templates | ⚠️ Build custom workflow engine |
| ✅ Simpler testing | ❌ Complex validation |
| ✅ Can upgrade later | ✅ More flexible from day 1 |

**Decision:** Template-First wins for faster time-to-market.

---

### Key Architectural Patterns (Updated)
 
#### 1. **Adapter Pattern**
```
Client → Single API call → ProviderAdapter (handles multi-step internally) → Response
```

**Why:** Client API stays unchanged, complexity hidden.

#### 2. **Template Caching**
```
Database (24h cache) → Fast lookups → No API call per verification
```

**Why:** Performance + works when the external provider API is down.

#### 3. **Provider Abstraction**
```
VerificationsService → ProvidersFactory → [Provider A | Provider B | Future]
```

**Why:** Generic design supports multiple providers.

#### 4. **Event-Driven Processing (NEW)**
```
Client → POST /verifications (202 Accepted) → Job queued → Worker executes steps →
Events published to event bus → WebSocket gateway pushes real-time updates →
Client listens via WebSocket or falls back to polling
```

**Why:**
- Real-time UX with progress
- Scales better than synchronous processing
- Resilient to provider latency/failures

---

## 🗂️ What Gets Built

### New Database Tables

1. **`provider_templates`** - Cached templates from external provider
2. **`provider_plans`** - Available verification types
3. **`provider_verification_sessions`** - Track multi-step workflows

### New Code Files

```
src/providers/implementations/external/
├── external.provider.ts         ← Main provider adapter
├── services/
│   ├── template.service.ts      ← Template sync & caching
│   └── session.service.ts       ← Multi-step state management
├── clients/
│   └── provider-http.client.ts  ← API communication
├── mappers/
│   ├── request.mapper.ts        ← Map our format → provider API
│   └── response.mapper.ts       ← Map provider → our format
└── repositories/
    ├── template.repository.ts
    ├── plan.repository.ts
    └── session.repository.ts
```

### Modified Files

- `src/providers/interfaces/kyc-provider.interface.ts` - Add optional methods
- `src/providers/types/provider.types.ts` - Add provider-agnostic types
- `src/verifications/verifications.service.ts` - Handle provider adapter
- `src/verifications/verifications.controller.ts` - Add ID-based endpoint

---

## 📅 Implementation Timeline (Updated)

### Week 1: Foundation (Async Core)

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Database & Types | Migrations ready (sessions, events) |
| Tue | Queue setup (Bull/Redis) | Queue running, jobs queued |
| Wed | Worker + step engine | Steps execute from jobs |
| Thu | Event bus (Redis Pub/Sub) | Progress events emitted |
| Fri | Persisted progress | Status API returns progress |

### Week 2: Real-Time Layer

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | WebSocket gateway | Clients can subscribe/unsubscribe |
| Tue | Progress streaming | Real-time updates end-to-end |
| Wed | Client fallback | Polling fallback + samples |
| Thu | Hardening | Retries, backoff, idempotency |
| Fri | Perf + load tests | Baselines captured |

### Week 3: Integration & Hardening

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Provider registration | Provider metadata + seeds |
| Tue | Admin/CLI tasks | Template sync job + CLI |
| Wed | Webhook dispatcher | Signed callbacks on completion |
| Thu | Docs & examples | Swagger, Postman, README |
| Fri | Release prep | Checklists, rollout plan |

---

## 🚀 How to Start

### Prerequisites

1. **Get External Provider Credentials:**
   ```
   Contact: support@idmetagroup.com
   Need: API Token, Base URL, Test Account
   ```

2. **Review Documents:**
   - [ ] Skim `IDMETA_INTEGRATION_DOCUMENTATION.md`
   - [ ] Read `IDMETA_DEVELOPMENT_PLAN.md` Day 1 section

3. **Setup Environment:**
   ```bash
   # Add to .env
   PROVIDER_API_TOKEN=your_token_here
   PROVIDER_API_URL=https://provider-api.example.com
   ```

### Day 1 - Start Here

**Morning (4 hours):**
1. Create database migration for `idmeta_templates` table
2. Create database migration for `idmeta_plans` table
3. Create database migration for `idmeta_verification_sessions` table
4. Test migrations on local database

**Afternoon (3 hours):**
1. Update `IKycProvider` interface with optional methods
2. Create provider-specific TypeScript types
3. Update `ProviderType` enum
4. Ensure TypeScript compiles without errors

**End of Day:**
- [ ] Migrations run successfully
- [ ] Rollback works
- [ ] TypeScript compiles
- [ ] Create PR: "Provider Foundation - DB Schema & Types"

---

## 🔍 Common Questions

### Q: Will existing Regula integrations break?
**A:** No. Zero breaking changes. Regula continues working exactly as before.

### Q: How does the client API change?
**A:** It doesn't! Same endpoints, same request format. Only internal routing changes.

### Q: What if the provider API is down?
**A:** Templates are cached in database. Verifications can still be created (but execution will fail gracefully).

### Q: Can we support custom workflows later?
**A:** Yes! Template-First is designed to be upgraded to Hybrid approach without breaking changes.

### Q: How do we handle multiple providers per tenant?
**A:** `tenant_provider_configs` table supports priority. Highest priority provider is used first, with fallback to next.

### Q: What about testing?
**A:** Use the provider's test account/sandbox data. All tests use test mode.

---

## 🎓 Understanding the External Provider

### What Makes IDmeta Different?

**Traditional KYC (Regula):**
```
Upload document → OCR extracts data → Verify authenticity
```

**External Provider:**
```
Option 1: Same as above (document upload)
Option 2: Provide ID number → Query gov database → Get official status
```

### Example: NBI Clearance Verification

**With Regula (Document):**
1. User uploads photo of NBI clearance
2. OCR extracts data (name, ID number, dates)
3. Check if document looks authentic
4. **Problem:** Can't verify if clearance is actually valid with NBI

**With External Provider (ID-Based):**
1. User provides NBI number + name + birthdate
2. The provider queries the registry database directly
3. Returns official clearance status
4. **Benefit:** 100% accurate, no document needed

### Example Templates (From Provider Account)

| Template ID | Name | Plans Included |
|-------------|------|----------------|
| 456 | Untitled 21/03/2025 | Document + Biometrics + Face Compare |
| 426 | Two Philippine IDs | Document + Biometrics |
| 425 | Philsys | QR Scan (PhilSys) |
| 424 | One Foreign ID | Document + Biometrics |
| 306 | First Philippine ID | Document only |

**Default for testing:** Template 306 (simplest)

---

## 🛠️ Useful Commands

### Development
```bash
# Start development server
npm run dev

# Run migrations
npm run migration:run

# Rollback migrations
npm run migration:revert

# Seed database
npm run db:seed
```

### Provider-Specific (After Implementation)
```bash
# Sync templates from provider
npm run idmeta:sync-templates

# List cached templates
npm run idmeta:list-templates

# Test verification
npm run idmeta:test-verification

# Health check
npm run idmeta:health-check
```

### Testing
```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Integration tests
npm run test:e2e
```

---

## 📊 Success Metrics

### Functional
- [ ] Template-based verification works end-to-end
- [ ] ID-based verification works (NBI, PRC, etc.)
- [ ] Existing Regula integrations unaffected
- [ ] Multi-step workflow abstracted from client

### Performance
- [ ] Verification completes in < 30 seconds
- [ ] Template sync in < 10 seconds
- [ ] Database queries < 200ms

### Quality
- [ ] 85%+ test coverage
- [ ] Zero linter warnings
- [ ] All PRs reviewed and approved
- [ ] Documentation complete

---

## 🆘 When You're Stuck

### Problem: TypeScript errors after interface changes
**Solution:** 
1. Check `IKycProvider` interface is correctly defined
2. Ensure new methods are marked as optional (`?`)
3. Update Regula provider to satisfy interface (can throw "not implemented" for optional methods)

### Problem: Database migration fails
**Solution:**
1. Check PostgreSQL is running
2. Verify database connection in `.env`
3. Check for syntax errors in migration file
4. Try rollback and re-run
5. Check for conflicting migrations

### Problem: Provider API returns 401 Unauthorized
**Solution:**
1. Verify API token in `.env` is correct
2. Check token has not expired
3. Ensure `Authorization: Bearer {token}` header is sent
4. Contact provider support if issue persists

### Problem: Template sync not working
**Solution:**
1. Check provider API credentials
2. Verify network connectivity
3. Check logs for detailed error
4. Try manual API call with curl to isolate issue

### Problem: Tests failing randomly
**Solution:**
1. Ensure test database is separate from dev database
2. Add proper cleanup in `afterEach` hooks
3. Check for timing issues (add `await` where needed)
4. Run tests in isolation to identify flaky test

---

## 📞 Support Contacts

**Provider:**
- Support: support@provider.example
- Documentation: https://docs.provider.example (if available)
- API Status: Check with account manager

**Internal:**
- Technical Lead: [Your Name]
- DevOps: [Name]
- Product Manager: [Name]

---

## 🎉 Ready to Build?

**Start with Day 1 in `IDMETA_DEVELOPMENT_PLAN.md`**

Good luck! 🚀

---

*Last Updated: October 16, 2025*

