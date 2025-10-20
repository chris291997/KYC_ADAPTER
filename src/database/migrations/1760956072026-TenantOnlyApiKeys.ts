import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantOnlyApiKeys1760956072026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enforce tenant-only in api_keys and refresh_tokens
    await queryRunner.query(`
            ALTER TABLE "api_keys"
            DROP CONSTRAINT IF EXISTS "api_keys_owner_type_check",
            ADD CONSTRAINT "api_keys_owner_type_check" CHECK ("owner_type" = 'tenant')
        `);

    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            DROP CONSTRAINT IF EXISTS "refresh_tokens_owner_type_check",
            ADD CONSTRAINT "refresh_tokens_owner_type_check" CHECK ("owner_type" = 'tenant')
        `);

    // Remove any admin-owned records if present
    await queryRunner.query(`DELETE FROM "api_keys" WHERE "owner_type" = 'admin'`);
    await queryRunner.query(`DELETE FROM "refresh_tokens" WHERE "owner_type" = 'admin'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to allowing both admin and tenant
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            DROP CONSTRAINT IF EXISTS "refresh_tokens_owner_type_check",
            ADD CONSTRAINT "refresh_tokens_owner_type_check" CHECK ("owner_type" IN ('admin', 'tenant'))
        `);

    await queryRunner.query(`
            ALTER TABLE "api_keys"
            DROP CONSTRAINT IF EXISTS "api_keys_owner_type_check",
            ADD CONSTRAINT "api_keys_owner_type_check" CHECK ("owner_type" IN ('admin', 'tenant'))
        `);
  }
}
