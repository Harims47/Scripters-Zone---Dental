import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding master data only (Development)...');

  const passwordHash = await bcrypt.hash('demo123', 10);

  // 1. Core Users and Staff (3 Roles Only)
  const demoUsers = [
    { username: 'headdoctor', role: 'Head Doctor', name: 'Dr. Arun', phone: '+91 98765 43210' },
    { username: 'dutydoctor', role: 'Duty Doctor', name: 'Dr. Carter', phone: '+91 98765 43220' },
    { username: 'receptionist', role: 'Receptionist', name: 'Reception User', phone: '+91 98765 43215' }
  ];

  for (const user of demoUsers) {
    const staff = await prisma.staff.create({
      data: {
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: 'Active'
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

  // 2. Medicines Master Data
  await prisma.medicine.createMany({
    data: [
      { name: 'Amoxicillin 500mg', categoryId: 'cat1', currentStock: 150, stockWarningLevel: 50, unit: 'Tablets', form: 'Tablet', unitPrice: 15 },
      { name: 'Ibuprofen 400mg', categoryId: 'cat2', currentStock: 200, stockWarningLevel: 100, unit: 'Tablets', form: 'Tablet', unitPrice: 8 },
      { name: 'Lidocaine 2%', categoryId: 'cat3', currentStock: 45, stockWarningLevel: 20, unit: 'Vials', form: 'Injection', unitPrice: 120 },
      { name: 'Chlorhexidine', categoryId: 'cat4', currentStock: 30, stockWarningLevel: 15, unit: 'Bottles', form: 'Mouthwash', unitPrice: 85 },
      { name: 'Paracetamol 500mg', categoryId: 'cat2', currentStock: 300, stockWarningLevel: 100, unit: 'Tablets', form: 'Tablet', unitPrice: 5 },
      { name: 'Diclofenac Gel', categoryId: 'cat2', currentStock: 25, stockWarningLevel: 10, unit: 'Tubes', form: 'Ointment', unitPrice: 45 },
    ]
  });

  console.log('Database seeded successfully. Transactional data is empty.');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
