import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalProviderSupport1760958000000 implements MigrationInterface {
  name = 'AddExternalProviderSupport1760958000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add missing columns to providers table (only the ones not created by AddEventDrivenArchitecture)
    await queryRunner.query(`
      ALTER TABLE "providers" 
      ADD COLUMN "webhook_secret" varchar(255),
      ADD COLUMN "api_version" varchar(20) DEFAULT 'v1'
    `);

    // Step 2: Add missing columns to verifications table (only the ones not created by AddEventDrivenArchitecture)
    await queryRunner.query(`
      ALTER TABLE "verifications" 
      ADD COLUMN "processing_steps" jsonb DEFAULT '[]',
      ADD COLUMN "session_id" varchar(255),
      ADD COLUMN "step_progress" integer DEFAULT 0,
      ADD COLUMN "total_steps" integer DEFAULT 1
    `);

    // Step 3: Create webhook_logs table for webhook tracking
    await queryRunner.query(`
      CREATE TABLE "webhook_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL,
        "verification_id" uuid,
        "event_type" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "signature" varchar(500),
        "status" varchar(50) NOT NULL DEFAULT 'received',
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "retry_count" integer DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_webhook_logs" PRIMARY KEY ("id")
      )
    `);

    // Step 4: Create indexes for webhook_logs table
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_provider" ON "webhook_logs" ("provider_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_verification" ON "webhook_logs" ("verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_event_type" ON "webhook_logs" ("event_type")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_webhook_logs_status" ON "webhook_logs" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_created" ON "webhook_logs" ("created_at")`,
    );

    // Step 5: Add foreign key constraints for webhook_logs
    await queryRunner.query(`
      ALTER TABLE "webhook_logs" 
      ADD CONSTRAINT "FK_webhook_logs_provider" 
      FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "webhook_logs" 
      ADD CONSTRAINT "FK_webhook_logs_verification" 
      FOREIGN KEY ("verification_id") REFERENCES "verifications"("id") ON DELETE SET NULL
    `);

    // Step 6: Add check constraints
    await queryRunner.query(`
      ALTER TABLE "webhook_logs" 
      ADD CONSTRAINT "CHK_webhook_status" 
      CHECK ("status" IN ('received', 'processed', 'failed', 'retrying'))
    `);

    // Step 7: Update existing providers to support basic features
    await queryRunner.query(`
      UPDATE "providers" 
      SET 
        "api_version" = 'v1'
      WHERE "type" = 'regula'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraints
    await queryRunner.query(`ALTER TABLE "webhook_logs" DROP CONSTRAINT "CHK_webhook_status"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "webhook_logs" DROP CONSTRAINT "FK_webhook_logs_verification"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_logs" DROP CONSTRAINT "FK_webhook_logs_provider"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "idx_webhook_logs_created"`);
    await queryRunner.query(`DROP INDEX "idx_webhook_logs_status"`);
    await queryRunner.query(`DROP INDEX "idx_webhook_logs_event_type"`);
    await queryRunner.query(`DROP INDEX "idx_webhook_logs_verification"`);
    await queryRunner.query(`DROP INDEX "idx_webhook_logs_provider"`);

    // Drop webhook_logs table
    await queryRunner.query(`DROP TABLE "webhook_logs"`);

    // Remove columns from verifications table
    await queryRunner.query(`
      ALTER TABLE "verifications" 
      DROP COLUMN "total_steps",
      DROP COLUMN "step_progress",
      DROP COLUMN "session_id",
      DROP COLUMN "processing_steps"
    `);

    // Remove columns from providers table
    await queryRunner.query(`
      ALTER TABLE "providers" 
      DROP COLUMN "api_version",
      DROP COLUMN "webhook_secret"
    `);
  }
}
