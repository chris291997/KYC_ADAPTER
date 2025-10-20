# External KYC Provider Integration - Quick Start Guide

> **TL;DR:** Webhook-driven integration, 2-week timeline, zero breaking changes, provider-agnostic design

---

## 📚 Document Overview

### 1. **EXTERNAL_PROVIDER_INTEGRATION.md**
**When to read:** Before coding, for reference during development

**What's inside:**
- ✅ Complete provider API specification
- ✅ Webhook-driven architecture design
- ✅ Database schema (minimal changes)
- ✅ Provider implementation details
- ✅ Security, testing, and deployment guides

**Key sections:**
- **Section 2:** Provider API Overview
- **Section 3:** Architecture Design (webhook-driven model)
- **Section 5:** Database Schema
- **Section 6:** Provider Implementation
- **Section 7:** Webhook Integration

---

### 2. **DEVELOPMENT_PLAN.md**
**When to read:** Daily during implementation

**What's inside:**
- ✅ 2-week step-by-step implementation plan
- ✅ Task breakdown with time estimates
- ✅ Detailed acceptance criteria
- ✅ Risk management and mitigation
- ✅ Deployment checklist

**Key sections:**
- **Section 3:** Task Breakdown
- **Section 4:** Day-by-Day Plan
- **Section 7:** Success Criteria

---

## 🎯 Critical Decisions Made

### Why Webhook-Driven?

**Modern Provider Architecture:**
```
Client → Create Verification → Provider processes internally →
Provider sends webhooks → We update status → Client polls
```

| Webhook-Driven (Chosen) | Multi-Step Orchestration |
|--------------------------|--------------------------|
| ✅ 2 weeks | ❌ 3 weeks |
| ✅ Simpler integration | ❌ Complex workflow engine |
| ✅ Provider handles complexity | ❌ We orchestrate steps |
| ✅ Real-time via webhooks | ⚠️ Real-time via polling |

---

### Key Architectural Patterns

#### 1. **Webhook Handler Pattern**
```
Provider API → Sends webhook → Our handler validates → Updates DB → Client polls
```

#### 2. **Provider Abstraction**
```
VerificationsService → ProvidersFactory → [Regula | External | Future]
```

#### 3. **Hosted Workflow Option**
```
Client → API returns workflow_url → User completes on Provider UI → Webhook notifies us
```

---

## 🗂️ What Gets Built

### New Database Columns

**`verifications` table:**
- `external_verification_id` - Provider's verification ID
- `external_workflow_url` - URL for hosted verification flow
- `external_template_id` - Template used
- `webhook_received_at` - Last webhook timestamp
- `last_webhook_event` - Last event type

**`providers` table:**
- `supports_webhooks` - Provider sends webhooks
- `supports_hosted_workflow` - Provider offers UI
- `webhook_secret` - Secret for signature verification

### New Tables (Optional)

1. **`provider_templates`** - Cached templates
2. **`webhook_logs`** - Audit trail

### New Code Files

```
src/providers/implementations/external/
├── external.provider.ts              ← Main provider adapter
├── external-http.client.ts           ← API communication
├── mappers/
│   ├── request.mapper.ts             ← Map our format → Provider
│   └── response.mapper.ts            ← Map Provider → our format
└── types/
    ├── provider-api.types.ts         ← Provider API types
    └── provider-webhook.types.ts     ← Webhook payload types

src/webhooks/
├── provider-webhook.controller.ts    ← Webhook endpoint
├── provider-webhook.service.ts       ← Webhook processing
└── types/
    └── webhook-events.ts             ← Event type definitions
```

---

## 📅 Implementation Timeline

### Week 1: Foundation & Core Integration

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Database & HTTP Client | Migrations + HTTP client ready |
| Tue | Provider Adapter | Provider implementation |
| Wed | Request/Response Mappers | Data transformation working |
| Thu | Webhook Handler | Webhook endpoint + processing |
| Fri | Testing & Debugging | Unit tests passing |

### Week 2: Integration & Deployment

| Day | Focus | Deliverable |
|-----|-------|-------------|
| Mon | Provider Registration | Provider in factory + DB seeds |
| Tue | Integration Testing | E2E tests with test account |
| Wed | Documentation | API docs + examples |
| Thu | Security Hardening | Signature verification + audit logs |
| Fri | Deployment | Staging deployment + smoke tests |

