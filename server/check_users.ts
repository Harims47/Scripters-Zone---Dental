import { prisma } from './src/db';
import bcrypt from 'bcryptjs';

async function main() {
  const users = await prisma.user.findMany({
    include: { staff: true }
  });
  console.log('=== USERS IN DB ===');
  for (const u of users) {
    const isPassValid = await bcrypt.compare('demo123', u.passwordHash);
    console.log(`User: ${u.username}, Role: ${u.role}, Staff: ${u.staff?.name}, PassValid(demo123): ${isPassValid}`);
  }
}

main().finally(() => prisma.$disconnect());
