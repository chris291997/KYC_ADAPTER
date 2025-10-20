/**
 * Event types and payloads for the event-driven verification system
 * These events are published to the event bus and consumed by various services
 */

import { VerificationProgress } from '../../providers/types/async-provider.types';

/**
 * Base event interface
 */
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  tenantId: string;
  metadata?: Record<string, any>;
}

/**
 * Verification created event
 * Published when a new verification is created
 */
export interface VerificationCreatedEvent extends BaseEvent {
  eventType: 'verification.created';
  verificationId: string;
  accountId?: string;
  providerId: string;
  processingMode: 'sync' | 'async';
  verificationMethod: string;
  templateId?: string;
}

/**
 * Verification started event
 * Published when verification processing begins
 */
export interface VerificationStartedEvent extends BaseEvent {
  eventType: 'verification.started';
  verificationId: string;
  jobId?: string;
  estimatedDuration?: number; // seconds
}

/**
 * Step started event
 * Published when a verification step begins
 */
export interface StepStartedEvent extends BaseEvent {
  eventType: 'verification.step.started';
  verificationId: string;
  stepIndex: number;
  stepType: string;
  stepName: string;
  totalSteps: number;
}

/**
 * Step completed event
 * Published when a verification step completes successfully
 */
export interface StepCompletedEvent extends BaseEvent {
  eventType: 'verification.step.completed';
  verificationId: string;
  stepIndex: number;
  stepType: string;
  stepName: string;
  result?: any;
  duration: number; // milliseconds
  progress: VerificationProgress;
}

/**
 * Step failed event
 * Published when a verification step fails
 */
export interface StepFailedEvent extends BaseEvent {
  eventType: 'verification.step.failed';
  verificationId: string;
  stepIndex: number;
  stepType: string;
  stepName: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  willRetry: boolean;
  retryCount?: number;
}

/**
 * Verification progress event
 * Published periodically during long-running verifications
 */
export interface VerificationProgressEvent extends BaseEvent {
  eventType: 'verification.progress';
  verificationId: string;
  progress: VerificationProgress;
}

/**
 * Verification completed event
 * Published when verification successfully completes
 */
export interface VerificationCompletedEvent extends BaseEvent {
  eventType: 'verification.completed';
  verificationId: string;
  accountId?: string;
  status: string;
  result: {
    overall: {
      status: 'passed' | 'failed';
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    document?: any;
    biometric?: any;
    idVerification?: any;
    aml?: any;
  };
  duration: number; // total processing time in milliseconds
  completedAt: Date;
}

/**
 * Verification failed event
 * Published when verification fails
 */
export interface VerificationFailedEvent extends BaseEvent {
  eventType: 'verification.failed';
  verificationId: string;
  accountId?: string;
  error: {
    code: string;
    message: string;
    details?: any;
    step?: string;
  };
  failedAt: Date;
  retryable: boolean;
}

/**
 * Verification expired event
 * Published when verification expires
 */
export interface VerificationExpiredEvent extends BaseEvent {
  eventType: 'verification.expired';
  verificationId: string;
  accountId?: string;
  expiredAt: Date;
}

/**
 * Verification canceled event
 * Published when verification is canceled
 */
export interface VerificationCanceledEvent extends BaseEvent {
  eventType: 'verification.canceled';
  verificationId: string;
  accountId?: string;
  canceledBy?: string;
  reason?: string;
  canceledAt: Date;
}

/**
 * Webhook dispatched event
 * Published when a webhook is sent to external system
 */
export interface WebhookDispatchedEvent extends BaseEvent {
  eventType: 'webhook.dispatched';
  verificationId: string;
  webhookUrl: string;
  attempt: number;
  status: 'success' | 'failed';
  statusCode?: number;
  error?: string;
}

/**
 * Template synced event
 * Published when provider templates are synchronized
 */
export interface TemplateSyncedEvent extends BaseEvent {
  eventType: 'template.synced';
  providerId: string;
  templatesCreated: number;
  templatesUpdated: number;
  templatesDeactivated: number;
  plansCreated: number;
  plansUpdated: number;
  plansDeactivated: number;
  errors: Array<{ item: string; error: string }>;
}

/**
 * Union type of all verification events
 */
export type VerificationEventType =
  | VerificationCreatedEvent
  | VerificationStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | VerificationProgressEvent
  | VerificationCompletedEvent
  | VerificationFailedEvent
  | VerificationExpiredEvent
  | VerificationCanceledEvent
  | WebhookDispatchedEvent
  | TemplateSyncedEvent;

/**
 * Event channel names for pub/sub
 */
export const EVENT_CHANNELS = {
  VERIFICATION_CREATED: 'verification:created',
  VERIFICATION_STARTED: 'verification:started',
  VERIFICATION_PROGRESS: 'verification:progress',
  VERIFICATION_COMPLETED: 'verification:completed',
  VERIFICATION_FAILED: 'verification:failed',
  VERIFICATION_EXPIRED: 'verification:expired',
  VERIFICATION_CANCELED: 'verification:canceled',
  STEP_STARTED: 'verification:step:started',
  STEP_COMPLETED: 'verification:step:completed',
  STEP_FAILED: 'verification:step:failed',
  WEBHOOK_DISPATCHED: 'webhook:dispatched',
  TEMPLATE_SYNCED: 'template:synced',
} as const;

/**
 * Event priority levels for processing
 */
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Event metadata for routing and processing
 */
export interface EventMetadata {
  channel: string;
  priority: EventPriority;
  timestamp: Date;
  publisherId: string;
  correlationId?: string;
  causationId?: string;
  retryable: boolean;
  ttl?: number; // time to live in seconds
}
