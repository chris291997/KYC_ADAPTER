import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

// ================================
// BUSINESS DOMAIN EXCEPTIONS
// ================================

export class TenantNotActiveException extends BadRequestException {
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} is not active and cannot perform operations`);
  }
}

export class ProviderNotConfiguredException extends BadRequestException {
  constructor(tenantId: string) {
    super(
      `No KYC provider configured for tenant ${tenantId}. Please contact admin to assign a provider.`,
    );
  }
}

export class ProviderNotAvailableException extends NotFoundException {
  constructor(providerName: string) {
    super(`KYC provider '${providerName}' is not available or not registered`);
  }
}

export class ProviderUnhealthyException extends BadRequestException {
  constructor(providerName: string) {
    super(`KYC provider '${providerName}' is currently unhealthy and cannot process requests`);
  }
}

export class ProviderAlreadyAssignedException extends ConflictException {
  constructor(providerName: string, tenantId: string) {
    super(`Provider '${providerName}' is already assigned to tenant ${tenantId}`);
  }
}

export class AccountNotFoundInTenantException extends NotFoundException {
  constructor(accountId: string, tenantId: string) {
    super(`Account ${accountId} not found in tenant ${tenantId}`);
  }
}

export class VerificationNotFoundException extends NotFoundException {
  constructor(verificationId: string, tenantId?: string) {
    const message = tenantId
      ? `Verification ${verificationId} not found for tenant ${tenantId}`
      : `Verification ${verificationId} not found`;
    super(message);
  }
}

export class InvalidVerificationStateException extends BadRequestException {
  constructor(verificationId: string, currentState: string, requiredState: string) {
    super(
      `Verification ${verificationId} is in state '${currentState}' but requires '${requiredState}'`,
    );
  }
}

export class FileProcessingException extends BadRequestException {
  constructor(fileName: string, reason: string) {
    super(`Failed to process file '${fileName}': ${reason}`);
  }
}

export class ProviderProcessingException extends BadRequestException {
  constructor(providerName: string, details: string) {
    super(`Provider ${providerName} processing failed: ${details}`);
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(action: string, role: string) {
    super(`Role '${role}' does not have permission to perform action: ${action}`);
  }
}

export class ApiKeyExpiredException extends UnauthorizedException {
  constructor(keyId: string) {
    super(`API key ${keyId} has expired`);
  }
}

export class RateLimitExceededException extends BadRequestException {
  constructor(tenantId: string, limit: string) {
    super(`Tenant ${tenantId} has exceeded rate limit: ${limit}`);
  }
}
