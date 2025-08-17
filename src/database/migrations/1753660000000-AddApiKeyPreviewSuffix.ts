import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyPreviewSuffix1753660000000 implements MigrationInterface {
  name = 'AddApiKeyPreviewSuffix1753660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_api_keys" ADD COLUMN IF NOT EXISTS "preview_suffix" character varying(8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_api_keys" DROP COLUMN IF EXISTS "preview_suffix"`);
  }
}
