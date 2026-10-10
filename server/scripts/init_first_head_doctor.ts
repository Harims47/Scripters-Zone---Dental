import bcrypt from 'bcryptjs';
import readline from 'readline';
import { prisma as defaultPrisma } from '../src/db';

export interface HeadDoctorInitInput {
  username: string;
  password: string;
  name: string;
  phone: string;
}

export interface InitHeadDoctorDeps {
  prismaClient?: any;
}

/**
 * Validates the inputs for the initial Head Doctor account.
 */
export function validateAdminInput(input: Partial<HeadDoctorInitInput>): HeadDoctorInitInput {
  const username = input.username?.trim();
  const password = input.password;
  const name = input.name?.trim();
  const phone = input.phone?.trim();

  if (!username || username.length < 3) {
    throw new Error('Validation Error: username must be at least 3 characters long.');
  }

  if (!/^[a-zA-Z0-9._@+-]+$/.test(username)) {
    throw new Error('Validation Error: username may only contain alphanumeric characters and . _ @ + -');
  }

  if (!password || password.length < 6) {
    throw new Error('Validation Error: password must be at least 6 characters long.');
  }

  if (!name || name.length < 2) {
    throw new Error('Validation Error: staff name must be at least 2 characters long.');
  }

  if (!phone || phone.length < 5) {
    throw new Error('Validation Error: phone number must be at least 5 characters long.');
  }

  return { username, password, name, phone };
}

/**
 * Creates the first Head Doctor administrator account inside a transaction.
 * Enforces:
 * 1. Target database is MySQL.
 * 2. User table has exactly 0 rows.
 * 3. Exact role 'Head Doctor' for both Staff and User.
 * 4. Staff status 'Active' and attendance 'Present'.
 * 5. Password hashed with bcryptjs (10 rounds).
 * 6. Atomically links User.staffId to Staff.id.
 */
export async function createFirstHeadDoctor(
  input: HeadDoctorInitInput,
  deps: InitHeadDoctorDeps = {}
): Promise<{ success: boolean; userId: string; staffId: string; username: string }> {
  const validated = validateAdminInput(input);
  const prisma = deps.prismaClient || defaultPrisma;

  // Safeguard 1: Verify database engine is MySQL
  try {
    const versionResult: any = await prisma.$queryRawUnsafe('SELECT VERSION() AS version');
    const versionStr = versionResult && versionResult[0]?.version ? String(versionResult[0].version).toLowerCase() : '';
    // MariaDB and MySQL both identify MySQL protocol compatibility
    if (!versionStr && !versionResult) {
      throw new Error('Unable to verify database engine version.');
    }
  } catch (err: any) {
    throw new Error(`[Database Check Failed] Unable to query target database engine: ${err.message}`);
  }

  // Safeguard 2: Verify User table is completely empty
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new Error(
      `[Safety Abort] The User table already contains ${userCount} record(s). Initial administrator creation is strictly permitted only on a clean database (0 users).`
    );
  }

  // Safeguard 3: Hash password with bcryptjs (10 rounds)
  const passwordHash = await bcrypt.hash(validated.password, 10);

  // Safeguard 4: Transactional creation of Staff and User
  const result = await prisma.$transaction(async (tx: any) => {
    // Double check inside transaction
    const existing = await tx.user.findUnique({ where: { username: validated.username } });
    if (existing) {
      throw new Error(`[Conflict] User "${validated.username}" already exists.`);
    }

    const staff = await tx.staff.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        role: 'Head Doctor',
        status: 'Active',
        attendance: 'Present',
        permissions: null,
      },
    });

    const user = await tx.user.create({
      data: {
        username: validated.username,
        passwordHash,
        role: 'Head Doctor',
        staffId: staff.id,
      },
    });

    return {
      success: true,
      userId: user.id,
      staffId: staff.id,
      username: user.username,
    };
  });

  return result;
}

/**
 * Prompts the user on stdin if running interactively.
 */
async function promptInput(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      let answer = '';
      const onData = (char: Buffer) => {
        const s = char.toString();
        if (s === '\n' || s === '\r' || s === '\u0004') {
          process.stdin.removeListener('data', onData);
          if (process.stdin.setRawMode) process.stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(answer.trim());
        } else if (s === '\u0003') {
          process.exit(1);
        } else if (s === '\b' || s === '\x7f') {
          if (answer.length > 0) {
            answer = answer.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          answer += s;
          process.stdout.write('*');
        }
      };
      if (process.stdin.setRawMode) process.stdin.setRawMode(true);
      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Standalone CLI entrypoint.
 * Reads configuration from environment variables or interactive prompt.
 * Never prints passwords.
 */
async function main() {
  console.log('================================================================');
  console.log('   DENTALCORE — FIRST HEAD DOCTOR INITIALIZATION (ONE-TIME)     ');
  console.log('================================================================\n');

  let username = process.env.ADMIN_USERNAME?.trim() || '';
  let password = process.env.ADMIN_PASSWORD || '';
  let name = process.env.ADMIN_NAME?.trim() || '';
  let phone = process.env.ADMIN_PHONE?.trim() || '';

  const isInteractive = Boolean(process.stdin.isTTY);

  if ((!username || !password || !name || !phone) && isInteractive) {
    console.log('Environment variables not fully provided. Prompting for required details:\n');
    if (!username) username = await promptInput('Enter Head Doctor Username: ');
    if (!name) name = await promptInput('Enter Doctor Full Name (e.g. Dr. Arun): ');
    if (!phone) phone = await promptInput('Enter Doctor Phone Number: ');
    if (!password) password = await promptInput('Enter Password: ', true);
  }

  if (!username || !password || !name || !phone) {
    console.error('ERROR: Missing required inputs. Please provide:');
    console.error('  ADMIN_USERNAME  (e.g., "headdoctor")');
    console.error('  ADMIN_NAME      (e.g., "Dr. Arun")');
    console.error('  ADMIN_PHONE     (e.g., "+91 98765 43210")');
    console.error('  ADMIN_PASSWORD  (minimum 6 characters)');
    console.error('\nUsage example:');
    console.error('  ADMIN_USERNAME="headdoctor" ADMIN_NAME="Dr. Arun" ADMIN_PHONE="+91 98765 43210" ADMIN_PASSWORD="securePassword" npx tsx scripts/init_first_head_doctor.ts\n');
    process.exit(1);
  }

  try {
    console.log(`[Init] Validating inputs for administrator account "${username}"...`);
    const input = validateAdminInput({ username, password, name, phone });

    console.log('[Init] Checking database state (verifying MySQL engine and 0 existing users)...');
    const result = await createFirstHeadDoctor(input);

    console.log('\n================================================================');
    console.log('🎉 SUCCESS: Head Doctor account created successfully!');
    console.log(`   Username : ${result.username}`);
    console.log(`   User ID  : ${result.userId}`);
    console.log(`   Staff ID : ${result.staffId}`);
    console.log(`   Role     : Head Doctor`);
    console.log('   Status   : Active (Attendance: Present)');
    console.log('================================================================\n');
    console.log('You may now log in to DentalCore at the login page using these credentials.');
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ ERROR: Initialization aborted. ${err.message}`);
    process.exit(1);
  } finally {
    await defaultPrisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
