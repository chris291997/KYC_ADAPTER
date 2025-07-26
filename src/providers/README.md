# KYC Provider System

This document explains the provider abstraction system that allows seamless integration with multiple KYC verification services.

## 🏗️ Architecture Overview

The provider system uses a **factory pattern** with **interface segregation** to create a unified API for different KYC providers:

```
┌─────────────────────────────────────────┐
│             Client Request              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         ProvidersFactory               │
│   ┌─────────────────────────────────┐   │
│   │     getProvider(name)          │   │
│   └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────▼─────────┐
        │   IKycProvider    │
        │    Interface      │
        └─────────┬─────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│Regula │    │Persona│    │Future │
│Service│    │Service│    │Provers│
└───────┘    └───────┘    └───────┘
```

## 📁 File Structure

```
src/providers/
├── interfaces/                     # Type definitions
│   ├── kyc-provider.interface.ts   # Main provider interface
│   ├── document-verification.interface.ts
│   ├── biometric-verification.interface.ts
│   ├── provider-error.interface.ts
│   └── index.ts                    # Barrel exports
├── base/                           # Abstract base class
│   └── base-kyc-provider.ts        # Common provider functionality
├── regula/                         # Regula implementation (TODO)
│   ├── regula.service.ts
│   ├── regula.config.ts
│   └── regula.interfaces.ts
├── persona/                        # Persona implementation (TODO)
│   ├── persona.service.ts
│   ├── persona.config.ts
│   └── persona.interfaces.ts
├── providers.factory.ts            # Provider factory service
├── providers.module.ts             # NestJS module
└── README.md                       # This file
```

## 🔌 Interface Design

### Core Provider Interface

All providers must implement `IKycProvider`:

```typescript
interface IKycProvider {
  getProviderName(): string;
  isAvailable(): Promise<boolean>;
  verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResponse>;
  verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResponse>;
  getConfigSchema(): Record<string, any>;
  validateConfig(config: Record<string, any>): boolean;
}
```

### Request/Response Standardization

**Document Verification:**
```typescript
// Request
interface DocumentVerificationRequest {
  documentFile: Express.Multer.File;
  documentType?: DocumentType;
  country?: string;
  clientId: string;
  requestId: string;
  options?: DocumentVerificationOptions;
}

// Response (Standardized)
interface DocumentVerificationResponse {
  isValid: boolean;
  confidenceScore: number;
  extractedData: ExtractedDocumentData;
  securityChecks: SecurityCheckResults;
  providerResponse: any; // Raw provider data
}
```

**Biometric Verification:**
```typescript
// Request
interface BiometricVerificationRequest {
  selfieFile: Express.Multer.File;
  referenceFile?: Express.Multer.File;
  clientId: string;
  requestId: string;
  options?: BiometricVerificationOptions;
}

// Response (Standardized)
interface BiometricVerificationResponse {
  isMatch: boolean;
  confidenceScore: number;
  livenessCheck: LivenessCheckResult;
  faceAnalysis: FaceAnalysisResult;
  providerResponse: any; // Raw provider data
}
```

## 🛠️ Creating a New Provider

### 1. Implement the Provider Service

```typescript
// src/providers/new-provider/new-provider.service.ts
import { Injectable } from '@nestjs/common';
import { BaseKycProvider } from '../base/base-kyc-provider';
import { 
  DocumentVerificationRequest, 
  DocumentVerificationResponse,
  BiometricVerificationRequest,
  BiometricVerificationResponse 
} from '../interfaces';

@Injectable()
export class NewProviderService extends BaseKycProvider {
  constructor() {
    super('new-provider', {
      apiKey: process.env.NEW_PROVIDER_API_KEY,
      apiUrl: process.env.NEW_PROVIDER_API_URL,
      timeout: 30000,
    });
  }

  async verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResponse> {
    const startTime = Date.now();
    this.logRequest('document', request.requestId, request.clientId);

    try {
      // Validate input
      this.validateFile(request.documentFile);

      // Call provider API
      const result = await this.executeWithRetry(async () => {
        return await this.callProviderDocumentAPI(request);
      }, 3, request.requestId);

      // Transform to standardized response
      const response = this.transformDocumentResponse(result, startTime);
      
      this.logResponse('document', request.requestId, response.isValid, response.processingTime);
      return response;

    } catch (error) {
      this.logResponse('document', request.requestId, false, this.calculateProcessingTime(startTime));
      throw error;
    }
  }

  async verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResponse> {
    // Similar implementation...
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Make a lightweight API call to check provider status
      const response = await fetch(`${this.config.apiUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getConfigSchema(): Record<string, any> {
    return {
      apiKey: { type: 'string', required: true },
      apiUrl: { type: 'string', required: true },
      timeout: { type: 'number', default: 30000 },
    };
  }

  validateConfig(config: Record<string, any>): boolean {
    return !!(config.apiKey && config.apiUrl);
  }

  // Provider-specific methods
  private async callProviderDocumentAPI(request: DocumentVerificationRequest): Promise<any> {
    // Implementation specific to this provider's API
  }

  private transformDocumentResponse(providerResult: any, startTime: number): DocumentVerificationResponse {
    // Transform provider response to standardized format
  }
}
```

### 2. Register the Provider

```typescript
// In providers.module.ts
import { NewProviderService } from './new-provider/new-provider.service';

