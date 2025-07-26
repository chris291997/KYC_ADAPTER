import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class AddTenantPasswordAndRefreshTokens1753557162473 implements MigrationInterface {
  name = 'AddTenantPasswordAndRefreshTokens1753557162473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add password column to tenants table (if it doesn't exist)
    await queryRunner.query(`
        ALTER TABLE "tenants" 
        ADD COLUMN IF NOT EXISTS "password" varchar(255)
      `);

    // Create tenant_refresh_tokens table
    await queryRunner.query(`
        CREATE TABLE "tenant_refresh_tokens" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "tenant_id" uuid NOT NULL,
          "token" varchar(255) NOT NULL,
          "is_revoked" boolean NOT NULL DEFAULT false,
          "expires_at" timestamp with time zone NOT NULL,
          "user_agent" text,
          "ip_address" varchar(45),
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT "PK_tenant_refresh_tokens_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_tenant_refresh_tokens_token" UNIQUE ("token"),
          CONSTRAINT "FK_tenant_refresh_tokens_tenant_id" FOREIGN KEY ("tenant_id") 
            REFERENCES "tenants"("id") ON DELETE CASCADE
        )
      `);

    // Create indexes for tenant_refresh_tokens table
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_refresh_tokens_tenant_id" ON "tenant_refresh_tokens" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_refresh_tokens_token" ON "tenant_refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_refresh_tokens_expires_at" ON "tenant_refresh_tokens" ("expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_refresh_tokens_tenant_id_is_revoked" ON "tenant_refresh_tokens" ("tenant_id", "is_revoked")`,
    );

    // Set default password for existing test tenant
    console.log('Setting default password for existing test tenant...');

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('tenant123', salt);

    await queryRunner.query(
      `
        UPDATE "tenants" 
        SET "password" = $1 
        WHERE "email" = 'test@kyc-adapter.dev' AND "password" IS NULL
      `,
      [hashedPassword],
    );

    console.log('✅ Added password field to tenants table');
    console.log('✅ Created tenant_refresh_tokens table');
    console.log('🔐 DEFAULT TENANT CREDENTIALS:');
    console.log('   Email: test@kyc-adapter.dev');
    console.log('   Password: tenant123');
    console.log('');
    console.log('🧪 Test the login with:');
    console.log('   POST http://localhost:3000/api/v1/tenant/auth/login');
    console.log('   Body: {"email": "test@kyc-adapter.dev", "password": "tenant123"}');
    console.log('');
    console.log('⚠️  SECURITY: Change the default password in production!');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tenant_refresh_tokens table
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_refresh_tokens"`);

    // Remove password column from tenants table
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "password"`);
  }
}
