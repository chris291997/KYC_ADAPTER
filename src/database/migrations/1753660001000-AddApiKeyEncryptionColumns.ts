import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyEncryptionColumns1753660001000 implements MigrationInterface {
  name = 'AddApiKeyEncryptionColumns1753660001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_api_keys" ADD COLUMN IF NOT EXISTS "key_encrypted" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_api_keys" ADD COLUMN IF NOT EXISTS "key_iv" character varying(24)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_api_keys" DROP COLUMN IF EXISTS "key_iv"`);
    await queryRunner.query(`ALTER TABLE "tenant_api_keys" DROP COLUMN IF EXISTS "key_encrypted"`);
  }
}