@Module({
  providers: [ProvidersFactory, NewProviderService],
  exports: [ProvidersFactory],
})
export class ProvidersModule {
  constructor(
    private readonly providersFactory: ProvidersFactory,
    private readonly newProviderService: NewProviderService,
  ) {
    this.registerProviders();
  }

  private registerProviders(): void {
    this.providersFactory.registerProvider(this.newProviderService, {
      name: 'new-provider',
      displayName: 'New Provider Name',
      version: '1.0.0',
      description: 'Provider description',
      website: 'https://provider-website.com',
      capabilities: {
        supportsDocumentVerification: true,
        supportsBiometricVerification: true,
        supportsLivenessDetection: false,
        supportedDocumentTypes: ['passport', 'id_card'],
        supportedCountries: ['US', 'CA'],
        maxFileSize: 10 * 1024 * 1024,
        supportedImageFormats: ['jpeg', 'png'],
      },
    });
  }
}
```

## 🔄 Using the Provider System

### In Controllers/Services

```typescript
import { ProvidersFactory } from '../providers/providers.factory';
import { DocumentVerificationRequest } from '../providers/interfaces';

@Injectable()
export class VerificationService {
  constructor(private readonly providersFactory: ProvidersFactory) {}

  async verifyDocument(clientId: string, file: Express.Multer.File, documentType: string) {
    // Get the provider assigned to this client
    const provider = await this.getClientProvider(clientId);

    // Create standardized request
    const request: DocumentVerificationRequest = {
      documentFile: file,
      documentType: documentType as DocumentType,
      clientId,
      requestId: this.generateRequestId(),
    };

    // Perform verification
    const result = await provider.verifyDocument(request);

    // Return standardized response
    return {
      success: result.isValid,
      data: {
        isValid: result.isValid,
        confidence: result.confidenceScore,
        extractedData: result.extractedData,
        provider: provider.getProviderName(),
      },
      raw: result.providerResponse, // Include raw provider data
    };
  }

  private async getClientProvider(clientId: string): Promise<IKycProvider> {
    // TODO: Look up client's assigned provider from database
    // For now, use a default
    return this.providersFactory.getProvider('regula');
  }
}
```

## 🔍 Error Handling

The system provides standardized error handling:

```typescript
import { KycErrorFactory, ErrorCategory } from '../providers/interfaces';

// Create standardized errors
const validationError = KycErrorFactory.createValidationError(
  'Invalid document type',
  'documentType',
  'req-123'
);

const providerError = KycErrorFactory.createProviderError(
  'Provider API unavailable',
  originalError,
  'req-123',
  true // retryable
);
```

## 🏥 Health Monitoring

Check provider health status:

```typescript
// Check all providers
const healthStatus = await providersFactory.checkAllProvidersHealth();
// Returns: { regula: true, persona: false }

// Check specific provider
const provider = providersFactory.getProvider('regula');
const isAvailable = await provider.isAvailable();

// Get detailed health info
const healthDetails = provider.getLastHealthCheck();
```

## 📊 Provider Capabilities

Query provider capabilities:

```typescript
// Get providers that support biometric verification
const biometricProviders = providersFactory.getProvidersByCapability('supportsBiometricVerification');

// Get all provider metadata
const allProviders = providersFactory.getAllProviderMetadata();

// Get specific provider info
const regulaInfo = providersFactory.getProviderMetadata('regula');
```

## 🚀 Next Steps

1. **Implement Regula Provider** - Create `src/providers/regula/regula.service.ts`
2. **Implement Persona Provider** - Create `src/providers/persona/persona.service.ts`
3. **Add Provider Registration** - Update `providers.module.ts` to register implemented providers
4. **Create Client Service** - Implement client-to-provider mapping logic
5. **Add Monitoring** - Implement health check endpoints and metrics

## 🔗 Integration Points

- **Database**: Client-provider mappings stored in `client_provider_configs`
- **Authentication**: API key validation determines client and their provider
- **Logging**: All provider interactions logged for audit trails
- **Monitoring**: Health checks and performance metrics for all providers

This architecture ensures that adding new providers is straightforward while maintaining a consistent API for the application layer. 