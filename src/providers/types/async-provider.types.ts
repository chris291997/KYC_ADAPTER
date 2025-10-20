/**
 * Enhanced types for event-driven, async, and multi-step verification processing
 * Supports template-based workflows and real-time progress tracking
 */

/**
 * Processing mode for providers
 */
export enum ProcessingMode {
  SINGLE_STEP = 'single_step', // Traditional single-step verification (Regula)
  MULTI_STEP = 'multi_step', // Multi-step workflow (template-based)
  ASYNC_WEBHOOK = 'async_webhook', // Async processing with webhook callbacks
}

/**
 * Verification method type
 */
export enum VerificationMethod {
  DOCUMENT = 'document', // Document OCR and validation
  ID_BASED = 'id_based', // Direct ID verification against government databases
  BIOMETRIC = 'biometric', // Face verification and liveness
  AML = 'aml', // Anti-Money Laundering checks
  COMPREHENSIVE = 'comprehensive', // Multiple methods combined
}

/**
 * Template step types
 */
export enum TemplateStepType {
  DOCUMENT_UPLOAD = 'document_upload',
  FACE_VERIFICATION = 'face_verification',
  ID_VERIFICATION = 'id_verification',
  LIVENESS_CHECK = 'liveness_check',
  AML_CHECK = 'aml_check',
  OTP_VERIFICATION = 'otp_verification',
  ADDRESS_VERIFICATION = 'address_verification',
  CUSTOM = 'custom',
}

/**
 * Session status for multi-step workflows
 */
export enum ProviderSessionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Provider template configuration
 */
export interface ProviderTemplate {
  id: string;
  externalTemplateId: string;
  name: string;
  description?: string;
  steps: TemplateStepType[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider plan/pricing information
 */
export interface ProviderPlan {
  id: string;
  planCode: string;
  planName: string;
  category?: string;
  pricing?: {
    amount: number;
    currency: string;
    per?: string; // 'verification', 'month', etc.
  };
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Request to create a template-based verification session
 */
export interface CreateTemplateSessionRequest {
  templateId: string;
  tenantId: string;
  accountId?: string;
  callbackUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Response from creating a verification session
 */
export interface CreateSessionResponse {
  sessionId: string;
  providerSessionId: string;
  templateId: string;
  steps: TemplateStepType[];
  status: ProviderSessionStatus;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Request for ID-based verification (no document upload)
 */
export interface IdBasedVerificationRequest {
  tenantId: string;
  accountId?: string;
  idType: 'nbi' | 'license' | 'prc' | 'police_clearance' | 'crn' | 'sss' | 'tin' | 'passport';
  idNumber: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  planCode?: string; // Specific verification plan to use
  callbackUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Response for async job creation
 */
export interface AsyncJobResponse {
  jobId: string;
  verificationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  statusUrl: string; // URL to poll for status
  estimatedCompletionTime?: number; // seconds
  metadata?: Record<string, any>;
}

/**
 * Verification progress tracking
 */
export interface VerificationProgress {
  verificationId: string;
  currentStep: number;
  totalSteps: number;
  currentStepName?: string;
  progressPercentage: number;
  status: ProviderSessionStatus;
  message?: string;
  estimatedTimeRemaining?: number; // seconds
  completedSteps: string[];
  failedSteps: string[];
  timestamp: Date;
}

/**
 * Event payload for verification lifecycle events
 */
export interface VerificationEvent {
  eventType: 'created' | 'step_started' | 'step_completed' | 'step_failed' | 'completed' | 'failed';
  verificationId: string;
  tenantId: string;
  accountId?: string;
  timestamp: Date;
  progress?: VerificationProgress;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}

/**
 * Webhook payload sent to external systems
 */
export interface WebhookPayload {
  event: string;
  verificationId: string;
  tenantId: string;
  status: string;
  result?: any;
  timestamp: Date;
  signature: string; // HMAC signature for verification
}

/**
 * Template synchronization result
 */
export interface TemplateSyncResult {
  templates: {
    created: number;
    updated: number;
    deactivated: number;
  };
  plans: {
    created: number;
    updated: number;
    deactivated: number;
  };
  errors: Array<{
    item: string;
    error: string;
  }>;
  syncedAt: Date;
}

/**
 * Multi-step verification execution request
 */
export interface MultiStepExecutionRequest {
  sessionId: string;
  verificationId: string;
  steps: TemplateStepType[];
  stepData?: Record<string, any>; // Data needed for each step
}

/**
 * Step execution result
 */
export interface StepExecutionResult {
  stepType: TemplateStepType;
  stepIndex: number;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  error?: {
    code: string;
    message: string;
  };
  duration: number; // milliseconds
  timestamp: Date;
}

/**
 * Provider capabilities extended for async/multi-step
 */
export interface AsyncProviderCapabilities {
  supportsTemplates: boolean;
  supportsIdBasedVerification: boolean;
  supportsAsync: boolean;
  processingMode: ProcessingMode;
  supportedVerificationMethods: VerificationMethod[];
  supportedTemplateSteps: TemplateStepType[];
  maxConcurrentSessions?: number;
  averageProcessingTime?: number; // seconds
}

/**
 * Queue job data for verification processing
 */
export interface VerificationJobData {
  verificationId: string;
  tenantId: string;
  providerId: string;
  processingMode: ProcessingMode;
  verificationMethod: VerificationMethod;
  templateId?: string;
  sessionId?: string;
  requestData: any;
  webhookUrl?: string;
  retryCount?: number;
  createdAt: Date;
}

/**
 * Queue job progress data
 */
export interface JobProgressData {
  verificationId: string;
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  message: string;
  timestamp: Date;
}

/**
 * Configuration for async verification processing
 */
export interface AsyncVerificationConfig {
  enableWebhooks: boolean;
  webhookRetryAttempts: number;
  webhookRetryDelay: number; // milliseconds
  jobTimeout: number; // milliseconds
  maxRetries: number;
  enableRealTimeUpdates: boolean;
  progressUpdateInterval: number; // milliseconds
}
