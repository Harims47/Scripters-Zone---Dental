import bcrypt from 'bcryptjs';
import {
  validateAdminInput,
  createFirstHeadDoctor,
  type HeadDoctorInitInput,
} from '../init_first_head_doctor';

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
  console.log('   QA TEST SUITE: FIRST HEAD DOCTOR INITIALIZATION SAFETY       ');
  console.log('================================================================\n');

  const validPayload: HeadDoctorInitInput = {
    username: 'dr_arun',
    password: 'superSecretPassword123',
    name: 'Dr. Arun',
    phone: '+91 98765 43210',
  };

  // Test 1: Input Validation
  console.log('Test 1: Input validation rules');
  {
    let caughtEmptyUser = false;
    try {
      validateAdminInput({ ...validPayload, username: ' ' });
    } catch (err: any) {
      caughtEmptyUser = true;
      assert(err.message.includes('username must be at least 3 characters'), 'Rejects empty username');
    }
    assert(caughtEmptyUser, 'Threw error on empty username');

    let caughtInvalidChars = false;
    try {
      validateAdminInput({ ...validPayload, username: 'dr arun with spaces' });
    } catch (err: any) {
      caughtInvalidChars = true;
      assert(err.message.includes('username may only contain alphanumeric'), 'Rejects username with spaces');
    }
    assert(caughtInvalidChars, 'Threw error on invalid username chars');

    let caughtShortPass = false;
    try {
      validateAdminInput({ ...validPayload, password: '123' });
    } catch (err: any) {
      caughtShortPass = true;
      assert(err.message.includes('password must be at least 6 characters'), 'Rejects short password');
    }
    assert(caughtShortPass, 'Threw error on short password');

    let caughtShortName = false;
    try {
      validateAdminInput({ ...validPayload, name: ' ' });
    } catch (err: any) {
      caughtShortName = true;
      assert(err.message.includes('staff name must be at least 2 characters'), 'Rejects empty staff name');
    }
    assert(caughtShortName, 'Threw error on empty staff name');

    let caughtShortPhone = false;
    try {
      validateAdminInput({ ...validPayload, phone: '12' });
    } catch (err: any) {
      caughtShortPhone = true;
      assert(err.message.includes('phone number must be at least 5 characters'), 'Rejects short phone');
    }
    assert(caughtShortPhone, 'Threw error on short phone');
  }

  // Test 2: Database engine failure safeguard
  console.log('\nTest 2: Target database engine check failure safeguard');
  {
    let caught = false;
    const mockPrisma = {
      $queryRawUnsafe: async () => {
        throw new Error('Connection refused');
      },
      user: {
        count: async () => 0,
      },
    };

    try {
      await createFirstHeadDoctor(validPayload, { prismaClient: mockPrisma });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('[Database Check Failed]'), 'Fails safely when engine query fails');
    }
    assert(caught, 'Threw error on database engine failure');
  }

  // Test 3: Existing users safeguard (User table count > 0)
  console.log('\nTest 3: Existing users safeguard (User table count > 0)');
  {
    let caught = false;
    let transactionInvoked = false;
    const mockPrisma = {
      $queryRawUnsafe: async () => [{ version: '8.0.35-mysql' }],
      user: {
        count: async () => 1, // Already has 1 user!
      },
      $transaction: async () => {
        transactionInvoked = true;
      },
    };

    try {
      await createFirstHeadDoctor(validPayload, { prismaClient: mockPrisma });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('[Safety Abort] The User table already contains 1 record(s)'), 'Aborts when users already exist');
    }
    assert(caught, 'Threw error when User table is non-empty');
    assert(!transactionInvoked, 'Did NOT open transaction or write records when users exist');
  }

  // Test 4: Existing username conflict inside transaction
  console.log('\nTest 4: Existing username conflict inside transaction');
  {
    let caught = false;
    const mockPrisma = {
      $queryRawUnsafe: async () => [{ version: '8.0.35-mysql' }],
      user: {
        count: async () => 0,
      },
      $transaction: async (fn: any) => {
        const tx = {
          user: {
            findUnique: async () => ({ id: 'existing-id', username: validPayload.username }),
          },
        };
        return fn(tx);
      },
    };

    try {
      await createFirstHeadDoctor(validPayload, { prismaClient: mockPrisma });
    } catch (err: any) {
      caught = true;
      assert(err.message.includes('[Conflict] User "dr_arun" already exists'), 'Aborts on username conflict');
    }
    assert(caught, 'Threw error on duplicate username');
  }

  // Test 5: Successful Head Doctor creation with all invariants
  console.log('\nTest 5: Successful Head Doctor creation with verified invariants');
  {
    let createdStaffData: any = null;
    let createdUserData: any = null;

    const mockPrisma = {
      $queryRawUnsafe: async () => [{ version: '8.0.35-mysql' }],
      user: {
        count: async () => 0,
      },
      $transaction: async (fn: any) => {
        const tx = {
          user: {
            findUnique: async () => null,
            create: async (args: any) => {
              createdUserData = args.data;
              return { id: 'u-uuid-1', ...args.data };
            },
          },
          staff: {
            create: async (args: any) => {
              createdStaffData = args.data;
              return { id: 's-uuid-1', ...args.data };
            },
          },
        };
        return fn(tx);
      },
    };

    const res = await createFirstHeadDoctor(validPayload, { prismaClient: mockPrisma });

    assert(res.success === true, 'Returns success: true');
    assert(res.username === validPayload.username, 'Returns correct username');
    assert(res.staffId === 's-uuid-1', 'Returns created staffId');
    assert(res.userId === 'u-uuid-1', 'Returns created userId');

    // Invariant: Staff fields
    assert(createdStaffData.name === validPayload.name, 'Staff name matches input');
    assert(createdStaffData.phone === validPayload.phone, 'Staff phone matches input');
    assert(createdStaffData.role === 'Head Doctor', 'Staff role is strictly "Head Doctor"');
    assert(createdStaffData.status === 'Active', 'Staff status is "Active"');
    assert(createdStaffData.attendance === 'Present', 'Staff attendance is "Present"');

    // Invariant: User fields
    assert(createdUserData.username === validPayload.username, 'User username matches input');
    assert(createdUserData.role === 'Head Doctor', 'User role is strictly "Head Doctor"');
    assert(createdUserData.staffId === 's-uuid-1', 'User.staffId is correctly linked to Staff.id');

    // Invariant: Password hashed with bcryptjs 10 rounds
    assert(createdUserData.passwordHash !== validPayload.password, 'Password is never stored in plain text');
    const isPasswordValid = await bcrypt.compare(validPayload.password, createdUserData.passwordHash);
    assert(isPasswordValid, 'Bcrypt hash correctly verifies against original password');
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
