import bcrypt from 'bcryptjs';
import {
  runFirstAdminBootstrap,
  validateAdminBootstrapInput,
  type FirstAdminBootstrapInputs,
} from '../../src/services/bootstrap/firstAdminBootstrap';
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
  console.log('   FIRST HEAD DOCTOR BOOTSTRAP QA TEST SUITE                    ');
  console.log('================================================================\n');

  const targetDbName = 'db_j925dk468p';

  const validConfig: ValidatedDatabaseConfig = {
    host: 'db.godaddy.example.com',
    port: 3306,
    user: 'dbuser',
    password: 'dbpassword',
    database: targetDbName,
  };

  const baseValidEnv: Record<string, string> = {
    INIT_HEAD_DOCTOR_ONCE: 'true',
    DB_HOST: 'db.godaddy.example.com',
    DB_PORT: '3306',
    DB_NAME: targetDbName,
    DB_USER: 'dbuser',
    DB_PASSWORD: 'dbpassword',
    CONFIRM_DB_NAME: targetDbName,
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'Admin@123Password',
    ADMIN_NAME: 'DR N MOHAMED RAFI B D S',
    ADMIN_PHONE: '+91 98765 43210',
  };

  // Test 1: Disabled startup gate
  console.log('Test 1: Disabled startup gate (absent, false, or other than "true")');
  {
    const res1 = await runFirstAdminBootstrap({ env: {} });
    const res2 = await runFirstAdminBootstrap({ env: { INIT_HEAD_DOCTOR_ONCE: 'false' } });
    const res3 = await runFirstAdminBootstrap({ env: { INIT_HEAD_DOCTOR_ONCE: '1' } });
    assert(res1 === false && res2 === false && res3 === false, 'Bootstrap immediately returns false when gate is not "true"');
  }

  // Test 1B: Mutual exclusivity with MIGRATION_EXECUTE_ONCE
  console.log('\nTest 1B: Mutual exclusivity with MIGRATION_EXECUTE_ONCE');
  {
    let caught = false;
    try {
      await runFirstAdminBootstrap({
        env: {
          ...baseValidEnv,
          MIGRATION_EXECUTE_ONCE: 'true',
        },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('mutually exclusive'), 'Rejects execution when MIGRATION_EXECUTE_ONCE is also true');
    }
    assert(caught, 'Threw error on mutual exclusivity violation');
  }

  // Test 2: Database configuration validation failure
  console.log('\nTest 2: Database configuration validation failure');
  {
    let caught = false;
    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => {
          throw new Error('Config missing');
        },
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Invalid database configuration'), 'Fails closed on invalid DB config');
    }
    assert(caught, 'Threw error on invalid database configuration');
  }

  // Test 3A: Missing CONFIRM_DB_NAME
  console.log('\nTest 3A: Missing or empty CONFIRM_DB_NAME');
  {
    let caught = false;
    try {
      const { CONFIRM_DB_NAME, ...envWithoutConfirm } = baseValidEnv;
      await runFirstAdminBootstrap({
        env: envWithoutConfirm,
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('CONFIRM_DB_NAME is not set'), 'Rejects execution when CONFIRM_DB_NAME is absent');
    }
    assert(caught, 'Threw error on missing CONFIRM_DB_NAME');
  }

  // Test 3B: Database identity mismatch (CONFIRM_DB_NAME mismatch)
  console.log('\nTest 3B: Database identity mismatch (CONFIRM_DB_NAME mismatch)');
  {
    let caught = false;
    try {
      await runFirstAdminBootstrap({
        env: {
          ...baseValidEnv,
          CONFIRM_DB_NAME: 'Rafi_Dental_DB', // Mismatched confirmation
        },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Target database identity confirmation mismatch'), 'Rejects mismatched CONFIRM_DB_NAME');
    }
    assert(caught, 'Threw error on database identity mismatch');
  }

  // Test 4: Missing or invalid credentials
  console.log('\nTest 4: Missing or invalid bootstrap credentials');
  {
    let caughtMissingUser = false;
    try {
      await runFirstAdminBootstrap({
        env: { ...baseValidEnv, ADMIN_USERNAME: '' },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caughtMissingUser = true;
      assert(err.message.includes('ADMIN_USERNAME must be at least 3 characters'), 'Rejects empty ADMIN_USERNAME');
    }
    assert(caughtMissingUser, 'Threw error on missing ADMIN_USERNAME');

    let caughtShortPass = false;
    try {
      await runFirstAdminBootstrap({
        env: { ...baseValidEnv, ADMIN_PASSWORD: '123' },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caughtShortPass = true;
      assert(err.message.includes('ADMIN_PASSWORD must be at least 6 characters'), 'Rejects short ADMIN_PASSWORD');
    }
    assert(caughtShortPass, 'Threw error on short ADMIN_PASSWORD');

    let caughtMissingName = false;
    try {
      await runFirstAdminBootstrap({
        env: { ...baseValidEnv, ADMIN_NAME: ' ' },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caughtMissingName = true;
      assert(err.message.includes('ADMIN_NAME must be at least 2 characters'), 'Rejects missing ADMIN_NAME');
    }
    assert(caughtMissingName, 'Threw error on missing ADMIN_NAME');

    let caughtMissingPhone = false;
    try {
      await runFirstAdminBootstrap({
        env: { ...baseValidEnv, ADMIN_PHONE: '12' },
        dbConfigGetter: () => validConfig,
      });
    } catch (err: any) {
      caughtMissingPhone = true;
      assert(err.message.includes('ADMIN_PHONE must be at least 5 characters'), 'Rejects short ADMIN_PHONE');
    }
    assert(caughtMissingPhone, 'Threw error on short ADMIN_PHONE');
  }

  // Test 5: Target database engine check failure
  console.log('\nTest 5: Target database engine probe failure');
  {
    let caught = false;
    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) throw new Error('Engine probe failed');
        return [];
      },
    };

    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => validConfig,
        prismaClient: mockPrisma,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Database engine verification failed'), 'Fails closed when engine probe fails');
    }
    assert(caught, 'Threw error on engine probe failure');
  }

  // Test 6: Active database mismatch (SELECT DATABASE() vs expected DB)
  console.log('\nTest 6: Active database mismatch (SELECT DATABASE() vs expected DB)');
  {
    let caught = false;
    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) return [{ version: '8.0.35-mysql' }];
        if (sql.includes('SELECT DATABASE()')) return [{ current_db: 'other_database' }];
        return [];
      },
    };

    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => validConfig,
        prismaClient: mockPrisma,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Active database mismatch'), 'Rejects active database mismatch');
    }
    assert(caught, 'Threw error on active database mismatch');
  }

  // Test 7: Non-empty User table (records > 0)
  console.log('\nTest 7: Non-empty User table safeguard (records > 0)');
  {
    let caught = false;
    let transactionInvoked = false;
    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) return [{ version: '8.0.35-mysql' }];
        if (sql.includes('SELECT DATABASE()')) return [{ current_db: targetDbName }];
        return [];
      },
      user: {
        count: async () => 2, // Non-empty table!
      },
      $transaction: async () => {
        transactionInvoked = true;
      },
    };

    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => validConfig,
        prismaClient: mockPrisma,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('User table is not empty (found 2 records)'), 'Aborts when User table contains records');
    }
    assert(caught, 'Threw error on non-empty User table');
    assert(!transactionInvoked, 'Did NOT start transaction on non-empty table');
  }

  // Test 8: Duplicate username inside transaction
  console.log('\nTest 8: Duplicate username conflict inside transaction');
  {
    let caught = false;
    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) return [{ version: '8.0.35-mysql' }];
        if (sql.includes('SELECT DATABASE()')) return [{ current_db: targetDbName }];
        return [];
      },
      user: {
        count: async () => 0,
      },
      $transaction: async (fn: any) => {
        const tx = {
          user: {
            findUnique: async () => ({ id: 'u-1', username: 'admin' }),
          },
        };
        return fn(tx);
      },
    };

    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => validConfig,
        prismaClient: mockPrisma,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('User "admin" already exists'), 'Rejects duplicate username inside transaction');
    }
    assert(caught, 'Threw error on duplicate username');
  }

  // Test 9: Transaction rollback on failure
  console.log('\nTest 9: Transaction rollback on failure');
  {
    let caught = false;
    let staffCreated = false;
    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) return [{ version: '8.0.35-mysql' }];
        if (sql.includes('SELECT DATABASE()')) return [{ current_db: targetDbName }];
        return [];
      },
      user: {
        count: async () => 0,
      },
      $transaction: async (fn: any) => {
        const tx = {
          user: {
            findUnique: async () => null,
            create: async () => {
              throw new Error('Disk write error during User creation');
            },
          },
          staff: {
            create: async () => {
              staffCreated = true;
              return { id: 's-123' };
            },
          },
        };
        return fn(tx);
      },
    };

    try {
      await runFirstAdminBootstrap({
        env: baseValidEnv,
        dbConfigGetter: () => validConfig,
        prismaClient: mockPrisma,
      });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('Disk write error during User creation'), 'Propagates transaction failure');
    }
    assert(caught, 'Threw error on transaction step failure');
    assert(staffCreated, 'Staff was staged but will be rolled back by Prisma transaction');
  }

  // Test 10: Successful creation with all invariants
  console.log('\nTest 10: Successful Head Doctor account creation with verified invariants');
  {
    let createdStaffData: any = null;
    let createdUserData: any = null;

    const mockPrisma = {
      $queryRawUnsafe: async (sql: string) => {
        if (sql.includes('VERSION()')) return [{ version: '8.0.35-mysql' }];
        if (sql.includes('SELECT DATABASE()')) return [{ current_db: targetDbName }];
        return [];
      },
      user: {
        count: async () => 0,
      },
      $transaction: async (fn: any) => {
        const tx = {
          user: {
            findUnique: async () => null,
            create: async (args: any) => {
              createdUserData = args.data;
              return { id: 'user-uuid-1', ...args.data };
            },
          },
          staff: {
            create: async (args: any) => {
              createdStaffData = args.data;
              return { id: 'staff-uuid-1', ...args.data };
            },
          },
        };
        return fn(tx);
      },
    };

    const res = await runFirstAdminBootstrap({
      env: baseValidEnv,
      dbConfigGetter: () => validConfig,
      prismaClient: mockPrisma,
    });

    assert(res === true, 'Bootstrap returns true on success');

    // Invariant: Staff record
    assert(createdStaffData.name === 'DR N MOHAMED RAFI B D S', 'Staff name matches ADMIN_NAME');
    assert(createdStaffData.phone === '+91 98765 43210', 'Staff phone matches ADMIN_PHONE');
    assert(createdStaffData.role === 'Head Doctor', 'Staff role is strictly "Head Doctor"');
    assert(createdStaffData.status === 'Active', 'Staff status is strictly "Active"');
    assert(createdStaffData.attendance === 'Present', 'Staff attendance is strictly "Present"');
    assert(createdStaffData.permissions === null, 'Staff permissions are null (inherits full default modules)');

    // Invariant: User record
    assert(createdUserData.username === 'admin', 'User username matches ADMIN_USERNAME');
    assert(createdUserData.role === 'Head Doctor', 'User role is strictly "Head Doctor"');
    assert(createdUserData.staffId === 'staff-uuid-1', 'User.staffId is correctly linked to Staff.id');

    // Invariant: Bcrypt hashing
    assert(createdUserData.passwordHash !== baseValidEnv.ADMIN_PASSWORD, 'Password is never stored in plain text');
    const isPasswordValid = await bcrypt.compare(baseValidEnv.ADMIN_PASSWORD, createdUserData.passwordHash);
    assert(isPasswordValid, 'Password hash successfully verifies against original ADMIN_PASSWORD');
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
  console.error('Test runner failed unexpectedly:', err);
  process.exit(1);
});
