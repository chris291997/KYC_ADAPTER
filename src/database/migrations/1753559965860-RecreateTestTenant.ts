import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class RecreateTestTenant1753559965860 implements MigrationInterface {
  name = 'RecreateTestTenant1753559965860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting test tenant recreation...');

    // Check if test tenant exists
    const existingTenant = await queryRunner.query(
      `SELECT id, email, name, status FROM tenants WHERE email = 'test@kyc-adapter.dev'`,
    );

    if (existingTenant.length > 0) {
      console.log('🗑️  Found existing test tenant, deleting...');
      console.log(`   ID: ${existingTenant[0].id}`);
      console.log(`   Email: ${existingTenant[0].email}`);
      console.log(`   Name: ${existingTenant[0].name}`);
      console.log(`   Status: ${existingTenant[0].status}`);

      // Delete existing test tenant (this will cascade to related records)
      await queryRunner.query(`DELETE FROM tenants WHERE email = 'test@kyc-adapter.dev'`);
      console.log('✅ Existing test tenant deleted');
    } else {
      console.log('ℹ️  No existing test tenant found');
    }

    // Generate hashed password for new tenant
    console.log('🔐 Generating password hash...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('tenant123', salt);

    // Create new test tenant
    console.log('➕ Creating new test tenant...');
    const result = await queryRunner.query(
      `
      INSERT INTO tenants (id, name, email, status, password, settings, "createdAt", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) 
      RETURNING id, email, name, status
      `,
      ['Test Tenant', 'test@kyc-adapter.dev', 'active', hashedPassword, '{}'],
    );

    console.log('✅ New test tenant created successfully:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Name: ${result[0].name}`);
    console.log(`   Status: ${result[0].status}`);
    console.log('🔐 Password: tenant123');
    console.log('');
    console.log('🧪 Test the login with:');
    console.log('   POST http://localhost:3000/api/v1/tenant/auth/login');
    console.log('   Body: {"email": "test@kyc-adapter.dev", "password": "tenant123"}');
    console.log('');
    console.log('⚠️  SECURITY: Change the default password in production!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back test tenant recreation...');

    // Delete the test tenant we created
    const deletedTenant = await queryRunner.query(
      `DELETE FROM tenants WHERE email = 'test@kyc-adapter.dev' RETURNING id, email, name`,
    );

    if (deletedTenant.length > 0) {
      console.log('✅ Test tenant deleted during rollback:');
      console.log(`   ID: ${deletedTenant[0].id}`);
      console.log(`   Email: ${deletedTenant[0].email}`);
      console.log(`   Name: ${deletedTenant[0].name}`);
    } else {
      console.log('ℹ️  No test tenant found to delete during rollback');
    }
  }
}
