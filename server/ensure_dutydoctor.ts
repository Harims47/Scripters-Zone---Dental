import { prisma } from './src/db';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('demo123', 10);
  
  // Find Dr. Priya Sharma who doesn't have a linked user account
  const staff = await prisma.staff.findFirst({
    where: {
      name: 'Dr. Priya Sharma'
    }
  });

  if (staff) {
    const existingUser = await prisma.user.findUnique({ where: { username: 'dutydoctor' } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          username: 'dutydoctor',
          passwordHash: hash,
          role: 'Duty Doctor',
          staffId: staff.id
        }
      });
      console.log(`Created dutydoctor account linked to Dr. Priya Sharma (${staff.id})`);
    } else {
      await prisma.user.update({
        where: { username: 'dutydoctor' },
        data: { passwordHash: hash, staffId: staff.id }
      });
      console.log(`Updated dutydoctor account linked to Dr. Priya Sharma (${staff.id})`);
    }
  } else {
    console.error('Dr. Priya Sharma staff record not found.');
  }
}

main().finally(() => prisma.$disconnect());
