/**
 * Automated Verification Suite: Fail-Closed Configuration and Startup Validation
 * 
 * Tests that:
 * 1. Missing DATABASE_URL throws a fatal error and fails closed.
 * 2. Malformed DATABASE_URL or invalid protocols throw a fatal error.
 * 3. DATABASE_URL without a target database name throws a fatal error.
 * 4. Missing JWT_SECRET throws a fatal error and fails closed.
 * 5. Production mode rejects short JWT secrets (< 32 chars).
 * 6. Valid configuration succeeds and extracts required parameters.
 */

import { validateDatabaseConfig } from '../../src/db';
import { validateJwtSecret } from '../../src/config/authConfig';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Running Fail-Closed Configuration Test Suite ---\n');
  let passed = 0;

  // Preserve original environment variables
  const originalEnv = { ...process.env };

  try {
    // Test 1: Missing DATABASE_URL
    delete process.env.DATABASE_URL;
    let threw = false;
    try {
      validateDatabaseConfig();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('DATABASE_URL environment variable is missing'), 'Error must mention missing DATABASE_URL');
      assert(!err.message.includes('password'), 'Error must not leak password fields');
    }
    assert(threw, 'validateDatabaseConfig must throw when DATABASE_URL is missing');
    console.log('✅ Test 1 Passed: Missing DATABASE_URL fails closed safely.');
    passed++;

    // Test 2: Malformed DATABASE_URL
    process.env.DATABASE_URL = 'not-a-valid-url';
    threw = false;
    try {
      validateDatabaseConfig();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('DATABASE_URL is malformed'), 'Error must mention malformed URL');
    }
    assert(threw, 'validateDatabaseConfig must throw when DATABASE_URL is malformed');
    console.log('✅ Test 2 Passed: Malformed DATABASE_URL fails closed safely.');
    passed++;

    // Test 3: Unsupported Protocol (e.g. postgresql)
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    threw = false;
    try {
      validateDatabaseConfig();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('unsupported'), 'Error must mention unsupported protocol');
      assert(!err.message.includes('pass'), 'Error must not leak password credentials');
    }
    assert(threw, 'validateDatabaseConfig must reject non-MySQL protocols');
    console.log('✅ Test 3 Passed: Non-MySQL/MariaDB protocol fails closed safely.');
    passed++;

    // Test 4: Missing Database Name
    process.env.DATABASE_URL = 'mysql://user:pass@127.0.0.1:3306/';
    threw = false;
    try {
      validateDatabaseConfig();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('must specify a target database name'), 'Error must mention missing database name');
    }
    assert(threw, 'validateDatabaseConfig must reject URL without database name');
    console.log('✅ Test 4 Passed: Missing database name fails closed safely.');
    passed++;

    // Test 5: Missing JWT_SECRET
    delete process.env.JWT_SECRET;
    threw = false;
    try {
      validateJwtSecret();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('JWT_SECRET environment variable is missing'), 'Error must mention missing JWT_SECRET');
    }
    assert(threw, 'validateJwtSecret must throw when JWT_SECRET is missing');
    console.log('✅ Test 5 Passed: Missing JWT_SECRET fails closed safely.');
    passed++;

    // Test 6: Insecure/Short JWT_SECRET in Production Mode
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short_secret';
    threw = false;
    try {
      validateJwtSecret();
    } catch (err: any) {
      threw = true;
      assert(err.message.includes('must be at least 32 characters in production mode'), 'Production must enforce 32-char secret minimum');
    }
    assert(threw, 'validateJwtSecret must reject short secrets in production');
    console.log('✅ Test 6 Passed: Short JWT_SECRET in production fails closed safely.');
    passed++;

    // Test 7: Valid Configuration
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'mysql://dental:dentalpassword@127.0.0.1:3306/dentalcore_test';
    process.env.JWT_SECRET = 'a_very_secure_development_jwt_secret_key_12345';
    
    const dbConfig = validateDatabaseConfig();
    assert(dbConfig.host === '127.0.0.1', 'Host parsed correctly');
    assert(dbConfig.port === 3306, 'Port parsed correctly');
    assert(dbConfig.database === 'dentalcore_test', 'Database parsed correctly');

    const secret = validateJwtSecret();
    assert(secret === 'a_very_secure_development_jwt_secret_key_12345', 'JWT secret returned correctly');
    console.log('✅ Test 7 Passed: Valid configuration parses correctly.');
    passed++;

    console.log(`\n🎉 All ${passed}/${passed} Fail-Closed Configuration Tests Passed!`);
    process.exit(0);
  } finally {
    // Restore original environment variables
    process.env = originalEnv;
  }
}

runTests().catch((err) => {
  console.error('\n❌ Fail-Closed Test Suite Failed:', err.message);
  process.exit(1);
});