---

## 🚀 How to Start

### Prerequisites

1. **Get Provider Credentials:**
   ```
   Contact: Provider support
   Need: API Key, Webhook Secret, Test Account
   Dashboard: Provider dashboard URL
   ```

2. **Review Provider API Documentation:**
   - [ ] Read provider's API docs
   - [ ] Skim `EXTERNAL_PROVIDER_INTEGRATION.md`
   - [ ] Read `DEVELOPMENT_PLAN.md` Day 1 section

3. **Setup Environment:**
   ```bash
   # Add to .env
   EXTERNAL_PROVIDER_API_KEY=your_api_key_here
   EXTERNAL_PROVIDER_API_URL=https://provider-api.com/api/v1
   EXTERNAL_PROVIDER_WEBHOOK_SECRET=your_webhook_secret_here
   WEBHOOK_BASE_URL=https://kyc-adapter.com
   ```

### Day 1 - Start Here

**Morning (3 hours):**
1. Create database migration for new columns
2. Create optional `webhook_logs` table
3. Test migrations on local database

**Afternoon (4 hours):**
1. Create HTTP client class
2. Implement API methods
3. Add error handling and logging
4. Test with provider test account

**End of Day:**
- [ ] Migrations run successfully
- [ ] HTTP client can call provider API
- [ ] Test verification can be created
- [ ] Create PR: "External Provider Foundation"

---

## 🔍 Common Questions

### Q: Will existing Regula integrations break?
**A:** No. Zero breaking changes. Regula continues working exactly as before.

### Q: How does the client API change?
**A:** It doesn't! Same endpoints, same request format. Only internal routing changes.

### Q: What if webhook fails?
**A:** We implement retry logic and poll provider API as fallback. Webhook failures are logged.

### Q: How do we test webhooks locally?
**A:** Use `ngrok` to expose local server. Set webhook URL to `https://abc123.ngrok.io/webhooks/provider`.

### Q: What about webhook security?
**A:** We verify HMAC SHA-256 signatures on all webhooks. Invalid signatures are rejected.

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
```

### Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Coverage report
npm run test:cov
```

### Provider-Specific
```bash
# Test connectivity
curl -X GET https://provider-api.com/api/v1/templates \
  -H "X-API-Key: your_api_key_here"

# Test webhook locally with ngrok
ngrok http 3000
```

---

## 📊 Success Metrics

### Functional
- [ ] External provider verification works end-to-end
- [ ] Webhooks received and processed correctly
- [ ] Hosted workflow redirects working
- [ ] Existing Regula integrations unaffected

### Performance
- [ ] Verification creation < 2 seconds
- [ ] Webhook processing < 500ms
- [ ] Status polling < 1 second

### Quality
- [ ] 85%+ test coverage
- [ ] Zero linter warnings
- [ ] All PRs reviewed and approved
- [ ] Documentation complete

---

## 🆘 When You're Stuck

### Problem: Provider API returns 401 Unauthorized
**Solution:** 
1. Verify `X-API-Key` header is set correctly
2. Check API key in `.env` matches provider dashboard
3. Ensure API key has not been revoked

### Problem: Webhooks not received
**Solution:**
1. Check webhook URL is publicly accessible (use ngrok for local dev)
2. Verify webhook URL configured in provider dashboard
3. Review `webhook_logs` table for received but failed webhooks

### Problem: Signature verification fails
**Solution:**
1. Ensure webhook secret matches provider dashboard
2. Verify HMAC computation uses raw request body
3. Check signature format matches provider's specification

---

## 🎉 Ready to Build?

**Start with Day 1 in `DEVELOPMENT_PLAN.md`**

### Quick Checklist:

- [ ] Provider API key obtained
- [ ] Webhook secret received
- [ ] Test account access confirmed
- [ ] PostgreSQL running locally
- [ ] `.env` configured correctly
- [ ] Read this guide completely

### First Task:

```bash
# 1. Create database migration
npm run migration:create AddExternalProviderSupport

# 2. Add new columns to verifications and providers tables
# See EXTERNAL_PROVIDER_INTEGRATION.md Section 5

# 3. Run migration
npm run migration:run

# 4. Verify migration
# Check database to confirm columns exist
```

Good luck! 🚀

---

*Last Updated: January 20, 2025*
*Provider-agnostic design for flexible KYC integrations*

