import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class FixAdminPassword1753560264818 implements MigrationInterface {
  name = 'FixAdminPassword1753560264818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing admin password...');

    // Check if admin exists
    const existingAdmin = await queryRunner.query(
      `SELECT id, email, name, role, status FROM admins WHERE email = 'admin@kyc-adapter.dev'`,
    );

    if (existingAdmin.length === 0) {
      console.log('❌ Admin not found. Creating admin...');

      // Generate hashed password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      // Create admin
      const result = await queryRunner.query(
        `
        INSERT INTO admins (id, name, email, password, role, status, "createdAt", "updatedAt") 
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) 
        RETURNING id, email, name, role, status
        `,
        ['Development Admin', 'admin@kyc-adapter.dev', hashedPassword, 'super_admin', 'active'],
      );

      console.log('✅ Admin created successfully:');
      console.log(`   ID: ${result[0].id}`);
      console.log(`   Email: ${result[0].email}`);
      console.log(`   Name: ${result[0].name}`);
      console.log(`   Role: ${result[0].role}`);
      console.log(`   Status: ${result[0].status}`);
    } else {
      console.log('✅ Admin found. Updating password...');
      console.log(`   ID: ${existingAdmin[0].id}`);
      console.log(`   Email: ${existingAdmin[0].email}`);
      console.log(`   Name: ${existingAdmin[0].name}`);
      console.log(`   Role: ${existingAdmin[0].role}`);
      console.log(`   Status: ${existingAdmin[0].status}`);

      // Generate new hashed password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      // Update admin password
      await queryRunner.query(
        `UPDATE admins SET password = $1 WHERE email = 'admin@kyc-adapter.dev'`,
        [hashedPassword],
      );

      console.log('✅ Admin password updated');
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
    console.log('🔄 Rolling back admin password fix...');

    // Note: We don't want to delete the admin, just log the rollback
    const admin = await queryRunner.query(
      `SELECT id, email, name FROM admins WHERE email = 'admin@kyc-adapter.dev'`,
    );

    if (admin.length > 0) {
      console.log('ℹ️  Admin exists (password change rolled back):');
      console.log(`   ID: ${admin[0].id}`);
      console.log(`   Email: ${admin[0].email}`);
      console.log(`   Name: ${admin[0].name}`);
    } else {
      console.log('ℹ️  No admin found to rollback');
    }
  }
}
