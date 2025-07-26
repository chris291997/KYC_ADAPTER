import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { InitialDataSeeder } from './initial-data.seed';

async function runSeeds() {
  try {
    console.log('🚀 Initializing database connection...');
    await AppDataSource.initialize();

    console.log('🌱 Running database seeders...');

    // Run initial data seeder
    const initialSeeder = new InitialDataSeeder(AppDataSource);
    await initialSeeder.run();

    console.log('🎉 All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed.');
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds };
