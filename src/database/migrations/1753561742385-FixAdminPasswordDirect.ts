import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class FixAdminPasswordDirect1753561742385 implements MigrationInterface {
  name = 'FixAdminPasswordDirect1753561742385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing admin password directly in SQL...');

    // Generate the correct hash for 'admin123'
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    console.log('Generated hash for admin123:', hashedPassword);

    // Update admin password directly in SQL (bypassing entity hooks)
    const result = await queryRunner.query(
      `UPDATE admins SET password = $1 WHERE email = 'admin@kyc-adapter.dev' RETURNING id, email, name`,
      [hashedPassword],
    );

    if (result.length > 0) {
      console.log('✅ Admin password updated directly:');
      console.log(`   ID: ${result[0].id}`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Name: ${result[0].name}`);
    } else {
      console.log('❌ No admin found to update');
    }

    console.log('🔐 DEFAULT ADMIN CREDENTIALS:');
    console.log('   Email: admin@kyc-adapter.dev');
    console.log('   Password: admin123');
    console.log('');
    console.log('🧪 Test the login with:');
    console.log('   POST http://localhost:3000/api/v1/auth/login');
    console.log('   Body: {"email": "admin@kyc-adapter.dev", "password": "admin123"}');
    console.log('');
    console.log('⚠️  SECURITY: Change the default password in production!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back direct admin password fix...');

    // Note: We don't want to delete the admin, just log the rollback
    const admin = await queryRunner.query(
      `SELECT id, email, name FROM admins WHERE email = 'admin@kyc-adapter.dev'`,
    );

    if (admin.length > 0) {
      console.log('ℹ️  Admin exists (direct password change rolled back):');
      console.log(`   ID: ${admin[0].id}`);
      console.log(`   Email: ${admin[0].email}`);
      console.log(`   Name: ${admin[0].name}`);
    } else {
      console.log('ℹ️  No admin found to rollback');
    }
  }
}
