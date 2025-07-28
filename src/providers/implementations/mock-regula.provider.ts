import { Injectable, Logger } from '@nestjs/common';
import { IKycProvider } from '../interfaces/kyc-provider.interface';
import {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
  ProviderHealthResponse,
  ProviderCredentials,
  ProviderConfig,
  VerificationStatus,
  VerificationType,
  VerificationResult,
  ProcessingMethod,
} from '../types/provider.types';

/**
 * Mock implementation of Regula KYC provider for development and testing
 * Simulates Regula's actual direct document processing workflow
 *
 * Key differences from external link providers:
 * - Processes documents directly (no external verification links)
 * - Returns immediate results
 * - Simulates MRZ reading, OCR, and authenticity checks
 */
@Injectable()
export class MockRegulaProvider implements IKycProvider {
  private readonly logger = new Logger(MockRegulaProvider.name);
  private credentials: ProviderCredentials;
  private config: ProviderConfig;

  // In-memory storage for processed verifications
  private verifications = new Map<string, any>();

  readonly name = 'regula-mock';
  readonly type = 'regula';

  async initialize(credentials: ProviderCredentials, config?: ProviderConfig): Promise<void> {
    this.logger.log('Initializing Mock Regula Provider');
    this.credentials = credentials;
    this.config = {
      processingMethod: ProcessingMethod.DIRECT,
      maxVerificationsPerDay: 1000,
      allowedDocumentTypes: [],
      requireBiometric: false,
      ...config,
    };

    // Validate credentials format
    if (!credentials.apiKey) {
      throw new Error('Regula API key is required');
    }

    this.logger.log('Mock Regula Provider initialized successfully');
  }

