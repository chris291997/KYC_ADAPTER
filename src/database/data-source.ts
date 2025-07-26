import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables for CLI usage
dotenv.config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: parseInt(configService.get('DB_PORT', '5432'), 10),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME', 'kyc_adapter'),
  ssl: configService.get('DB_SSL', 'false') === 'true',

  // Entity locations
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],

  // Migration settings
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',

  // CLI settings
  synchronize: false, // Never use synchronize in production
  logging: configService.get('DB_LOGGING', 'false') === 'true',
});
