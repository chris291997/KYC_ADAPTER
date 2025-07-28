import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCleanSchema1753640000000 implements MigrationInterface {
  name = 'CreateCleanSchema1753640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ============================================================================
    // CORE TABLES
    // ============================================================================

    // Create admins table
    await queryRunner.query(`
      CREATE TABLE "admins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL UNIQUE,
        "password" character varying(255),
        "role" character varying(50) NOT NULL DEFAULT 'admin',
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_admins" PRIMARY KEY ("id")
      )
    `);

    // Create admin API keys table
    await queryRunner.query(`
      CREATE TABLE "admin_api_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "key_hash" character varying(64) NOT NULL UNIQUE,
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_admin_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_api_keys_admin" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE
      )
    `);

    // Create admin refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "admin_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_id" uuid NOT NULL,
        "token" character varying(255) NOT NULL UNIQUE,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "user_agent" text,
        "ip_address" character varying(45),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_admin_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admin_refresh_tokens_admin" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE
      )
    `);

    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "email" character varying(255) NOT NULL UNIQUE,
        "password" character varying(255),
        "settings" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    // Create tenant API keys table
    await queryRunner.query(`
      CREATE TABLE "tenant_api_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "key_hash" character varying(64) NOT NULL UNIQUE,
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_tenant_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Create tenant refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "tenant_refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "token" character varying(255) NOT NULL UNIQUE,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "user_agent" text,
        "ip_address" character varying(45),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_tenant_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_refresh_tokens_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // ============================================================================
    // KYC PROVIDER SYSTEM
    // ============================================================================

    // Create providers table
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL UNIQUE,
        "type" character varying(50) NOT NULL,
        "description" text,
        "credentials" jsonb,
        "default_config" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "api_url" character varying(500),
        "webhook_url" character varying(500),
        "max_daily_verifications" integer,
        "priority" integer NOT NULL DEFAULT 1,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_providers" PRIMARY KEY ("id")
      )
    `);

    // Create tenant provider configs table (replaces client_provider_configs)
    await queryRunner.query(`
      CREATE TABLE "tenant_provider_configs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "config" jsonb NOT NULL DEFAULT '{}',
        "priority" integer NOT NULL DEFAULT 1,
        "max_daily_verifications" integer,
        "webhook_url" character varying(500),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_tenant_provider_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_provider" UNIQUE ("tenant_id", "provider_id"),
        CONSTRAINT "FK_tenant_provider_configs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_provider_configs_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);

    // ============================================================================
    // ACCOUNTS AND VERIFICATIONS
    // ============================================================================

    // Create accounts table
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "reference_id" character varying(255),
        "name" jsonb,
        "email" character varying(255),
        "phone" character varying(50),
        "birthdate" date,
        "address" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Create verifications table
    await queryRunner.query(`
      CREATE TABLE "verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "account_id" uuid,
        "provider_id" uuid NOT NULL,
        "provider_config_id" uuid NOT NULL,
        "provider_verification_id" character varying(255) NOT NULL,
        "verification_type" character varying(50) NOT NULL,
        "status" character varying(50) NOT NULL,
        "verification_link" character varying(1000),
        "callback_url" character varying(500),
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "result" jsonb,
        "request_metadata" jsonb NOT NULL DEFAULT '{}',
        "response_metadata" jsonb NOT NULL DEFAULT '{}',
        "error_details" jsonb,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_verifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_verifications_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_verifications_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_verifications_provider_config" FOREIGN KEY ("provider_config_id") REFERENCES "tenant_provider_configs"("id") ON DELETE RESTRICT
      )
    `);

    // ============================================================================
    // ADDITIONAL TABLES (for completeness)
    // ============================================================================

    // Create inquiry templates table
    await queryRunner.query(`
      CREATE TABLE "inquiry_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "template_data" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_inquiry_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inquiry_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Create inquiries table
    await queryRunner.query(`
      CREATE TABLE "inquiries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "account_id" uuid,
        "template_id" uuid,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "inquiry_data" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_inquiries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inquiries_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inquiries_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_inquiries_template" FOREIGN KEY ("template_id") REFERENCES "inquiry_templates"("id") ON DELETE SET NULL
      )
    `);

    // Create documents table
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_id" uuid NOT NULL,
        "inquiry_id" uuid,
        "document_type" character varying(100) NOT NULL,
        "file_path" character varying(500),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_documents_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_documents_inquiry" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL
      )
    `);

    // Create webhooks table
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "url" character varying(500) NOT NULL,
        "events" text[] NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "secret" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_webhooks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhooks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // ============================================================================
    // CREATE INDEXES
    // ============================================================================

    // Admin indexes
    await queryRunner.query(`CREATE INDEX "IDX_admins_email" ON "admins" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_status" ON "admins" ("status")`);

    // Tenant indexes
    await queryRunner.query(`CREATE INDEX "IDX_tenants_email" ON "tenants" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`);

    // Provider indexes
    await queryRunner.query(`CREATE INDEX "IDX_providers_type" ON "providers" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_providers_active" ON "providers" ("is_active")`);

    // Account indexes
    await queryRunner.query(`CREATE INDEX "IDX_accounts_tenant" ON "accounts" ("tenant_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_tenant_reference" ON "accounts" ("tenant_id", "reference_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_accounts_tenant_email" ON "accounts" ("tenant_id", "email")`,
    );

    // Verification indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_tenant" ON "verifications" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_account" ON "verifications" ("account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_provider" ON "verifications" ("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_status" ON "verifications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_type" ON "verifications" ("verification_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_provider_id" ON "verifications" ("provider_verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verifications_created" ON "verifications" ("created_at")`,
    );

    // Tenant provider config indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_provider_configs_tenant" ON "tenant_provider_configs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_provider_configs_provider" ON "tenant_provider_configs" ("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_provider_configs_enabled" ON "tenant_provider_configs" ("is_enabled")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inquiries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inquiry_templates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_provider_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "providers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_api_keys" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_refresh_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_api_keys" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins" CASCADE`);
  }
}
