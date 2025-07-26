/**
 * Standardized error response for all KYC operations
 */
export interface KycError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  timestamp: Date;
  requestId?: string;
  providerError?: any; // Raw provider error for debugging
  details?: Record<string, any>;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  // Authentication and authorization errors
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',

  // Request validation errors
  VALIDATION = 'validation',
  INVALID_INPUT = 'invalid_input',
  MISSING_REQUIRED_FIELD = 'missing_required_field',

  // File-related errors
  FILE_ERROR = 'file_error',
  UNSUPPORTED_FILE_TYPE = 'unsupported_file_type',
  FILE_TOO_LARGE = 'file_too_large',
  FILE_CORRUPTED = 'file_corrupted',

  // Provider-specific errors
  PROVIDER_ERROR = 'provider_error',
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  PROVIDER_TIMEOUT = 'provider_timeout',

  // Rate limiting and quotas
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',

  // Processing errors
  PROCESSING_ERROR = 'processing_error',
  VERIFICATION_FAILED = 'verification_failed',
  QUALITY_TOO_LOW = 'quality_too_low',

  // System errors
  INTERNAL_ERROR = 'internal_error',
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',

  // Configuration errors
  CONFIGURATION_ERROR = 'configuration_error',
  MISSING_CREDENTIALS = 'missing_credentials',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low', // Warnings, minor issues
  MEDIUM = 'medium', // Errors that can be recovered
  HIGH = 'high', // Serious errors requiring attention
  CRITICAL = 'critical', // System-level failures
}

/**
 * Predefined error codes for common scenarios
 */
export class KycErrorCodes {
  // Authentication errors
  static readonly INVALID_API_KEY = 'INVALID_API_KEY';
  static readonly EXPIRED_API_KEY = 'EXPIRED_API_KEY';
  static readonly INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS';

  // Validation errors
  static readonly INVALID_INPUT = 'INVALID_INPUT';
  static readonly MISSING_FILE = 'MISSING_FILE';
  static readonly INVALID_FILE_TYPE = 'INVALID_FILE_TYPE';
  static readonly FILE_TOO_LARGE = 'FILE_TOO_LARGE';
  static readonly INVALID_DOCUMENT_TYPE = 'INVALID_DOCUMENT_TYPE';
  static readonly INVALID_COUNTRY_CODE = 'INVALID_COUNTRY_CODE';

  // Processing errors
  static readonly DOCUMENT_NOT_DETECTED = 'DOCUMENT_NOT_DETECTED';
  static readonly FACE_NOT_DETECTED = 'FACE_NOT_DETECTED';
  static readonly MULTIPLE_FACES_DETECTED = 'MULTIPLE_FACES_DETECTED';
  static readonly POOR_IMAGE_QUALITY = 'POOR_IMAGE_QUALITY';
  static readonly DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED';
  static readonly DOCUMENT_TAMPERED = 'DOCUMENT_TAMPERED';
  static readonly LIVENESS_CHECK_FAILED = 'LIVENESS_CHECK_FAILED';
  static readonly FACE_MATCH_FAILED = 'FACE_MATCH_FAILED';

  // Rate limiting
  static readonly RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED';
  static readonly DAILY_QUOTA_EXCEEDED = 'DAILY_QUOTA_EXCEEDED';
  static readonly MONTHLY_QUOTA_EXCEEDED = 'MONTHLY_QUOTA_EXCEEDED';

  // Provider errors
  static readonly PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE';
  static readonly PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT';
  static readonly PROVIDER_API_ERROR = 'PROVIDER_API_ERROR';
  static readonly UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION';

  // System errors
  static readonly INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR';
  static readonly DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR';
  static readonly NETWORK_ERROR = 'NETWORK_ERROR';
  static readonly CONFIGURATION_ERROR = 'CONFIGURATION_ERROR';
}

/**
 * Factory class for creating standardized errors
 */
export class KycErrorFactory {
  static createValidationError(message: string, field?: string, requestId?: string): KycError {
    return {
      code: KycErrorCodes.INVALID_INPUT,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      timestamp: new Date(),
      requestId,
      details: field ? { field } : undefined,
    };
  }

  static createFileError(code: string, message: string, requestId?: string): KycError {
    return {
      code,
      message,
      category: ErrorCategory.FILE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      timestamp: new Date(),
      requestId,
    };
  }

  static createProviderError(
    message: string,
    providerError?: any,
    requestId?: string,
    retryable: boolean = false,
  ): KycError {
    return {
      code: KycErrorCodes.PROVIDER_API_ERROR,
      message,
      category: ErrorCategory.PROVIDER_ERROR,
      severity: ErrorSeverity.HIGH,
      retryable,
      timestamp: new Date(),
      requestId,
      providerError,
    };
  }

  static createRateLimitError(message: string, retryAfter?: number, requestId?: string): KycError {
    return {
      code: KycErrorCodes.RATE_LIMIT_EXCEEDED,
      message,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      timestamp: new Date(),
      requestId,
      details: retryAfter ? { retryAfter } : undefined,
    };
  }

  static createProcessingError(code: string, message: string, requestId?: string): KycError {
    return {
      code,
      message,
      category: ErrorCategory.PROCESSING_ERROR,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      timestamp: new Date(),
      requestId,
    };
  }

  static createInternalError(message: string, error?: Error, requestId?: string): KycError {
    return {
      code: KycErrorCodes.INTERNAL_SERVER_ERROR,
      message,
      category: ErrorCategory.INTERNAL_ERROR,
      severity: ErrorSeverity.CRITICAL,
      retryable: true,
      timestamp: new Date(),
      requestId,
      details: error ? { stack: error.stack } : undefined,
    };
  }
}
