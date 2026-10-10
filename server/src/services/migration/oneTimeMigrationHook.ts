import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import mariadb from 'mariadb';
import { validateDatabaseConfig, type ValidatedDatabaseConfig } from '../../db';

export const APPROVED_MIGRATIONS = [
  '20261007143247_init_mysql',
  '20261007143820_add_mysql_text_annotations',
] as const;

export const EXPECTED_CORE_TABLES = [
  'User',
  'Staff',
  'Patient',
  'Appointment',
  'Visit',
  'QueueEntry',
  'Consultation',
  'MedicineCategory',
  'Medicine',
  'Prescription',
  'PrescriptionItem',
  'Dispensing',
  'DispensingItem',
  'Payment',
  'TreatmentCatalog',
  'TreatmentPlan',
  'TreatmentPlanItem',
  'TreatmentSession',
  'Supplier',
  'SupplierMedicineCategory',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'SupplierBill',
  'SupplierPayment',
  'StockMovement',
  'Notification',
  'HistoricalMigrationBatch',
  'HistoricalMigrationRecord',
  'ReimbursementDocument',
  'DentalImage',
  'ExternalDoctorAdvice',
  '_prisma_migrations',
] as const;

export interface MigrationDbConnection {
  query: (sql: string, values?: any[]) => Promise<any>;
  end: () => Promise<void>;
}

export interface MigrationHookDependencies {
  env?: Record<string, string | undefined>;
  dbConfigGetter?: () => ValidatedDatabaseConfig;
  connectionFactory?: (config: ValidatedDatabaseConfig) => Promise<MigrationDbConnection>;
  migrationRunner?: (serverDir: string) => Promise<{ exitCode: number; stdout: string; stderr: string; timedOut?: boolean }>;
  migrationsDir?: string;
  serverDir?: string;
}

/**
 * Finds the server root directory containing prisma/schema.prisma
 * whether running in TypeScript development or compiled JavaScript production.
 */
export function findServerDirectory(fromDir = __dirname): string {
  const candidates = [
    path.resolve(process.cwd(), 'server'),
    process.cwd(),
    path.resolve(fromDir, '../../..'),
    path.resolve(fromDir, '../../../..'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma'))) {
      return candidate;
    }
  }
  return process.cwd();
}

/**
 * Executes prisma migrate deploy as a bounded child process.
 * Never prints or leaks credentials or complete connection URLs.
 */
function defaultPrismaMigrationRunner(
  serverDir: string,
  timeoutMs = 30000
): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut?: boolean }> {
  return new Promise((resolve) => {
    const prismaCliBin = path.resolve(serverDir, 'node_modules/prisma/build/index.js');
    let cmd = process.execPath;
    let args = [prismaCliBin, 'migrate', 'deploy'];

    if (!fs.existsSync(prismaCliBin)) {
      cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      args = ['prisma', 'migrate', 'deploy'];
    }

    execFile(
      cmd,
      args,
      {
        cwd: serverDir,
        timeout: timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error) {
          const isTimedOut =
            Boolean(error.killed) &&
            (error.signal === 'SIGTERM' || (error as any).code === 'ETIMEDOUT');
          return resolve({
            exitCode: typeof (error as any).code === 'number' ? (error as any).code : 1,
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : '',
            timedOut: isTimedOut,
          });
        }
        return resolve({
          exitCode: 0,
          stdout: stdout ? stdout.toString() : '',
          stderr: stderr ? stderr.toString() : '',
          timedOut: false,
        });
      }
    );
  });
}

/**
 * Guarded One-Time Startup Migration Hook.
 * Executes only when process.env.MIGRATION_EXECUTE_ONCE === 'true'.
 * 
 * Safeguards:
 * 1. Target database must strictly equal 'Rafi_Dental_DB'.
 * 2. Database must be empty (0 existing tables) before executing migrations.
 * 3. Migration files must exist and match approved list.
 * 4. Prisma migrate deploy runs with bounded timeout.
 * 5. Verifies _prisma_migrations contains both migrations finished and unrolled.
 * 6. Verifies all expected core tables exist.
 * 7. Verifies User table exists and contains zero rows.
 * 8. Fails closed on any error without automatic rollback, reset, drop, or retry.
 */
