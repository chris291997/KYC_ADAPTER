import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class FixTenantPassword1753559324652 implements MigrationInterface {
  name = 'FixTenantPassword1753559324652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate hashed password for default tenant password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('tenant123', salt);

    // Update tenants with null passwords to have the default password
    await queryRunner.query(
      `
        UPDATE tenants 
        SET password = $1 
        WHERE password IS NULL OR password = ''
      `,
      [hashedPassword],
    );

    // Log the update
    const result = await queryRunner.query(
      `
        SELECT COUNT(*) as updated_count 
        FROM tenants 
        WHERE password = $1
      `,
      [hashedPassword],
    );

    console.log(`✅ Updated ${result[0].updated_count} tenants with default password`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove passwords for tenants that were updated (set to null)
    // This is a destructive operation, so we'll be careful
    await queryRunner.query(
      `
        UPDATE tenants 
        SET password = NULL 
        WHERE email = 'test@kyc-adapter.dev'
      `,
    );

    console.log('⚠️  Reverted default password for test tenant');
  }
}
