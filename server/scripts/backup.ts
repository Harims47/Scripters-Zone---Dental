import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rawDbUrl = process.env.DATABASE_URL;
if (!rawDbUrl) {
  console.error('ERROR: DATABASE_URL not defined in server/.env');
  process.exit(1);
}

// Clean Prisma specific query params like ?schema=public which pg_dump rejects
const parsedUrl = new URL(rawDbUrl);
parsedUrl.search = '';
const dbUrl = parsedUrl.toString();

// Locate pg_dump
const pgDumpCandidates = [
  'pg_dump',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe'
];

let pgDumpPath = 'pg_dump';
for (const candidate of pgDumpCandidates) {
  if (candidate === 'pg_dump') {
    try {
      execSync('pg_dump --version', { stdio: 'ignore' });
      pgDumpPath = 'pg_dump';
      break;
    } catch {
      // not in path
    }
  } else if (fs.existsSync(candidate)) {
    pgDumpPath = `"${candidate}"`;
    break;
  }
}

const backupDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `dentalcore_backup_${timestamp}.sql`;
const backupFilePath = path.join(backupDir, backupFilename);

console.log(`Starting PostgreSQL backup using ${pgDumpPath}...`);
console.log(`Destination: ${backupFilePath}`);

try {
  // Execute non-destructive pg_dump using the connection URI
  execSync(`${pgDumpPath} --dbname="${dbUrl}" --clean --if-exists --format=plain --file="${backupFilePath}"`, {
    stdio: 'inherit'
  });

  const stats = fs.statSync(backupFilePath);
  console.log(`Backup completed successfully!`);
  console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`Location: ${backupFilePath}`);
} catch (err) {
  console.error('Backup failed:', err);
  process.exit(1);
}
