import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo database...');

  const passwordHash = await bcrypt.hash('demo123', 10);

  // Users and Staff
  const demoUsers = [
    { username: 'hd1', role: 'Head Doctor', name: 'Dr. Arun' },
    { username: 'dd1', role: 'Duty Doctor', name: 'Dr. Carter' },
    { username: 'rc1', role: 'Receptionist', name: 'Reception User' },
    { username: 'as1', role: 'Assistant', name: 'Assistant User' },
    { username: 'sg1', role: 'Surgeon', name: 'Dr. Surgeon' }
  ];

  for (const user of demoUsers) {
    const staff = await prisma.staff.create({
      data: {
        name: user.name,
        role: user.role
      }
    });

    await prisma.user.create({
      data: {
        username: user.username,
        passwordHash,
        role: user.role,
        staffId: staff.id
      }
    });
  }

  // Patients
  const p1 = await prisma.patient.create({
    data: { name: 'Sarah Jenkins', phone: '555-0101', age: 34, gender: 'Female' }
  });
  const p2 = await prisma.patient.create({
    data: { name: 'Michael Chen', phone: '555-0102', age: 45, gender: 'Male' }
  });

  // Medicines
  await prisma.medicine.createMany({
    data: [
      { name: 'Amoxicillin', category: 'Antibiotic', strength: '500mg', currentStock: 100, minimumStock: 20 },
      { name: 'Ibuprofen', category: 'Painkiller', strength: '400mg', currentStock: 200, minimumStock: 50 },
      { name: 'Paracetamol', category: 'Painkiller', strength: '500mg', currentStock: 150, minimumStock: 30 }
    ]
  });

  console.log('Database seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
