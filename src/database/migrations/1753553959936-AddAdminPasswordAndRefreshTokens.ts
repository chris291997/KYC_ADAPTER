import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class AddAdminPasswordAndRefreshTokens1753553959936 implements MigrationInterface {
  name = 'AddAdminPasswordAndRefreshTokens1753553959936';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password column to admins table
    await queryRunner.query(`
        ALTER TABLE "admins" 
        ADD COLUMN "password" varchar(255)
      `);

    // Create admin_refresh_tokens table
    await queryRunner.query(`
        CREATE TABLE "admin_refresh_tokens" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "admin_id" uuid NOT NULL,
          "token" varchar(255) NOT NULL,
          "is_revoked" boolean NOT NULL DEFAULT false,
          "expires_at" timestamp with time zone NOT NULL,
          "user_agent" text,
          "ip_address" varchar(45),
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT "PK_admin_refresh_tokens_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_admin_refresh_tokens_token" UNIQUE ("token"),
          CONSTRAINT "FK_admin_refresh_tokens_admin_id" FOREIGN KEY ("admin_id") 
            REFERENCES "admins"("id") ON DELETE CASCADE
        )
      `);

    // Create indexes for admin_refresh_tokens table
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_refresh_tokens_admin_id" ON "admin_refresh_tokens" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_refresh_tokens_token" ON "admin_refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_refresh_tokens_expires_at" ON "admin_refresh_tokens" ("expires_at")`,
    );

    // Set default password for existing dev admin
    console.log('Setting default password for existing admin...');

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await queryRunner.query(
      `
        UPDATE "admins" 
        SET "password" = $1 
        WHERE "email" = 'admin@kyc-adapter.dev'
      `,
      [hashedPassword],
    );

    console.log('✅ Added password field to admins table');
    console.log('✅ Created admin_refresh_tokens table');
    console.log('🔐 DEFAULT ADMIN CREDENTIALS:');
    console.log('   Email: admin@kyc-adapter.dev');
    console.log('   Password: admin123');
    console.log('');
    console.log('🧪 Test the login with:');
    console.log('   POST http://localhost:3000/api/v1/auth/login');
    console.log('   Body: {"email": "admin@kyc-adapter.dev", "password": "admin123"}');
    console.log('');
    console.log('⚠️  SECURITY: Change the default password in production!');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop admin_refresh_tokens table
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_refresh_tokens"`);

    // Remove password column from admins table
    await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN IF EXISTS "password"`);
  }
}
