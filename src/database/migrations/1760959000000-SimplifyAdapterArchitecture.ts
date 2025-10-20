import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyAdapterArchitecture1760959000000 implements MigrationInterface {
  name = 'SimplifyAdapterArchitecture1760959000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop unnecessary provider-specific tables (we're an adapter, not a provider)
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_verification_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_plans" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_templates" CASCADE`);

    // Step 2: Add essential columns to providers table for adapter functionality
    await queryRunner.query(`
      ALTER TABLE "providers" 
      ADD COLUMN IF NOT EXISTS "supports_webhooks" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "supports_hosted_workflow" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "webhook_secret" varchar(255),
      ADD COLUMN IF NOT EXISTS "api_version" varchar(20) DEFAULT 'v1',
      ADD COLUMN IF NOT EXISTS "base_url" varchar(500)
    `);

    // Step 3: Add essential columns to verifications table for adapter tracking
    await queryRunner.query(`
      ALTER TABLE "verifications" 
      ADD COLUMN IF NOT EXISTS "external_verification_id" varchar(255),
      ADD COLUMN IF NOT EXISTS "external_workflow_url" text,
      ADD COLUMN IF NOT EXISTS "webhook_received_at" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "last_webhook_event" varchar(100),
      ADD COLUMN IF NOT EXISTS "provider_response" jsonb,
      ADD COLUMN IF NOT EXISTS "validated_user_data" jsonb
    `);

    // Step 4: Create webhook_logs table for debugging and audit
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "verification_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" varchar(20) DEFAULT 'pending',
        "retry_count" integer DEFAULT 0,
        "error_message" text,
        "processed_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_webhook_logs_verification" FOREIGN KEY ("verification_id") REFERENCES "verifications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_webhook_logs_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);

    // Step 5: Add indexes for performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_logs_verification" ON "webhook_logs"("verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_logs_provider" ON "webhook_logs"("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_logs_status" ON "webhook_logs"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_webhook_logs_created" ON "webhook_logs"("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_verifications_external_id" ON "verifications"("external_verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_providers_webhooks" ON "providers"("supports_webhooks")`,
    );

    // Step 6: Keep inquiry tables - they're for storing validated user data (our goal!)
    // These tables are essential for our adapter pattern:
    // - inquiry_templates: Store tenant-specific verification configurations
    // - inquiries: Store verification requests and validated user data
    // - inquiry_sessions: Track user sessions during verification process
    // - accounts: Store validated user information
    // - documents: Store uploaded documents and their validation results

    // Step 7: Add columns to inquiries table for better adapter integration
    await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD COLUMN IF NOT EXISTS "verification_id" uuid,
      ADD COLUMN IF NOT EXISTS "provider_verification_id" varchar(255),
      ADD COLUMN IF NOT EXISTS "verification_status" varchar(50),
      ADD COLUMN IF NOT EXISTS "validated_data" jsonb,
      ADD COLUMN IF NOT EXISTS "provider_response" jsonb,
      ADD COLUMN IF NOT EXISTS "webhook_events" jsonb DEFAULT '[]'::jsonb
    `);

    // Add foreign key for verification_id
    await queryRunner.query(`
      ALTER TABLE "inquiries" 
      ADD CONSTRAINT "FK_inquiries_verification" 
      FOREIGN KEY ("verification_id") REFERENCES "verifications"("id") ON DELETE SET NULL
    `);

    // Add indexes for inquiry-verification relationship
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_inquiries_verification" ON "inquiries"("verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_inquiries_provider_verification" ON "inquiries"("provider_verification_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inquiries_provider_verification"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inquiries_verification"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_providers_webhooks"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_verifications_external_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_webhook_logs_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_webhook_logs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_webhook_logs_provider"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_webhook_logs_verification"`);

    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "inquiries" DROP CONSTRAINT IF EXISTS "FK_inquiries_verification"`,
    );

    // Remove columns from inquiries table
    await queryRunner.query(`
      ALTER TABLE "inquiries" 
      DROP COLUMN IF EXISTS "webhook_events",
      DROP COLUMN IF EXISTS "provider_response",
      DROP COLUMN IF EXISTS "validated_data",
      DROP COLUMN IF EXISTS "verification_status",
      DROP COLUMN IF EXISTS "provider_verification_id",
      DROP COLUMN IF EXISTS "verification_id"
    `);

    // Drop webhook_logs table
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_logs"`);

    // Remove columns from verifications table
    await queryRunner.query(`
      ALTER TABLE "verifications" 
      DROP COLUMN IF EXISTS "validated_user_data",
      DROP COLUMN IF EXISTS "provider_response",
      DROP COLUMN IF EXISTS "last_webhook_event",
      DROP COLUMN IF EXISTS "webhook_received_at",
      DROP COLUMN IF EXISTS "external_workflow_url",
      DROP COLUMN IF EXISTS "external_verification_id"
    `);

    // Remove columns from providers table
    await queryRunner.query(`
      ALTER TABLE "providers" 
      DROP COLUMN IF EXISTS "base_url",
      DROP COLUMN IF EXISTS "api_version",
      DROP COLUMN IF EXISTS "webhook_secret",
      DROP COLUMN IF EXISTS "supports_hosted_workflow",
      DROP COLUMN IF EXISTS "supports_webhooks"
    `);

    // Note: We don't recreate provider_templates, provider_plans, provider_verification_sessions
    // because they're not needed for the adapter pattern
  }
}
