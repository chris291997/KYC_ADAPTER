import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddEventDrivenArchitecture1753700000000 implements MigrationInterface {
  name = 'AddEventDrivenArchitecture1753700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create provider_templates table
    await queryRunner.createTable(
      new Table({
        name: 'provider_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'external_template_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'steps',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'step_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'::jsonb",
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add indexes for provider_templates
    await queryRunner.createIndex(
      'provider_templates',
      new TableIndex({
        name: 'IDX_provider_templates_provider_id',
        columnNames: ['provider_id'],
      }),
    );

    await queryRunner.createIndex(
      'provider_templates',
      new TableIndex({
        name: 'IDX_provider_templates_external_template_id',
        columnNames: ['external_template_id'],
      }),
    );

    await queryRunner.createIndex(
      'provider_templates',
      new TableIndex({
        name: 'IDX_provider_templates_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'provider_templates',
      new TableIndex({
        name: 'IDX_provider_templates_category',
        columnNames: ['category'],
      }),
    );

    // Add foreign key for provider_templates
    await queryRunner.createForeignKey(
      'provider_templates',
      new TableForeignKey({
        columnNames: ['provider_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'providers',
        onDelete: 'CASCADE',
        name: 'FK_provider_templates_provider',
      }),
    );

    // 2. Create provider_plans table
    await queryRunner.createTable(
      new Table({
        name: 'provider_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'plan_code',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'plan_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'pricing',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'features',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'processing_time_seconds',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'::jsonb",
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add indexes for provider_plans
    await queryRunner.createIndex(
      'provider_plans',
      new TableIndex({
        name: 'IDX_provider_plans_provider_id',
        columnNames: ['provider_id'],
      }),
    );

    await queryRunner.createIndex(
      'provider_plans',
      new TableIndex({
        name: 'IDX_provider_plans_plan_code',
        columnNames: ['plan_code'],
      }),
    );

    await queryRunner.createIndex(
      'provider_plans',
      new TableIndex({
        name: 'IDX_provider_plans_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'provider_plans',
      new TableIndex({
        name: 'IDX_provider_plans_category',
        columnNames: ['category'],
      }),
    );

    // Add foreign key for provider_plans
    await queryRunner.createForeignKey(
      'provider_plans',
      new TableForeignKey({
        columnNames: ['provider_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'providers',
        onDelete: 'CASCADE',
        name: 'FK_provider_plans_provider',
      }),
    );

    // 3. Create provider_verification_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'provider_verification_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'verification_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'provider_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'provider_session_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'current_step',
            type: 'integer',
            default: 0,
          },
          {
            name: 'total_steps',
            type: 'integer',
            default: 0,
          },
          {
            name: 'progress_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'last_progress_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'processing_steps',
            type: 'jsonb',
            default: "'[]'::jsonb",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'::jsonb",
          },
          {
            name: 'error_details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'failed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add indexes for provider_verification_sessions
    await queryRunner.createIndex(
      'provider_verification_sessions',
      new TableIndex({
        name: 'IDX_pvs_verification_id',
        columnNames: ['verification_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'provider_verification_sessions',
      new TableIndex({
        name: 'IDX_pvs_provider_id',
        columnNames: ['provider_id'],
      }),
    );

    await queryRunner.createIndex(
      'provider_verification_sessions',
      new TableIndex({
        name: 'IDX_pvs_provider_session_id',
        columnNames: ['provider_session_id'],
      }),
    );

    await queryRunner.createIndex(
      'provider_verification_sessions',
      new TableIndex({
        name: 'IDX_pvs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'provider_verification_sessions',
      new TableIndex({
        name: 'IDX_pvs_started_at',
        columnNames: ['started_at'],
      }),
    );

    // Add foreign keys for provider_verification_sessions
    await queryRunner.createForeignKey(
      'provider_verification_sessions',
      new TableForeignKey({
        columnNames: ['verification_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'verifications',
        onDelete: 'CASCADE',
        name: 'FK_pvs_verification',
      }),
    );

    await queryRunner.createForeignKey(
      'provider_verification_sessions',
      new TableForeignKey({
        columnNames: ['provider_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'providers',
        onDelete: 'CASCADE',
        name: 'FK_pvs_provider',
      }),
    );

    await queryRunner.createForeignKey(
      'provider_verification_sessions',
      new TableForeignKey({
        columnNames: ['template_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'provider_templates',
        onDelete: 'SET NULL',
        name: 'FK_pvs_template',
      }),
    );

    // 4. Add new columns to verifications table
    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'template_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'processing_mode',
        type: 'varchar',
        length: '50',
        default: "'sync'",
      }),
    );

    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'is_multi_step',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'verification_method',
        type: 'varchar',
        length: '50',
        default: "'document'",
      }),
    );

    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'job_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'verifications',
      new TableColumn({
        name: 'webhook_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Add foreign key for template_id
    await queryRunner.createForeignKey(
      'verifications',
      new TableForeignKey({
        columnNames: ['template_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'provider_templates',
        onDelete: 'SET NULL',
        name: 'FK_verifications_template',
      }),
    );

    // Add indexes for new verification columns
    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'IDX_verifications_template_id',
        columnNames: ['template_id'],
      }),
    );

    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'IDX_verifications_processing_mode',
        columnNames: ['processing_mode'],
      }),
    );

    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'IDX_verifications_job_id',
        columnNames: ['job_id'],
      }),
    );

    // 5. Add new columns to providers table
    await queryRunner.addColumn(
      'providers',
      new TableColumn({
        name: 'supports_templates',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'providers',
      new TableColumn({
        name: 'supports_id_verification',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'providers',
      new TableColumn({
        name: 'supports_async',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'providers',
      new TableColumn({
        name: 'processing_mode',
        type: 'varchar',
        length: '50',
        default: "'single_step'",
      }),
    );

    // Add index for provider capabilities
    await queryRunner.createIndex(
      'providers',
      new TableIndex({
        name: 'IDX_providers_supports_templates',
        columnNames: ['supports_templates'],
      }),
    );

    await queryRunner.createIndex(
      'providers',
      new TableIndex({
        name: 'IDX_providers_processing_mode',
        columnNames: ['processing_mode'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes and foreign keys from verifications
    await queryRunner.dropIndex('verifications', 'IDX_verifications_processing_mode');
    await queryRunner.dropIndex('verifications', 'IDX_verifications_template_id');
    await queryRunner.dropIndex('verifications', 'IDX_verifications_job_id');
    await queryRunner.dropForeignKey('verifications', 'FK_verifications_template');

    // Drop new columns from verifications
    await queryRunner.dropColumn('verifications', 'webhook_url');
    await queryRunner.dropColumn('verifications', 'job_id');
    await queryRunner.dropColumn('verifications', 'verification_method');
    await queryRunner.dropColumn('verifications', 'is_multi_step');
    await queryRunner.dropColumn('verifications', 'processing_mode');
    await queryRunner.dropColumn('verifications', 'template_id');

    // Drop indexes from providers
    await queryRunner.dropIndex('providers', 'IDX_providers_processing_mode');
    await queryRunner.dropIndex('providers', 'IDX_providers_supports_templates');

    // Drop new columns from providers
    await queryRunner.dropColumn('providers', 'processing_mode');
    await queryRunner.dropColumn('providers', 'supports_async');
    await queryRunner.dropColumn('providers', 'supports_id_verification');
    await queryRunner.dropColumn('providers', 'supports_templates');

    // Drop provider_verification_sessions table
    await queryRunner.dropTable('provider_verification_sessions', true);

    // Drop provider_plans table
    await queryRunner.dropTable('provider_plans', true);

    // Drop provider_templates table
    await queryRunner.dropTable('provider_templates', true);
  }
}