export async function runOneTimeMigrationHook(deps: MigrationHookDependencies = {}): Promise<boolean> {
  const env = deps.env || process.env;

  // Gate check: Must be the exact string 'true'
  if (env.MIGRATION_EXECUTE_ONCE !== 'true') {
    return false;
  }

  console.log('[Migration Hook] Execution gate detected (MIGRATION_EXECUTE_ONCE=true). Starting pre-flight verification...');

  const dbConfigGetter = deps.dbConfigGetter || validateDatabaseConfig;
  let config: ValidatedDatabaseConfig;
  try {
    config = dbConfigGetter();
  } catch (err: any) {
    const safeCode = (err as any)?.code || 'ERR_INVALID_CONFIG';
    console.error(`[Migration Hook FAILED] Database configuration validation failed (code: ${safeCode}). Halting startup.`);
    throw new Error(`[Migration Hook HALTED] Invalid database configuration (code: ${safeCode}).`);
  }

  // Mandatory Safeguard 1: Verify exact database identity
  if (config.database !== 'Rafi_Dental_DB') {
    console.error(`[Migration Hook FAILED] Target database is "${config.database}", but only "Rafi_Dental_DB" is permitted. Halting startup.`);
    throw new Error('[Migration Hook HALTED] Target database identity mismatch.');
  }

  const serverDir = deps.serverDir || findServerDirectory();
  const migrationsDir = deps.migrationsDir || path.resolve(serverDir, 'prisma', 'migrations');

  // Mandatory Safeguard 6: Confirm approved migration files exist on disk
  for (const migrationName of APPROVED_MIGRATIONS) {
    const migrationFile = path.join(migrationsDir, migrationName, 'migration.sql');
    if (!fs.existsSync(migrationFile)) {
      console.error(`[Migration Hook FAILED] Required migration file not found on disk for "${migrationName}". Halting startup.`);
      throw new Error(`[Migration Hook HALTED] Missing required migration file: ${migrationName}.`);
    }
  }

  const connectionFactory =
    deps.connectionFactory ||
    (async (cfg: ValidatedDatabaseConfig): Promise<MigrationDbConnection> => {
      const conn = await mariadb.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl,
        connectTimeout: 10000,
      });
      return conn;
    });

  let connection: MigrationDbConnection | null = null;
  try {
    connection = await connectionFactory(config);

    // Mandatory Safeguard 3: Verify active database via SELECT DATABASE()
    const dbRows: any = await connection.query('SELECT DATABASE() AS current_db');
    const currentDb = dbRows && dbRows[0] ? dbRows[0].current_db : null;
    if (currentDb !== 'Rafi_Dental_DB') {
      console.error(`[Migration Hook FAILED] Active database is "${currentDb}", expected "Rafi_Dental_DB". Halting startup.`);
      throw new Error('[Migration Hook HALTED] Active database mismatch.');
    }

    // Mandatory Safeguards 4 & 5: Confirm zero existing tables
    const tableRows: any = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
    const existingTableCount = Array.isArray(tableRows) ? tableRows.length : 0;
    if (existingTableCount > 0) {
      console.error(
        `[Migration Hook FAILED] Target database is NOT empty (found ${existingTableCount} existing tables). Halting startup.`
      );
      throw new Error(
        `[Migration Hook HALTED] Target database is not empty (found ${existingTableCount} tables). Human review required.`
      );
    }

    console.log('[Migration Hook] Pre-flight verification passed: database is clean "Rafi_Dental_DB". Executing migration deployment...');

    // Mandatory Safeguards 7, 8, 9: Execute migration deploy under bounded timeout
    const migrationRunner = deps.migrationRunner || defaultPrismaMigrationRunner;
    const migrationResult = await migrationRunner(serverDir);

    if (migrationResult.timedOut) {
      console.error('[Migration Hook FAILED] Migration command exceeded bounded timeout (30s) and was terminated. Halting startup.');
      throw new Error('[Migration Hook HALTED] Migration execution timed out.');
    }

    if (migrationResult.exitCode !== 0) {
      console.error(`[Migration Hook FAILED] Migration command exited with non-zero status (${migrationResult.exitCode}). Halting startup.`);
      throw new Error(`[Migration Hook HALTED] Migration deployment failed with exit code ${migrationResult.exitCode}.`);
    }

    console.log('[Migration Hook] Migration deployment command completed. Verifying post-migration schema integrity...');

    // Mandatory Safeguard 10: Verify _prisma_migrations contains both migrations applied cleanly
    const migrationHistory: any = await connection.query(
      'SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at ASC'
    );
    if (!Array.isArray(migrationHistory) || migrationHistory.length < APPROVED_MIGRATIONS.length) {
      console.error('[Migration Hook FAILED] Incomplete migration history in _prisma_migrations. Halting startup.');
      throw new Error('[Migration Hook HALTED] Migration history is incomplete.');
    }

    for (const approved of APPROVED_MIGRATIONS) {
      const record = migrationHistory.find((m: any) => m.migration_name === approved);
      if (!record) {
        console.error(`[Migration Hook FAILED] Approved migration "${approved}" not recorded in _prisma_migrations. Halting startup.`);
        throw new Error(`[Migration Hook HALTED] Missing migration record for ${approved}.`);
      }
      if (!record.finished_at || record.rolled_back_at) {
        console.error(`[Migration Hook FAILED] Migration "${approved}" is not finished or was marked rolled back. Halting startup.`);
        throw new Error(`[Migration Hook HALTED] Migration ${approved} is not in clean applied state.`);
      }
    }

    // Mandatory Safeguard 11: Verify expected core tables exist
    const postTableRows: any = await connection.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
    const postTables = new Set(
      Array.isArray(postTableRows)
        ? postTableRows.map((r: any) => String(r.table_name || r.TABLE_NAME))
        : []
    );

    for (const expectedTable of EXPECTED_CORE_TABLES) {
      if (!postTables.has(expectedTable)) {
        console.error(`[Migration Hook FAILED] Expected table "${expectedTable}" was not found after migration. Halting startup.`);
        throw new Error(`[Migration Hook HALTED] Missing expected table: ${expectedTable}.`);
      }
    }

    // Mandatory Safeguards 11 & 10: Verify User table exists and contains zero rows
    const userCountRows: any = await connection.query('SELECT count(*) AS user_count FROM User');
    const userCount =
      Array.isArray(userCountRows) && userCountRows[0]
        ? Number(userCountRows[0].user_count ?? userCountRows[0].USER_COUNT ?? 0)
        : -1;

    if (userCount !== 0) {
      console.error(`[Migration Hook FAILED] User table contains ${userCount} rows (expected 0). Halting startup.`);
      throw new Error(`[Migration Hook HALTED] User table has non-zero row count (${userCount}).`);
    }

    console.log(
      '[Migration Hook SUCCESS] Rafi_Dental_DB schema successfully initialized and verified: 2 migrations applied, core tables present, 0 user rows.'
    );
    return true;
  } catch (err: any) {
    // Fail-closed: Never auto-retry, drop tables, or roll back
    console.error('[Migration Hook FAILED] Migration hook encountered an error. Server startup halted.');
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Silently handle close
      }
    }
  }
}
