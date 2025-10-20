/**
 * Test script for Queue and Event Bus
 * Run with: npx ts-node -r tsconfig-paths/register src/queue/test-queue-and-events.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EventBusService } from '../common/services/event-bus.service';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';

async function testQueueAndEvents() {
  const logger = new Logger('QueueTest');

  logger.log('🚀 Starting Queue and Event Bus tests...\n');

  try {
    // Bootstrap the NestJS application
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get services using NestJS dependency injection
    const eventBus = app.get(EventBusService);

    // Get the queue instance using the queue token (production approach)
    const verificationQueue = app.get<Queue>(getQueueToken('verifications'));

    logger.log('✅ Application context created');
    logger.log('✅ Services injected: EventBus, VerificationQueue\n');

    // ============================================
    // Test 1: Event Bus Health Check
    // ============================================
    logger.log('📡 Test 1: Event Bus Health Check');
    const eventBusHealth = await eventBus.getHealth();

    if (eventBusHealth.isHealthy) {
      logger.log('✅ Event Bus is healthy and connected to Redis\n');
    } else {
      logger.error('❌ Event Bus is unhealthy:', eventBusHealth.error);
      throw new Error('Event Bus health check failed');
    }

    // ============================================
    // Test 2: Event Publishing and Subscription
    // ============================================
    logger.log('📡 Test 2: Event Publishing and Subscription');

    let receivedEvent = false;
    const testChannel = 'test:verification:created';

    // Subscribe to test channel
    await eventBus.subscribe(testChannel, (event) => {
      logger.log('📨 Received event:', JSON.stringify(event, null, 2));
      receivedEvent = true;
    });

    // Wait a bit for subscription to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Publish test event
    const testEvent = {
      eventId: 'test-123',
      eventType: 'verification.created',
      verificationId: 'ver-test-001',
      tenantId: 'tenant-001',
      providerId: 'provider-001',
      processingMode: 'async',
      verificationMethod: 'document',
      timestamp: new Date(),
    };

    logger.log('📤 Publishing test event...');
    await eventBus.publish(testChannel, testEvent as any);

    // Wait for event to be received
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (receivedEvent) {
      logger.log('✅ Event published and received successfully\n');
    } else {
      logger.error('❌ Event was not received');
      throw new Error('Event subscription test failed');
    }

    // Unsubscribe from test channel
    await eventBus.unsubscribe(testChannel);

    // ============================================
    // Test 3: Queue Operations (Using Injected Queue)
    // ============================================
    logger.log('📦 Test 3: Queue Operations (Production Approach)');
    logger.log('   Using queue injected via NestJS DI system...');

    logger.log('📊 Queue Info:');
    const jobCounts = await verificationQueue.getJobCounts();
    logger.log(`   - Waiting: ${jobCounts.waiting}`);
    logger.log(`   - Active: ${jobCounts.active}`);
    logger.log(`   - Completed: ${jobCounts.completed}`);
    logger.log(`   - Failed: ${jobCounts.failed}`);
    logger.log(`   - Delayed: ${jobCounts.delayed}\n`);

    // Add a test job to the queue
    logger.log('➕ Adding test job to queue...');
    const testJob = await verificationQueue.add(
      'test-verification',
      {
        verificationId: 'ver-test-002',
        tenantId: 'tenant-001',
        providerId: 'provider-001',
        processingMode: 'async',
        verificationMethod: 'document',
        requestData: {
          firstName: 'John',
          lastName: 'Doe',
        },
        createdAt: new Date(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    logger.log(`✅ Job added with ID: ${testJob.id}`);
    logger.log(`   Job data:`, JSON.stringify(testJob.data, null, 2));

    // Get job status
    const jobState = await testJob.getState();
    logger.log(`   Job state: ${jobState}\n`);

    // Wait a bit and check job counts again
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newJobCounts = await verificationQueue.getJobCounts();
    logger.log('📊 Updated Queue Info:');
    logger.log(`   - Waiting: ${newJobCounts.waiting}`);
    logger.log(`   - Active: ${newJobCounts.active}`);
    logger.log(`   - Completed: ${newJobCounts.completed}`);
    logger.log(`   - Failed: ${newJobCounts.failed}\n`);

    // Clean up - remove the test job
    await testJob.remove();
    logger.log('🧹 Test job removed from queue\n');

    // Note: No need to close the queue - NestJS handles cleanup automatically

    // ============================================
    // Test 4: Helper Event Methods
    // ============================================
    logger.log('📡 Test 4: Helper Event Publishing Methods');

    let progressEventReceived = false;

    // Subscribe to verification progress channel
    await eventBus.subscribe('verification:progress', (event) => {
      logger.log('📨 Progress event received:', event.eventType);
      progressEventReceived = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Use helper method
    await eventBus.publishVerificationProgress({
      eventId: 'progress-123',
      verificationId: 'ver-test-003',
      tenantId: 'tenant-001',
      timestamp: new Date(),
      progress: {
        verificationId: 'ver-test-003',
        currentStep: 2,
        totalSteps: 5,
        progressPercentage: 40,
        status: 'in_progress' as any,
        timestamp: new Date(),
        completedSteps: ['document_upload', 'face_verification'],
        failedSteps: [],
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (progressEventReceived) {
      logger.log('✅ Helper event method works correctly\n');
    }

    // ============================================
    // Cleanup
    // ============================================
    logger.log('🧹 Cleaning up...');
    await app.close();

    logger.log('\n✅ All tests passed successfully! 🎉\n');
    process.exit(0);
  } catch (error) {
    logger.error('\n❌ Test failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
testQueueAndEvents().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
