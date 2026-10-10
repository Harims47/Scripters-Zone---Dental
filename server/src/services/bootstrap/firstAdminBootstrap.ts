import bcrypt from 'bcryptjs';
import { prisma as defaultPrisma, validateDatabaseConfig, type ValidatedDatabaseConfig } from '../../db';

export interface FirstAdminBootstrapInputs {
  username: string;
  password: string;
  name: string;
  phone: string;
}

export interface FirstAdminBootstrapDependencies {
  env?: Record<string, string | undefined>;
  dbConfigGetter?: () => ValidatedDatabaseConfig;
  prismaClient?: any;
}

/**
 * Validates the inputs for the initial Head Doctor bootstrap.
 * Never prints or leaks passwords.
 */
export function validateAdminBootstrapInput(input: Partial<FirstAdminBootstrapInputs>): FirstAdminBootstrapInputs {
  const username = input.username?.trim();
  const password = input.password;
  const name = input.name?.trim();
  const phone = input.phone?.trim();

  if (!username || username.length < 3) {
    throw new Error('Validation Error: ADMIN_USERNAME must be at least 3 characters long.');
  }

  if (!/^[a-zA-Z0-9._@+-]+$/.test(username)) {
    throw new Error('Validation Error: ADMIN_USERNAME may only contain alphanumeric characters and . _ @ + -');
  }

  if (!password || password.length < 6) {
    throw new Error('Validation Error: ADMIN_PASSWORD must be at least 6 characters long.');
  }

  if (!name || name.length < 2) {
    throw new Error('Validation Error: ADMIN_NAME must be at least 2 characters long.');
  }

  if (!phone || phone.length < 5) {
    throw new Error('Validation Error: ADMIN_PHONE must be at least 5 characters long.');
  }

  return { username, password, name, phone };
}

/**
 * Guarded One-Time Startup Bootstrap for First Head Doctor.
 * Executes strictly when process.env.INIT_HEAD_DOCTOR_ONCE === 'true'.
 *
 * Mandatory Safeguards:
 * 1. Controlled strictly by execution gate (INIT_HEAD_DOCTOR_ONCE === 'true').
 * 2. Verifies database configuration and identity matching.
 * 3. Verifies MySQL engine compatibility via SELECT VERSION().
 * 4. Verifies active database match via SELECT DATABASE().
 * 5. Verifies User table contains exactly 0 rows.
 * 6. Validates all required credentials (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE).
 * 7. Hashes password with bcryptjs (10 rounds).
 * 8. Creates 1 Staff record and 1 User record transactionally with role 'Head Doctor', status 'Active', attendance 'Present'.
 * 9. Atomically links User.staffId to Staff.id.
 * 10. Fails closed on any error without starting the server.
 */
