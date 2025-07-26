import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1700000001000 implements MigrationInterface {
  name = 'CreateInitialSchema1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create clients table
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "api_key" character varying(64) NOT NULL,
        "api_key_hash" character varying(128) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "rate_limit_per_minute" integer NOT NULL DEFAULT 100,
        "rate_limit_per_hour" integer NOT NULL DEFAULT 1000,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_clients_api_key" UNIQUE ("api_key")
      )
    `);

    // Create provider_credentials table
    await queryRunner.query(`
      CREATE TABLE "provider_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_name" character varying(50) NOT NULL,
        "credential_type" character varying(50) NOT NULL,
        "encrypted_value" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_credentials" UNIQUE ("provider_name", "credential_type")
      )
    `);

    // Create client_provider_configs table
    await queryRunner.query(`
      CREATE TABLE "client_provider_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "provider_name" character varying(50) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT true,
        "config_json" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_provider_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_provider_configs" UNIQUE ("client_id", "provider_name"),
        CONSTRAINT "FK_client_provider_configs_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE
      )
    `);

    // Create verification_requests table
    await queryRunner.query(`
      CREATE TABLE "verification_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "request_type" character varying(50) NOT NULL,
        "provider_name" character varying(50) NOT NULL,
        "provider_request_id" character varying(255),
        "status" character varying(50) NOT NULL,
        "request_metadata" jsonb,
        "file_paths" text array,
        "client_ip_address" inet,
        "user_agent" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "processing_time_ms" integer,
        CONSTRAINT "PK_verification_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_verification_requests_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      )
    `);

    // Create verification_results table
    await queryRunner.query(`
      CREATE TABLE "verification_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" uuid NOT NULL,
        "provider_response" jsonb NOT NULL,
        "standardized_result" jsonb NOT NULL,
        "confidence_score" decimal(5,4),
        "is_verified" boolean,
        "failure_reasons" text array,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verification_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_verification_results_request" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE
      )
    `);

    // Create rate_limit_tracking table
    await queryRunner.query(`
      CREATE TABLE "rate_limit_tracking" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "window_type" character varying(20) NOT NULL,
        "request_count" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rate_limit_tracking" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rate_limit_tracking" UNIQUE ("client_id", "window_start", "window_type"),
        CONSTRAINT "FK_rate_limit_tracking_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE
      )
    `);

    // Create performance indexes
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_clients_api_key" ON "clients" ("api_key")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_api_key_active" ON "clients" ("api_key", "is_active") WHERE "is_active" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_active" ON "clients" ("is_active") WHERE "is_active" = true`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_clients_email" ON "clients" ("email")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_clients_last_used" ON "clients" ("last_used_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_client_provider_configs_client" ON "client_provider_configs" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_provider_configs_provider" ON "client_provider_configs" ("provider_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_provider_configs_primary" ON "client_provider_configs" ("client_id", "is_primary") WHERE "is_primary" = true`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_provider_credentials_provider" ON "provider_credentials" ("provider_name", "is_active") WHERE "is_active" = true`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_client" ON "verification_requests" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_status" ON "verification_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_created" ON "verification_requests" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_client_created" ON "verification_requests" ("client_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_provider" ON "verification_requests" ("provider_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_type" ON "verification_requests" ("request_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_requests_composite" ON "verification_requests" ("client_id", "status", "created_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_verification_results_request" ON "verification_results" ("request_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_results_verified" ON "verification_results" ("is_verified")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_results_confidence" ON "verification_results" ("confidence_score" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_rate_limit_client_window" ON "rate_limit_tracking" ("client_id", "window_type", "window_start" DESC)`,
    );

    // Create triggers for updated_at timestamps
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON "clients"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_provider_credentials_updated_at BEFORE UPDATE ON "provider_credentials"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_client_provider_configs_updated_at BEFORE UPDATE ON "client_provider_configs"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create cleanup function for rate limits
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
      RETURNS void AS $$
      BEGIN
          DELETE FROM rate_limit_tracking 
          WHERE window_start < NOW() - INTERVAL '24 hours';
      END;
      $$ language 'plpgsql'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_client_provider_configs_updated_at ON "client_provider_configs"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_provider_credentials_updated_at ON "provider_credentials"`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_clients_updated_at ON "clients"`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_old_rate_limits()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // Drop tables (in reverse order due to foreign keys)
    await queryRunner.query(`DROP TABLE "rate_limit_tracking"`);
    await queryRunner.query(`DROP TABLE "verification_results"`);
    await queryRunner.query(`DROP TABLE "verification_requests"`);
    await queryRunner.query(`DROP TABLE "client_provider_configs"`);
    await queryRunner.query(`DROP TABLE "provider_credentials"`);
    await queryRunner.query(`DROP TABLE "clients"`);

    // Drop extensions
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
