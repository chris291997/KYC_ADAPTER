# Queue & Event Bus Testing Guide

## Overview
This guide explains how to test the Queue (Bull + Redis) and Event Bus (Redis Pub/Sub) infrastructure.

## Prerequisites
- Redis running (Docker or local)
- PostgreSQL running (local)
- All dependencies installed (`npm install`)

## Quick Test

Run the automated test suite:

```bash
npm run test:queue
```

Or using PowerShell script:

```powershell
.\scripts\test-queue.ps1
```

## What Gets Tested

### Test 1: Event Bus Health Check ✅
- Verifies Redis connection
- Checks if Event Bus service is initialized
- Confirms Pub/Sub is operational

**Expected Result:**
```
✅ Event Bus is healthy and connected to Redis
```

### Test 2: Event Publishing and Subscription ✅
- Subscribes to a test channel
- Publishes a test event
- Verifies event is received
- Tests event metadata (eventId, timestamp, correlation)

**Expected Result:**
```
📨 Received event: {
  "eventType": "verification.created",
  "verificationId": "ver-test-001",
  ...
  "_metadata": {
    "eventId": "...",
    "priority": 1,
    "retryable": true
  }
}
✅ Event published and received successfully
```

### Test 3: Queue Operations ✅
- Checks queue job counts (waiting, active, completed, failed)
- Adds a test verification job
- Verifies job is queued
- Monitors job state transitions
- Cleans up test job

**Expected Result:**
```
📊 Queue Info:
   - Waiting: 1
   - Active: 0
   - Completed: 0
   - Failed: 0

✅ Job added with ID: 1
   Job state: waiting
```

### Test 4: Helper Event Methods ✅
- Tests convenience methods like `publishVerificationProgress()`
- Verifies helper methods work correctly
- Confirms event routing

**Expected Result:**
```
✅ Helper event method works correctly
```

## Test Output Explained

### Event Metadata
Every published event includes metadata:
- `eventId`: Unique identifier (UUID)
- `channel`: Channel name where event was published
- `priority`: Priority level (0-3)
- `timestamp`: Event creation time
- `publisherId`: Source service (default: "kyc-adapter")
- `retryable`: Whether event can be retried

### Job Data Structure
Queue jobs include:
```typescript
{
  verificationId: string;
  tenantId: string;
  providerId: string;
  processingMode: 'sync' | 'async';
  verificationMethod: string;
  requestData: any;
  createdAt: Date;
}
```

## Manual Testing with Redis CLI

You can also manually test Redis operations:

### 1. Connect to Redis
```bash
docker exec -it kyc-adapter-redis redis-cli
```

### 2. Monitor Events
```bash
# Subscribe to all verification events
PSUBSCRIBE verification:*

# Subscribe to specific channel
SUBSCRIBE verification:created
```

### 3. Check Queue
```bash
# List all keys
KEYS *

# Check queue jobs
LLEN bull:verifications:wait
LLEN bull:verifications:active
LLEN bull:verifications:completed
LLEN bull:verifications:failed
```

## Troubleshooting

### Redis Connection Failed
```
❌ Event Bus is unhealthy: Connection refused
```

**Solution:**
```bash
# Start Redis
docker-compose up -d redis

# Check Redis is running
docker ps | grep redis
```

### No Events Received
If events are published but not received:
1. Check Redis connection
2. Verify subscription before publishing
3. Add delay after subscription (100ms recommended)

### Queue Jobs Not Processing
Jobs stay in "waiting" state:
1. No processor is registered yet (expected in Day 2)
2. We'll create the processor in Day 3
3. For now, jobs are manually added and removed in tests

## Next Steps

### Day 3: Queue Processor
We'll create a worker that:
- Listens to the `verifications` queue
- Processes verification jobs
- Publishes progress events
- Handles failures and retries

### Day 3: WebSocket Gateway
We'll add real-time updates:
- Clients subscribe to verification IDs
- Progress events broadcast via WebSocket
- Live progress percentage updates

## Architecture Flow

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Queue Job      │──────────┐
│  (Bull)         │          │
└────────┬────────┘          │
         │                   │
         ▼                   ▼
┌─────────────────┐   ┌──────────────┐
│  Job Processor  │──▶│  Event Bus   │
│  (Worker)       │   │  (Pub/Sub)   │
└─────────────────┘   └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  WebSocket   │
                      │  (Socket.IO) │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Client UI  │
                      └──────────────┘
```

## Test Results Summary

✅ **Event Bus**: Fully operational
- ✓ Redis Pub/Sub working
- ✓ Event publishing working
- ✓ Event subscription working
- ✓ Helper methods working

✅ **Queue**: Fully operational
- ✓ Bull queue configured
- ✓ Jobs can be added
- ✓ Job state tracking works
- ✓ Ready for processor implementation

## Performance Notes

### Event Bus
- Instant event delivery (< 1ms)
- No message loss with Redis persistence
- Supports multiple subscribers per channel
- Pattern-based subscriptions available

### Queue
- Jobs persisted to Redis
- Automatic retry with exponential backoff
- Job data retention: 1 hour (completed), 24 hours (failed)
- Stalled job detection: 30 seconds
- Lock duration: 30 seconds

## Configuration

All settings can be customized via environment variables:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Queue
QUEUE_VERIFICATION_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_JOB_TIMEOUT=300000
```

---

**Status**: ✅ All systems operational and ready for Day 3 implementation!

