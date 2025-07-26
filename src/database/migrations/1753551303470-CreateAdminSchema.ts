import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash, randomBytes } from 'crypto';

export class CreateAdminSchema1753551303470 implements MigrationInterface {
  name = 'CreateAdminSchema1753551303470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admins table
    await queryRunner.query(`
        CREATE TABLE "admins" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "name" varchar(255) NOT NULL,
          "email" varchar(255) NOT NULL,
          "role" varchar(50) NOT NULL DEFAULT 'admin',
          "status" varchar(50) NOT NULL DEFAULT 'active',
          "settings" jsonb NOT NULL DEFAULT '{}',
          "last_login_at" timestamp with time zone,
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT "PK_admins_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_admins_email" UNIQUE ("email"),
          CONSTRAINT "CHK_admin_role" CHECK ("role" IN ('super_admin', 'admin', 'viewer')),
          CONSTRAINT "CHK_admin_status" CHECK ("status" IN ('active', 'inactive', 'suspended'))
        )
      `);

    // Create admin_api_keys table
    await queryRunner.query(`
        CREATE TABLE "admin_api_keys" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "admin_id" uuid NOT NULL,
          "name" varchar(255) NOT NULL,
          "key_hash" varchar(64) NOT NULL,
          "status" varchar(50) NOT NULL DEFAULT 'active',
          "expires_at" timestamp with time zone,
          "last_used_at" timestamp with time zone,
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT "PK_admin_api_keys_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_admin_api_keys_key_hash" UNIQUE ("key_hash"),
          CONSTRAINT "FK_admin_api_keys_admin_id" FOREIGN KEY ("admin_id") 
            REFERENCES "admins"("id") ON DELETE CASCADE,
          CONSTRAINT "CHK_admin_api_key_status" CHECK ("status" IN ('active', 'inactive', 'expired', 'revoked'))
        )
      `);

    // Create indexes for admins table
    await queryRunner.query(`CREATE INDEX "IDX_admins_email" ON "admins" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_status" ON "admins" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_admins_role" ON "admins" ("role")`);

    // Create indexes for admin_api_keys table
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_api_keys_admin_id" ON "admin_api_keys" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_api_keys_key_hash" ON "admin_api_keys" ("key_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_api_keys_status" ON "admin_api_keys" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_api_keys_admin_id_status" ON "admin_api_keys" ("admin_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_api_keys_expires_at" ON "admin_api_keys" ("expires_at")`,
    );

    // Create updated_at triggers
    await queryRunner.query(`
        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

    await queryRunner.query(`
        CREATE TRIGGER set_timestamp_admins
          BEFORE UPDATE ON admins
          FOR EACH ROW
          EXECUTE PROCEDURE trigger_set_timestamp();
      `);

    await queryRunner.query(`
        CREATE TRIGGER set_timestamp_admin_api_keys
          BEFORE UPDATE ON admin_api_keys
          FOR EACH ROW
          EXECUTE PROCEDURE trigger_set_timestamp();
      `);

    // Create dev admin user
    console.log('Creating development admin user...');

    const adminId = await queryRunner.query(`
        INSERT INTO "admins" ("name", "email", "role", "status", "settings")
        VALUES ('Development Admin', 'admin@kyc-adapter.dev', 'super_admin', 'active', '{}')
        RETURNING "id"
      `);

    const devAdminId = adminId[0].id;

    // Generate admin API key
    const adminApiKey = 'kya_admin_' + randomBytes(24).toString('hex');
    const keyHash = createHash('sha256').update(adminApiKey).digest('hex');

    await queryRunner.query(
      `
        INSERT INTO "admin_api_keys" ("admin_id", "name", "key_hash", "status", "expires_at")
        VALUES ($1, 'Development Admin Key', $2, 'active', $3)
      `,
      [devAdminId, keyHash, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)],
    ); // 1 year from now

    console.log('✅ Created development admin user');
    console.log('🔑 DEV ADMIN API KEY:', adminApiKey);
    console.log('📧 DEV ADMIN EMAIL: admin@kyc-adapter.dev');
    console.log('🆔 DEV ADMIN ID:', devAdminId);
    console.log('');
    console.log('🧪 Test the admin authentication with:');
    console.log(
      `   curl -H "Authorization: Bearer ${adminApiKey}" http://localhost:3000/api/v1/tenants`,
    );
    console.log(
      `   curl -H "X-Admin-API-Key: ${adminApiKey}" http://localhost:3000/api/v1/tenants`,
    );
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_admin_api_keys ON admin_api_keys`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_admins ON admins`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_api_keys_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_api_keys_admin_id_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_api_keys_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_api_keys_key_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_api_keys_admin_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admins_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admins_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admins_email"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins"`);
  }
}
