import fs from 'fs';
import path from 'path';
import {
  runOneTimeMigrationHook,
  APPROVED_MIGRATIONS,
  EXPECTED_CORE_TABLES,
  type MigrationHookDependencies,
  type MigrationDbConnection,
} from '../../src/services/migration/oneTimeMigrationHook';
import type { ValidatedDatabaseConfig } from '../../src/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('   ONE-TIME STARTUP MIGRATION HOOK LOCAL QA TEST SUITE          ');
  console.log('================================================================\n');

  const validConfig: ValidatedDatabaseConfig = {
    host: 'db.example.com',
    port: 3306,
    user: 'dbuser',
    password: 'dbpassword',
    database: 'Rafi_Dental_DB',
  };

  // Test 1: Flag disabled (absent, false, or other than 'true')
  console.log('Test 1: Migration flag disabled (should do nothing)');
  {
    const calledDb = false;
    const res1 = await runOneTimeMigrationHook({
      env: {},
    });
    const res2 = await runOneTimeMigrationHook({
      env: { MIGRATION_EXECUTE_ONCE: 'false' },
    });
    const res3 = await runOneTimeMigrationHook({
      env: { MIGRATION_EXECUTE_ONCE: '1' },
    });
    assert(res1 === false && res2 === false && res3 === false, 'Hook immediately no-ops when gate is not "true"');
  }

  // Test 2: Invalid database configuration
  console.log('\nTest 2: Invalid database configuration');
  {
    let caught = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => {
          throw new Error('Config missing');
        },
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Invalid database configuration'), 'Fails closed on invalid database configuration');
    }
    assert(caught, 'Threw error on invalid config');
  }

  // Test 3: Wrong database name in config or active DB
  console.log('\nTest 3: Wrong database name (not Rafi_Dental_DB)');
  {
    let caughtConfig = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => ({ ...validConfig, database: 'dentalcore_test' }),
      });
    } catch (err: any) {
      caughtConfig = true;
      assert(err.message.includes('Target database identity mismatch'), 'Rejects non-Rafi_Dental_DB database config');
    }
    assert(caughtConfig, 'Threw error on non-Rafi_Dental_DB config database');

    let caughtActiveDb = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'other_db' }];
            return [];
          },
          end: async () => {},
        }),
      });
    } catch (err: any) {
      caughtActiveDb = true;
      assert(err.message.includes('Active database mismatch'), 'Rejects mismatch between SELECT DATABASE() and Rafi_Dental_DB');
    }
    assert(caughtActiveDb, 'Threw error when active database is not Rafi_Dental_DB');
  }

  // Test 4: Existing tables detected
  console.log('\nTest 4: Non-empty database detected before migration');
  {
    let caught = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) return [{ table_name: 'User' }, { table_name: 'Patient' }];
            return [];
          },
          end: async () => {},
        }),
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Target database is not empty'), 'Aborts when existing tables are detected');
    }
    assert(caught, 'Threw error on non-empty database');
  }

  // Test 5: Missing migration files on disk
  console.log('\nTest 5: Missing approved migration files on disk');
  {
    let caught = false;
    const tempEmptyDir = path.resolve(__dirname, '../../data_migration_staging');
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        migrationsDir: tempEmptyDir,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Missing required migration file'), 'Fails closed when migration files are missing');
    }
    assert(caught, 'Threw error on missing migration files');
  }

  // Test 6: Migration command failure
  console.log('\nTest 6: Migration command failure (non-zero exit code)');
  {
    let caught = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) return [];
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({
          exitCode: 1,
          stdout: '',
          stderr: 'P3005: Database migration failed',
        }),
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Migration deployment failed with exit code 1'), 'Fails closed when migration runner exits non-zero');
    }
    assert(caught, 'Threw error on migration runner failure');
  }

  // Test 7: Migration command timeout
  console.log('\nTest 7: Migration command timeout (exceeded bounded duration)');
  {
    let caught = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) return [];
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({
          exitCode: 1,
          stdout: '',
          stderr: '',
          timedOut: true,
        }),
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Migration execution timed out'), 'Fails closed and reports timeout');
    }
    assert(caught, 'Threw error on migration command timeout');
  }

  // Test 8: Incomplete migration history in _prisma_migrations
  console.log('\nTest 8: Incomplete or rolled-back migration history');
  {
    let caughtMissing = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) return []; // Initially empty
            if (sql.includes('_prisma_migrations')) {
              return [
                {
                  migration_name: APPROVED_MIGRATIONS[0],
                  finished_at: new Date(),
                  rolled_back_at: null,
                },
                // Missing second migration
              ];
            }
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      });
    } catch (err: any) {
      caughtMissing = true;
      assert(err.message.includes('Migration history is incomplete') || err.message.includes('Missing migration record'), 'Fails when migration history is incomplete');
    }
    assert(caughtMissing, 'Threw error on incomplete migration history');

    let caughtRolledBack = false;
    try {
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) return [];
            if (sql.includes('_prisma_migrations')) {
              return [
                {
                  migration_name: APPROVED_MIGRATIONS[0],
                  finished_at: new Date(),
                  rolled_back_at: null,
                },
                {
                  migration_name: APPROVED_MIGRATIONS[1],
                  finished_at: new Date(),
                  rolled_back_at: new Date(), // Rolled back!
                },
              ];
            }
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      });
    } catch (err: any) {
      caughtRolledBack = true;
      assert(err.message.includes('not in clean applied state'), 'Fails when a migration was marked rolled-back');
    }
    assert(caughtRolledBack, 'Threw error on rolled-back migration');
  }

  // Test 9: Missing expected core tables after migration
  console.log('\nTest 9: Missing expected core application tables');
  {
    let caught = false;
    try {
      let isInitialCheck = true;
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) {
              if (isInitialCheck) {
                isInitialCheck = false;
                return []; // Clean empty before migration
              }
              // Return incomplete table list after migration
              return [{ table_name: 'User' }, { table_name: '_prisma_migrations' }];
            }
            if (sql.includes('_prisma_migrations')) {
              return APPROVED_MIGRATIONS.map((m) => ({
                migration_name: m,
                finished_at: new Date(),
                rolled_back_at: null,
              }));
            }
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Missing expected table:'), 'Fails when expected core table is missing');
    }
    assert(caught, 'Threw error on missing expected tables');
  }

  // Test 10: User table contains unexpected rows
  console.log('\nTest 10: User table contains unexpected rows (> 0)');
  {
    let caught = false;
    try {
      let isInitialCheck = true;
      await runOneTimeMigrationHook({
        env: { MIGRATION_EXECUTE_ONCE: 'true' },
        dbConfigGetter: () => validConfig,
        connectionFactory: async () => ({
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'Rafi_Dental_DB' }];
            if (sql.includes('information_schema.tables')) {
              if (isInitialCheck) {
                isInitialCheck = false;
                return []; // Clean empty before migration
              }
              return EXPECTED_CORE_TABLES.map((t) => ({ table_name: t }));
            }
            if (sql.includes('_prisma_migrations')) {
              return APPROVED_MIGRATIONS.map((m) => ({
                migration_name: m,
                finished_at: new Date(),
                rolled_back_at: null,
              }));
            }
            if (sql.includes('SELECT count(*) AS user_count FROM User')) {
              return [{ user_count: 3 }]; // Unexpected rows!
            }
            return [];
          },
          end: async () => {},
        }),
        migrationRunner: async () => ({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('User table has non-zero row count (3)'), 'Fails when User table contains unexpected rows');
    }
    assert(caught, 'Threw error on non-zero User table row count');
  }

  // Test 11: Successful verification using mocks
  console.log('\nTest 11: Successful end-to-end verification');
  {
    let closedConnection = false;
    const result = await runOneTimeMigrationHook({
      env: { MIGRATION_EXECUTE_ONCE: 'true' },
      dbConfigGetter: () => validConfig,
      connectionFactory: async () => {
        let isInitialCheck = true;
        return {
          query: async (sql: string) => {
            if (sql.includes('SELECT DATABASE()')) {
              return [{ current_db: 'Rafi_Dental_DB' }];
            }
            if (sql.includes('information_schema.tables')) {
              if (isInitialCheck) {
                isInitialCheck = false;
                return []; // Clean empty database before migration
              }
              return EXPECTED_CORE_TABLES.map((t) => ({ table_name: t })); // All tables present after migration
            }
            if (sql.includes('_prisma_migrations')) {
              return APPROVED_MIGRATIONS.map((m) => ({
                migration_name: m,
                finished_at: new Date(),
                rolled_back_at: null,
              }));
            }
            if (sql.includes('SELECT count(*) AS user_count FROM User')) {
              return [{ user_count: 0 }];
            }
            return [];
          },
          end: async () => {
            closedConnection = true;
          },
        };
      },
      migrationRunner: async () => ({
        exitCode: 0,
        stdout: 'Applying migration 20261007143247_init_mysql\nApplying migration 20261007143820_add_mysql_text_annotations\nAll migrations have been successfully applied.',
        stderr: '',
      }),
    });

    assert(result === true, 'Migration hook returns true on complete success');
    assert(closedConnection, 'Database connection is safely closed on completion');
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test suite runner failed unexpectedly:', err);
  process.exit(1);
});
