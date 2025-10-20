import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOldAuthTables1760957000000 implements MigrationInterface {
  name = 'DropOldAuthTables1760957000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old authentication tables
    await queryRunner.dropTable('admin_api_keys', true);
    await queryRunner.dropTable('tenant_api_keys', true);
    await queryRunner.dropTable('admin_refresh_tokens', true);
    await queryRunner.dropTable('tenant_refresh_tokens', true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration cannot be easily reversed as we don't have the old table structures
    // In practice, you would need to restore from backup if rollback is needed
    throw new Error('This migration cannot be rolled back. Restore from backup if needed.');
  }
}
