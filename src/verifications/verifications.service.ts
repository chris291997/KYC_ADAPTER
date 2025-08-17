import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, Account } from '../database/entities';
import {
  ProviderNotConfiguredException,
  VerificationNotFoundException,
  InvalidVerificationStateException,
  TenantNotActiveException,
  AccountNotFoundInTenantException,
} from '../common/exceptions/business.exceptions';
import { ProvidersFactory } from '../providers/providers.factory';
import { IKycProvider } from '../providers/interfaces/kyc-provider.interface';
import {
  VerificationType,
  VerificationStatus,
  ProcessingMethod,
  VerificationRequest,
  VerificationResponse,
} from '../providers/types/provider.types';
import { ImgbbService } from '../common/services/imgbb.service';

export interface CreateVerificationRequest {
  tenantId: string;
  accountId?: string;
  verificationType: VerificationType;
  documentImages?: {
    front?: string; // base64
    back?: string; // base64
    selfie?: string; // base64
  };
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  id: string;
  tenantId: string;
  accountId?: string;
  providerName: string;
  providerVerificationId: string;
  status: VerificationStatus;
  verificationType: VerificationType;
  processingMethod: ProcessingMethod;
  verificationLink?: string;
  expiresAt?: Date;
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class VerificationsService {
  private readonly logger = new Logger(VerificationsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly providersFactory: ProvidersFactory,
    private readonly imgbbService: ImgbbService,
  ) {}

  /**
   * Create a new verification request
   * This is the main entry point for tenant verification requests
   */
  async createVerification(request: CreateVerificationRequest): Promise<VerificationResult> {
    this.logger.log(`Creating verification for tenant ${request.tenantId}`);

    try {
      // 1. Validate tenant exists and is active
      await this.validateTenant(request.tenantId);

      // 2. Validate account if provided
      if (request.accountId) {
        await this.validateAccount(request.accountId, request.tenantId);
      }

      // 3. Get assigned provider for this tenant
      const { provider, config, providerConfig } = await this.getProviderForTenant(
        request.tenantId,
      );

      // 4. Optionally upload images to imgbb (temporary hosting)
      const imageUrls = await this.uploadDocumentImagesToImgbb(
        request.documentImages || {},
        request.tenantId,
      );

      // 5. Create verification request for the provider
      const providerRequest = this.buildProviderRequest(request, config);

      // 6. Execute verification with the provider
      const providerResponse = await provider.createVerification(providerRequest);

      // 6b. Attach hosted image URLs into results for downstream rendering (admin/tenant UIs)
      if (imageUrls && Object.keys(imageUrls).length > 0) {
        providerResponse.result =
          providerResponse.result ||
          ({
            overall: { status: 'pending', confidence: 0, riskLevel: 'low' },
          } as any);
        (providerResponse.result as any).metadata = {
          ...(providerResponse.result as any).metadata,
          imageUrls,
        };
      }

      // 7. Store verification in database
      const verification = await this.storeVerification(
        request,
        provider.name,
        providerResponse,
        providerConfig,
      );

      this.logger.log(
        `Verification created successfully: ${verification.id} (${providerResponse.providerVerificationId})`,
      );

      return verification;
    } catch (error) {
      this.logger.error(`Verification creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get verification status and results
   */
  async getVerification(verificationId: string, tenantId: string): Promise<VerificationResult> {
    this.logger.log(`Getting verification ${verificationId} for tenant ${tenantId}`);

    try {
      // Get verification from database
      let verification = await this.getVerificationFromDatabase(verificationId, tenantId);

      if (!verification) {
        throw new VerificationNotFoundException(verificationId, tenantId);
      }

      // Check for expiration first
      verification = await this.checkAndUpdateExpiration(verification);

      // If verification is still pending (and not expired), check with provider for updates
      if (
        verification.status === VerificationStatus.PENDING ||
        verification.status === VerificationStatus.IN_PROGRESS
      ) {
        try {
          const { provider } = await this.getProviderForTenant(tenantId);
          const providerStatus = await provider.getVerificationStatus(
            verification.providerVerificationId,
          );

          // Update database if status changed
          if (providerStatus.status !== verification.status) {
            await this.updateVerificationStatus(verification.id, providerStatus);
            verification.status = providerStatus.status;
            verification.result = providerStatus.result;
          }
        } catch (error) {
          this.logger.error(`Failed to get provider status: ${error.message}`);
          // Continue with database version
        }
      }

      return verification;
    } catch (error) {
      this.logger.error(`Failed to get verification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * List verifications for a tenant with pagination
   */
  async listVerifications(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: VerificationStatus;
      verificationType?: VerificationType;
      accountId?: string;
    } = {},
  ): Promise<{
    verifications: VerificationResult[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    this.logger.log(`Listing verifications for tenant ${tenantId}, page ${page}`);

    // Build query with filters
    let query = `
      SELECT 
        v.id, v.tenant_id, v.account_id, v.provider_id, v.provider_config_id,
        v.provider_verification_id, v.verification_type, v.status, 
        v.result, v.response_metadata, v.request_metadata,
        v.created_at, v.updated_at,
        p.name as provider_name
      FROM verifications v
      LEFT JOIN providers p ON v.provider_id = p.id
      WHERE v.tenant_id = $1
    `;

    const params = [tenantId];
    let paramCount = 1;

    if (options.status) {
      paramCount++;
      query += ` AND v.status = $${paramCount}`;
      params.push(options.status);
    }

    if (options.verificationType) {
      paramCount++;
      query += ` AND v.verification_type = $${paramCount}`;
      params.push(options.verificationType);
    }

    if (options.accountId) {
      paramCount++;
      query += ` AND v.account_id = $${paramCount}`;
      params.push(options.accountId);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT v.id, v.tenant_id, v.account_id, v.provider_id, v.provider_config_id, v.provider_verification_id, v.verification_type, v.status, v.result, v.response_metadata, v.request_metadata, v.created_at, v.updated_at, p.name as provider_name',
      'SELECT COUNT(*) as total',
    );

    const countResults = await this.tenantRepository.query(countQuery, params);
    const total = countResults?.[0]?.total ? parseInt(countResults[0].total.toString()) : 0;

    // Get paginated results
    query += ` ORDER BY v.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit.toString(), offset.toString());

    const verifications = await this.tenantRepository.query(query, params);

    return {
      verifications: verifications.map(this.mapDatabaseToResult),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel a pending verification
   */
  async cancelVerification(verificationId: string, tenantId: string): Promise<boolean> {
    this.logger.log(`Cancelling verification ${verificationId} for tenant ${tenantId}`);

    try {
      const verification = await this.getVerificationFromDatabase(verificationId, tenantId);

      if (!verification) {
        throw new VerificationNotFoundException(verificationId, tenantId);
      }

      if (
        verification.status !== VerificationStatus.PENDING &&
        verification.status !== VerificationStatus.IN_PROGRESS
      ) {
        throw new InvalidVerificationStateException(
          verificationId,
          verification.status,
          'pending or in_progress',
        );
      }

      try {
        // Try to cancel with provider
        const { provider } = await this.getProviderForTenant(tenantId);
        const cancelled = await provider.cancelVerification(verification.providerVerificationId);

        if (cancelled) {
          // Update database
          await this.tenantRepository.query(
            `UPDATE verifications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [VerificationStatus.CANCELLED, verification.id],
          );

          this.logger.log(`Verification ${verificationId} cancelled successfully`);
          return true;
        }

        return false;
      } catch (error) {
        this.logger.error(`Failed to cancel verification: ${error.message}`, error.stack);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Cancel verification failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get verified users (accounts) for a tenant
   */
  async getVerifiedUsers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: Array<{
      id: string;
      name?: { first?: string; last?: string };
      birthdate?: Date;
      referenceId?: string;
      verificationCount: number;
      lastVerified?: Date;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    try {
      // Get verified users with verification counts
      const usersQuery = `
        SELECT 
          a.id, a.name, a.birthdate, a.reference_id, a.created_at,
          COUNT(v.id) as verification_count,
          MAX(v.created_at) as last_verified
        FROM accounts a
        LEFT JOIN verifications v ON a.id = v.account_id 
          AND v.status = 'completed'
        WHERE a.tenant_id = $1
        GROUP BY a.id, a.name, a.birthdate, a.reference_id, a.created_at
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const users = await this.tenantRepository.query(usersQuery, [tenantId, limit, offset]);

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM accounts a
        WHERE a.tenant_id = $1
      `;
      const [countResult] = await this.tenantRepository.query(countQuery, [tenantId]);
      const total = parseInt(countResult.total);

      return {
        users: users.map((user: any) => ({
          id: user.id,
          name: user.name,
          birthdate: user.birthdate,
          referenceId: user.reference_id,
          verificationCount: parseInt(user.verification_count) || 0,
          lastVerified: user.last_verified,
          createdAt: user.created_at,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get verified users: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods
  /**
   * Upload provided base64 images to imgbb if configured.
   * Returns a map of present image keys to hosted URLs.
   */
  private async uploadDocumentImagesToImgbb(
    images: { front?: string; back?: string; selfie?: string },
    tenantId: string,
  ): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    try {
      if (!this.imgbbService.isEnabled()) {
        return urls;
      }
      // Load tenant to read virtual album prefix if available
      const tenant = await this.validateTenant(tenantId);
      const prefix = (tenant.settings as any)?.imgbbPrefix || `tenant_${tenantId}`;

      const entries: Array<[keyof typeof images, string | undefined]> = [
        ['front', images.front],
        ['back', images.back],
        ['selfie', images.selfie],
      ];

      await Promise.all(
        entries
          .filter(([, b64]) => Boolean(b64))
          .map(async ([key, b64]) => {
            const uploaded = await this.imgbbService.uploadBase64(b64 as string, {
              name: `${prefix}_${key}`,
            });
            if (uploaded?.url) {
              urls[`${key}Url`] = uploaded.url;
            }
          }),
      );

      return urls;
    } catch (err) {
      this.logger.warn(`Skipping imgbb upload: ${err?.message || err}`);
      return urls;
    }
  }

  private async validateTenant(tenantId: string): Promise<Tenant> {
    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }

      if (!tenant.isActive()) {
        throw new TenantNotActiveException(tenantId);
      }

      return tenant;
    } catch (error) {
      this.logger.error(`Tenant validation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async validateAccount(accountId: string, tenantId: string): Promise<Account> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId, tenantId },
      });

      if (!account) {
        throw new AccountNotFoundInTenantException(accountId, tenantId);
      }

      return account;
    } catch (error) {
      this.logger.error(`Account validation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getProviderForTenant(
    tenantId: string,
  ): Promise<{ provider: IKycProvider; config: any; providerConfig: any }> {
    // Get provider configuration for this tenant
    const configs = await this.tenantRepository.query(
      `SELECT 
         tpc.id as config_id, 
         tpc.tenant_id, 
         tpc.config,
         tpc.priority,
         p.id as provider_id,
         p.name as provider_name,
         p.type as provider_type
       FROM tenant_provider_configs tpc
       JOIN providers p ON tpc.provider_id = p.id
       WHERE tpc.tenant_id = $1 AND tpc.is_enabled = true
       ORDER BY tpc.priority ASC, tpc.created_at DESC 
       LIMIT 1`,
      [tenantId],
    );

    if (configs.length === 0) {
      throw new ProviderNotConfiguredException(tenantId);
    }

    const providerConfig = configs[0];
    const provider = this.providersFactory.getProvider(providerConfig.provider_name);

    return {
      provider,
      config: providerConfig.config,
      providerConfig,
    };
  }

  private buildProviderRequest(
    request: CreateVerificationRequest,
    config: any,
  ): VerificationRequest {
    // Build the provider-specific request based on processing method
    const processingMethod = config.processingMethod || ProcessingMethod.DIRECT;

    const baseRequest = {
      tenantId: request.tenantId,
      accountId: request.accountId,
      verificationType: request.verificationType,
      callbackUrl: request.callbackUrl,
      metadata: {
        ...request.metadata,
        tenantConfig: config,
      },
    };

    if (processingMethod === ProcessingMethod.DIRECT) {
      // Direct processing (Regula-style)
      return {
        ...baseRequest,
        documentImages: request.documentImages,
      } as any;
    } else {
      // External link processing (Persona-style)
      return {
        ...baseRequest,
        redirectUrl: request.callbackUrl,
      } as any;
    }
  }

  private async storeVerification(
    request: CreateVerificationRequest,
    providerName: string,
    providerResponse: VerificationResponse,
    providerConfig: any,
  ): Promise<VerificationResult> {
    // Calculate expiration time
    const expiresInSeconds = request.metadata?.expiresIn || 3600; // Default 1 hour
    const expiresAt = providerResponse.expiresAt || new Date(Date.now() + expiresInSeconds * 1000);

    const verificationData = {
      tenantId: request.tenantId,
      accountId: request.accountId,
      providerName,
      providerVerificationId: providerResponse.providerVerificationId,
      status: providerResponse.status,
      verificationType: request.verificationType,
      processingMethod: providerResponse.processingMethod,
      verificationLink: providerResponse.verificationLink,
      expiresAt,
      result: providerResponse.result,
      metadata: request.metadata,
    };

    // Store in database using existing table structure
    const result = await this.tenantRepository.query(
      `INSERT INTO verifications (
        id, tenant_id, account_id, provider_id, provider_config_id,
        provider_verification_id, verification_type, status, expires_at,
        result, response_metadata, request_metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, created_at, updated_at`,
      [
        verificationData.tenantId,
        verificationData.accountId,
        providerConfig.provider_id, // provider_id from the joined query
        providerConfig.config_id, // provider_config_id from the joined query
        verificationData.providerVerificationId,
        verificationData.verificationType,
        verificationData.status,
        verificationData.expiresAt,
        verificationData.result,
        providerResponse,
        request.metadata || {},
      ],
    );

    const verification: VerificationResult = {
      id: result[0].id,
      ...verificationData,
      createdAt: result[0].created_at,
      updatedAt: result[0].updated_at,
    };

    // Auto-create user account from successful verification
    if (
      verification.status === VerificationStatus.COMPLETED &&
      verification.result &&
      !verification.accountId
    ) {
      const createdAccount = await this.createUserFromVerification(
        verification,
        verification.result,
      );

      if (createdAccount) {
        verification.accountId = createdAccount.id;
        this.logger.log(
          `Auto-created user account ${createdAccount.id} from verification ${verification.id}`,
        );
      }
    }

    return verification;
  }

  private async getVerificationFromDatabase(
    verificationId: string,
    tenantId: string,
  ): Promise<VerificationResult | null> {
    const results = await this.tenantRepository.query(
      `SELECT 
        v.id, v.tenant_id, v.account_id, v.provider_id, v.provider_config_id,
        v.provider_verification_id, v.verification_type, v.status, 
        v.result, v.response_metadata, v.request_metadata,
        v.created_at, v.updated_at,
        p.name as provider_name
      FROM verifications v
      LEFT JOIN providers p ON v.provider_id = p.id
      WHERE v.id = $1 AND v.tenant_id = $2
      LIMIT 1`,
      [verificationId, tenantId],
    );

    if (results.length === 0) {
      return null;
    }

    return this.mapDatabaseToResult(results[0]);
  }

  private async updateVerificationStatus(
    verificationId: string,
    providerResponse: VerificationResponse,
  ): Promise<void> {
    await this.tenantRepository.query(
      `UPDATE verifications 
       SET status = $1, result_data = $2, confidence_score = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        providerResponse.status,
        providerResponse.result,
        providerResponse.result?.overall?.confidence || 0,
        verificationId,
      ],
    );
  }

  private mapDatabaseToResult(dbRecord: any): VerificationResult {
    return {
      id: dbRecord.id,
      tenantId: dbRecord.tenant_id,
      accountId: dbRecord.account_id,
      providerName: dbRecord.provider_name,
      providerVerificationId: dbRecord.provider_verification_id,
      status: dbRecord.status,
      verificationType: dbRecord.verification_type,
      processingMethod: ProcessingMethod.DIRECT, // Default, should be stored in DB
      result: dbRecord.result,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  /**
   * Create or update user account from successful verification
   */
  private async createUserFromVerification(
    verification: VerificationResult,
    extractedData: any,
  ): Promise<Account | null> {
    try {
      // Only create accounts from successful verifications
      if (verification.status !== VerificationStatus.COMPLETED || !extractedData) {
        return null;
      }

      const extracted = extractedData.document?.extracted;
      if (!extracted) {
        this.logger.warn(`No extracted data found in verification ${verification.id}`);
        return null;
      }

      // Check if account already exists for this tenant
      let account = null;
      if (verification.accountId) {
        account = await this.accountRepository.findOne({
          where: { id: verification.accountId, tenantId: verification.tenantId },
        });
      }

      // Create new account if none exists
      if (!account) {
        const accountData = {
          tenantId: verification.tenantId,
          name: {
            first: extracted.firstName,
            last: extracted.lastName,
          },
          birthdate: extracted.dateOfBirth ? new Date(extracted.dateOfBirth) : undefined,
          // Use document number as reference ID for deduplication
          referenceId: `${extracted.nationality}_${extracted.documentNumber}`,
        };

        account = this.accountRepository.create(accountData);
        account = await this.accountRepository.save(account);

        this.logger.log(
          `Created new account ${account.id} for verified user: ${extracted.firstName} ${extracted.lastName}`,
        );

        // Update verification to link to the new account
        await this.tenantRepository.query(
          `UPDATE verifications SET account_id = $1 WHERE id = $2`,
          [account.id, verification.id],
        );
      } else {
        // Update existing account with latest verification data
        account.name = {
          first: extracted.firstName,
          last: extracted.lastName,
        };
        account.birthdate = extracted.dateOfBirth
          ? new Date(extracted.dateOfBirth)
          : account.birthdate;
        account = await this.accountRepository.save(account);

        this.logger.log(`Updated existing account ${account.id} with latest verification data`);
      }

      return account;
    } catch (error) {
      this.logger.error(`Failed to create user from verification: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Check if verification is expired and update status if needed
   */
  private async checkAndUpdateExpiration(
    verification: VerificationResult,
  ): Promise<VerificationResult> {
    // Only check expiration for pending or in-progress verifications
    if (
      verification.status !== VerificationStatus.PENDING &&
      verification.status !== VerificationStatus.IN_PROGRESS
    ) {
      return verification;
    }

    // Check if verification has expired
    if (verification.expiresAt && new Date() > verification.expiresAt) {
      // Update status to expired in database
      await this.tenantRepository.query(
        `UPDATE verifications 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [VerificationStatus.EXPIRED, verification.id],
      );

      // Update the local object
      verification.status = VerificationStatus.EXPIRED;
      verification.updatedAt = new Date();

      this.logger.log(`Verification ${verification.id} automatically expired`);
    }

    return verification;
  }
}