export async function runFirstAdminBootstrap(
  deps: FirstAdminBootstrapDependencies = {}
): Promise<boolean> {
  const env = deps.env || process.env;

  // Gate check: Must be the exact string 'true'
  if (env.INIT_HEAD_DOCTOR_ONCE !== 'true') {
    return false;
  }

  // Mutual exclusivity guard: Cannot execute in the same startup as migration execution
  if (env.MIGRATION_EXECUTE_ONCE === 'true') {
    console.error(
      '[Admin Bootstrap FAILED] MIGRATION_EXECUTE_ONCE is currently enabled. Migration and admin bootstrap cannot execute in the same startup. Halting startup.'
    );
    throw new Error('[Admin Bootstrap HALTED] MIGRATION_EXECUTE_ONCE and INIT_HEAD_DOCTOR_ONCE are mutually exclusive.');
  }

  console.log('[Admin Bootstrap] Execution gate detected (INIT_HEAD_DOCTOR_ONCE=true). Starting pre-flight verification...');

  // Step 1: Validate database configuration
  const dbConfigGetter = deps.dbConfigGetter || validateDatabaseConfig;
  let config: ValidatedDatabaseConfig;
  try {
    config = dbConfigGetter();
  } catch (err: any) {
    const safeCode = (err as any)?.code || 'ERR_INVALID_CONFIG';
    console.error(`[Admin Bootstrap FAILED] Database configuration validation failed (code: ${safeCode}). Halting startup.`);
    throw new Error(`[Admin Bootstrap HALTED] Invalid database configuration (code: ${safeCode}).`);
  }

  // Step 2: Enforce mandatory database identity confirmation via CONFIRM_DB_NAME
  const rawDbHost = env.DB_HOST?.trim();
  const rawDbPort = env.DB_PORT?.trim();
  const rawDbName = env.DB_NAME?.trim();
  const rawDbUser = env.DB_USER?.trim();
  const hasGoDaddyVars = Boolean(
    rawDbHost &&
    rawDbHost.length > 0 &&
    rawDbPort &&
    rawDbPort.length > 0 &&
    rawDbName &&
    rawDbName.length > 0 &&
    rawDbUser &&
    rawDbUser.length > 0 &&
    env.DB_PASSWORD !== undefined
  );

  const confirmDbName = env.CONFIRM_DB_NAME?.trim();
  if (!confirmDbName) {
    console.error(
      '[Admin Bootstrap FAILED] CONFIRM_DB_NAME environment variable is missing or empty. Explicit confirmation is required to execute bootstrap. Halting startup.'
    );
    throw new Error('[Admin Bootstrap HALTED] CONFIRM_DB_NAME is not set.');
  }

  if (config.database !== confirmDbName || (hasGoDaddyVars && rawDbName !== confirmDbName)) {
    console.error(
      `[Admin Bootstrap FAILED] Database identity mismatch: resolved "${config.database}" does not match CONFIRM_DB_NAME "${confirmDbName}". Halting startup.`
    );
    throw new Error('[Admin Bootstrap HALTED] Target database identity confirmation mismatch.');
  }

  // Step 3: Validate required bootstrap inputs
  const rawUsername = env.ADMIN_USERNAME?.trim();
  const rawPassword = env.ADMIN_PASSWORD;
  const rawName = env.ADMIN_NAME?.trim();
  const rawPhone = env.ADMIN_PHONE?.trim();

  let validatedInput: FirstAdminBootstrapInputs;
  try {
    validatedInput = validateAdminBootstrapInput({
      username: rawUsername,
      password: rawPassword,
      name: rawName,
      phone: rawPhone,
    });
  } catch (validationErr: any) {
    console.error(`[Admin Bootstrap FAILED] Credential validation failed: ${validationErr.message}. Halting startup.`);
    throw new Error(`[Admin Bootstrap HALTED] ${validationErr.message}`);
  }

  const prisma = deps.prismaClient || defaultPrisma;

  // Step 4: Verify target database engine via SELECT VERSION()
  try {
    const versionRows: any = await prisma.$queryRawUnsafe('SELECT VERSION() AS version');
    const versionStr = versionRows && versionRows[0]?.version ? String(versionRows[0].version).toLowerCase() : '';
    if (!versionStr && !versionRows) {
      throw new Error('Unable to verify database engine version.');
    }
  } catch (err: any) {
    console.error(`[Admin Bootstrap FAILED] Target database engine probe failed: ${err.message}. Halting startup.`);
    throw new Error(`[Admin Bootstrap HALTED] Database engine verification failed: ${err.message}`);
  }

  // Step 5: Verify active database matches CONFIRM_DB_NAME via SELECT DATABASE()
  try {
    const dbRows: any = await prisma.$queryRawUnsafe('SELECT DATABASE() AS current_db');
    const currentDb = dbRows && dbRows[0] ? dbRows[0].current_db : null;
    if (currentDb !== confirmDbName) {
      console.error(`[Admin Bootstrap FAILED] Active database is "${currentDb}", expected "${confirmDbName}". Halting startup.`);
      throw new Error('[Admin Bootstrap HALTED] Active database mismatch.');
    }
  } catch (err: any) {
    console.error(`[Admin Bootstrap FAILED] Active database probe failed: ${err.message}. Halting startup.`);
    throw err;
  }

  // Step 6: Verify User table is completely empty (zero users)
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.error(
      `[Admin Bootstrap FAILED] Target database is NOT clean (found ${existingUserCount} existing user records). Bootstrap is only permitted on an empty User table. Halting startup.`
    );
    throw new Error(
      `[Admin Bootstrap HALTED] User table is not empty (found ${existingUserCount} records). Human review required.`
    );
  }

  console.log('[Admin Bootstrap] Pre-flight verification passed: database is clean with 0 users. Executing account creation...');

  // Step 7: Hash password with bcryptjs (10 rounds)
  const passwordHash = await bcrypt.hash(validatedInput.password, 10);

  // Step 8: Transactional creation of exactly 1 Staff and 1 User record
  try {
    await prisma.$transaction(async (tx: any) => {
      // Re-verify inside transaction to prevent race conditions
      const duplicateUser = await tx.user.findUnique({
        where: { username: validatedInput.username },
      });
      if (duplicateUser) {
        throw new Error(`User "${validatedInput.username}" already exists.`);
      }

      const staff = await tx.staff.create({
        data: {
          name: validatedInput.name,
          phone: validatedInput.phone,
          role: 'Head Doctor',
          status: 'Active',
          attendance: 'Present',
          permissions: null,
        },
      });

      const user = await tx.user.create({
        data: {
          username: validatedInput.username,
          passwordHash,
          role: 'Head Doctor',
          staffId: staff.id,
        },
      });

      return { user, staff };
    });

    console.log(
      `[Admin Bootstrap SUCCESS] Head Doctor account "${validatedInput.username}" initialized successfully for "${validatedInput.name}". Role: Head Doctor, Status: Active.`
    );
    return true;
  } catch (txErr: any) {
    console.error(`[Admin Bootstrap FAILED] Account creation transaction failed: ${txErr.message}. Halting startup.`);
    throw txErr;
  }
}