  async createVerification(request: VerificationRequest): Promise<VerificationResponse> {
    this.logger.log(
      `Processing ${request.verificationType} verification for tenant ${request.tenantId}`,
    );

    // Generate mock ID
    const providerVerificationId = this.generateMockId('regula');

    // For Regula, we simulate immediate processing (no external links)
    // In reality, documents would be uploaded and processed by Regula SDK
    const result = await this.processDocumentDirect(request);

    // Store verification
    const verification = {
      id: providerVerificationId,
      request,
      status:
        result.overall.status === 'passed'
          ? VerificationStatus.COMPLETED
          : VerificationStatus.FAILED,
      result,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.verifications.set(providerVerificationId, verification);

    const response: VerificationResponse = {
      id: `internal-${Date.now()}`,
      providerVerificationId,
      status: verification.status,
      processingMethod: ProcessingMethod.DIRECT,
      result, // Immediate result for Regula
      metadata: {
        provider: 'regula',
        environment: 'mock',
        processingType: 'direct',
        processingTime: this.getRandomNumber(800, 2500),
      },
    };

    this.logger.log(
      `Processed verification ${providerVerificationId} with status: ${verification.status}`,
    );
    return response;
  }

  async getVerificationStatus(providerVerificationId: string): Promise<VerificationStatusResponse> {
    this.logger.log(`Getting status for verification ${providerVerificationId}`);

    const verification = this.verifications.get(providerVerificationId);
    if (!verification) {
      throw new Error(`Verification ${providerVerificationId} not found`);
    }

    return {
      id: verification.id,
      providerVerificationId,
      status: verification.status,
      processingMethod: ProcessingMethod.DIRECT,
      result: verification.result,
      updatedAt: verification.updatedAt,
    };
  }

  async cancelVerification(providerVerificationId: string): Promise<boolean> {
    this.logger.log(`Attempting to cancel verification ${providerVerificationId}`);

    const verification = this.verifications.get(providerVerificationId);
    if (!verification) {
      return false;
    }

    // Regula direct processing is immediate, so cancellation is not applicable
    this.logger.warn('Cannot cancel Regula verification - processing is immediate');
    return false;
  }

  async handleWebhook(
    _payload: any,
    _signature?: string,
  ): Promise<VerificationStatusResponse | null> {
    // Regula SDK processes documents directly, no webhooks in typical usage
    this.logger.warn('Regula provider does not use webhooks for direct processing');
    return null;
  }

  async healthCheck(): Promise<ProviderHealthResponse> {
    // Simulate Regula SDK health check
    const start = Date.now();

    // Simulate SDK availability (99% healthy)
    const isHealthy = Math.random() > 0.01;
    const latency = Date.now() - start + this.getRandomNumber(10, 50);

    return {
      isHealthy,
      latency,
      lastChecked: new Date(),
      error: isHealthy ? undefined : 'Mock SDK initialization error',
    };
  }

  async validateCredentials(): Promise<boolean> {
    // Simulate credential validation
    return !!(this.credentials?.apiKey && this.credentials.apiKey.startsWith('regula_'));
  }

  // ================================
  // REGULA-SPECIFIC PROCESSING
  // ================================

  private async processDocumentDirect(request: VerificationRequest): Promise<VerificationResult> {
    // Simulate processing delay (Regula is fast for direct processing)
    await new Promise((resolve) => setTimeout(resolve, this.getRandomNumber(500, 1500)));

    // Simulate 90% success rate for direct processing
    const isSuccess = Math.random() > 0.1;

    if (!isSuccess) {
      return this.generateFailureResult();
    }

    const result: VerificationResult = {
      overall: {
        status: 'passed',
        confidence: this.getRandomNumber(85, 98),
        riskLevel: 'low',
      },
    };

    // Process document verification
    if (
      request.verificationType === VerificationType.DOCUMENT ||
      request.verificationType === VerificationType.COMPREHENSIVE
    ) {
      result.document = this.processDocumentVerification();
    }

    // Process biometric verification
    if (
      request.verificationType === VerificationType.BIOMETRIC ||
      request.verificationType === VerificationType.COMPREHENSIVE
    ) {
      result.biometric = this.processBiometricVerification();
    }

    result.metadata = {
      provider: 'regula',
      sdkVersion: '8.2.0',
      processingTime: this.getRandomNumber(800, 2500),
      timestamp: new Date().toISOString(),
      // Regula-specific metadata
      mrzParsed: true,
      authenticityChecksPerformed: ['UV_LUMINESCENCE', 'MRZ_QUALITY', 'HOLOGRAM_DETECTION'],
      rfidProcessed: Math.random() > 0.7, // 30% of documents have RFID
    };

    return result;
  }

  private processDocumentVerification() {
    // Simulate MRZ reading
    const mrzData = this.simulateMrzReading();

    return {
      extracted: {
        firstName: mrzData.firstName,
        lastName: mrzData.lastName,
        dateOfBirth: mrzData.dateOfBirth,
        nationality: mrzData.nationality,
        documentNumber: mrzData.documentNumber,
        expiryDate: mrzData.dateOfExpiry,
        issuingCountry: mrzData.issuingCountry,
      },
      checks: {
        authenticity: 'passed' as const,
        validity: 'passed' as const,
        dataConsistency: 'passed' as const,
      },
      confidence: this.getRandomNumber(85, 98),
    };
  }

  private processBiometricVerification() {
    return {
      livenessCheck: 'passed' as const,
      faceMatch: 'passed' as const,
      confidence: this.getRandomNumber(88, 97),
    };
  }

  private simulateMrzReading() {
    const sampleNames = [
      { first: 'JOHN', last: 'SMITH' },
      { first: 'MARIA', last: 'GARCIA' },
      { first: 'MOHAMED', last: 'ALI' },
      { first: 'ANNA', last: 'MUELLER' },
    ];

    const sample = sampleNames[Math.floor(Math.random() * sampleNames.length)];

    return {
      documentType: 'P',
      issuingCountry: 'USA',
      lastName: sample.last,
      firstName: sample.first,
      documentNumber: `P${this.generateRandomString(8)}`,
      nationality: 'USA',
      dateOfBirth: '1990-05-15',
      sex: Math.random() > 0.5 ? 'M' : 'F',
      dateOfExpiry: '2030-12-15',
      personalNumber: this.generateRandomString(9),
    };
  }

  private generateFailureResult(): VerificationResult {
    return {
      overall: {
        status: 'failed',
        confidence: this.getRandomNumber(10, 35),
        riskLevel: 'high',
      },
      risks: [
        {
          type: 'poor_image_quality',
          level: 'high',
          description: 'Document image quality insufficient for Regula SDK processing',
        },
      ],
      metadata: {
        provider: 'regula',
        processingTime: this.getRandomNumber(300, 800),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ================================
  // HELPER METHODS
  // ================================

  private generateMockId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}`;
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
