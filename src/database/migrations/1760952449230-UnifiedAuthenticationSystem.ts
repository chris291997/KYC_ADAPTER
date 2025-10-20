import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifiedAuthenticationSystem1760952449230 implements MigrationInterface {
  name = 'UnifiedAuthenticationSystem1760952449230';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create unified api_keys table
    await queryRunner.query(`
            CREATE TABLE "api_keys" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_type" character varying(20) NOT NULL CHECK ("owner_type" IN ('admin', 'tenant')),
                "owner_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "key_hash" character varying(64) NOT NULL,
                "status" character varying(50) NOT NULL DEFAULT 'active',
                "preview_suffix" character varying(8),
                "key_encrypted" text,
                "key_iv" character varying(24),
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "last_used_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
            )
        `);

    // Step 2: Create unified refresh_tokens table
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_type" character varying(20) NOT NULL CHECK ("owner_type" IN ('admin', 'tenant')),
                "owner_id" uuid NOT NULL,
                "token" character varying(255) NOT NULL,
                "is_revoked" boolean NOT NULL DEFAULT false,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "user_agent" text,
                "ip_address" character varying(45),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
            )
        `);

    // Step 3: Create indexes for api_keys
    await queryRunner.query(
      `CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys" ("key_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_owner" ON "api_keys" ("owner_type", "owner_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_api_keys_status" ON "api_keys" ("status")`);

    // Step 4: Create indexes for refresh_tokens
    await queryRunner.query(
      `CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_owner" ON "refresh_tokens" ("owner_type", "owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_expires" ON "refresh_tokens" ("expires_at")`,
    );

    // Step 5: Migrate data from admin_api_keys to api_keys
    await queryRunner.query(`
            INSERT INTO "api_keys" (
                "id", "owner_type", "owner_id", "name", "key_hash", "status", 
                "expires_at", "last_used_at", "created_at", "updated_at"
            )
            SELECT 
                "id", 'admin' as "owner_type", "admin_id" as "owner_id", "name", "key_hash", "status",
                "expires_at", "last_used_at", "created_at", "updated_at"
            FROM "admin_api_keys"
        `);

    // Step 6: Migrate data from tenant_api_keys to api_keys
    await queryRunner.query(`
            INSERT INTO "api_keys" (
                "id", "owner_type", "owner_id", "name", "key_hash", "status",
                "preview_suffix", "key_encrypted", "key_iv",
                "expires_at", "last_used_at", "created_at", "updated_at"
            )
            SELECT 
                "id", 'tenant' as "owner_type", "tenant_id" as "owner_id", "name", "key_hash", "status",
                "preview_suffix", "key_encrypted", "key_iv",
                "expires_at", "last_used_at", "created_at", "updated_at"
            FROM "tenant_api_keys"
        `);

    // Step 7: Migrate data from admin_refresh_tokens to refresh_tokens
    await queryRunner.query(`
            INSERT INTO "refresh_tokens" (
                "id", "owner_type", "owner_id", "token", "is_revoked", "expires_at",
                "user_agent", "ip_address", "created_at"
            )
            SELECT 
                "id", 'admin' as "owner_type", "admin_id" as "owner_id", "token", "is_revoked", "expires_at",
                "user_agent", "ip_address", "created_at"
            FROM "admin_refresh_tokens"
        `);

    // Step 8: Migrate data from tenant_refresh_tokens to refresh_tokens
    await queryRunner.query(`
            INSERT INTO "refresh_tokens" (
                "id", "owner_type", "owner_id", "token", "is_revoked", "expires_at",
                "user_agent", "ip_address", "created_at"
            )
            SELECT 
                "id", 'tenant' as "owner_type", "tenant_id" as "owner_id", "token", "is_revoked", "expires_at",
                "user_agent", "ip_address", "created_at"
            FROM "tenant_refresh_tokens"
        `);

    // Step 9: Verify data migration
    const apiKeyCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "api_keys"`);
    const refreshTokenCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "refresh_tokens"`,
    );

    console.log(
      `Migrated ${apiKeyCount[0].count} API keys and ${refreshTokenCount[0].count} refresh tokens`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the new unified tables
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_expires"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_owner"`);
    await queryRunner.query(`DROP INDEX "refresh_tokens_token_key"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);

    await queryRunner.query(`DROP INDEX "idx_api_keys_status"`);
    await queryRunner.query(`DROP INDEX "idx_api_keys_owner"`);
    await queryRunner.query(`DROP INDEX "api_keys_key_hash_key"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);

    // Note: The original tables (admin_api_keys, tenant_api_keys, etc.)
    // will be recreated by their original migrations if we rollback
  }
}
