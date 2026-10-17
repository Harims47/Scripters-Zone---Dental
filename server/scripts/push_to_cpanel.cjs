const { execSync } = require('child_process');

const cpanelUrl = "mysql://Rafi_Dental_Admin_Testing:Jgg%5EQ%28V4D59%5Ed%7D%23s@92.205.174.46:3306/Rafi_Dental_Staging";

console.log('Connecting and pushing schema to cPanel database (Rafi_Dental_Staging)...');

try {
  execSync('npx prisma db push --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: __dirname + '/..',
    env: {
      ...process.env,
      CPANEL_DATABASE_URL: cpanelUrl,
      DATABASE_URL: cpanelUrl,
    }
  });
  console.log('SUCCESS: Schema successfully pushed to cPanel database!');
} catch (err) {
  console.error('ERROR during push:', err.message);
  process.exit(1);
}
