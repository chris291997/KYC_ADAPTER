import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { TestTenantSeeder } from './test-tenant.seed';

// Load environment variables
config();

async function runTestSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kyc_adapter',
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Connected to database');

    const seeder = new TestTenantSeeder();
    await seeder.run(dataSource);

    console.log('🎉 Test seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during test seeding:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runTestSeeds();
