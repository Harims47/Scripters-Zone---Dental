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

  // 3. Treatment Catalog Master Data
  const treatments = [
    { category: 'Consultation', name: 'Consultation' },
    { category: 'Diagnostic', name: 'X-ray' },
    { category: 'Diagnostic', name: 'Diagnostic' },
    { category: 'Scaling & Curettage', name: 'Scaling & Curettage' },
    { category: 'Fillings', name: 'Silver Amalgam' },
    { category: 'Fillings', name: 'Composite' },
    { category: 'Extraction', name: 'Extraction' },
    { category: 'Extraction', name: 'Surgical Extraction' },
    { category: 'Endodontics', name: 'Root Canal Treatment' },
    { category: 'Crowns', name: 'Full Ceramic' },
    { category: 'Crowns', name: 'Facing Ceramic' },
    { category: 'Crowns', name: 'Zirconia', variant: 'Basic' },
    { category: 'Crowns', name: 'Zirconia', variant: 'Classic' },
    { category: 'Crowns', name: 'Zirconia', variant: 'Premium' },
    { category: 'Crowns', name: 'Acrylic Crown' },
    { category: 'Prosthetic Dentures', name: 'Complete Denture', variant: 'Acrylic' },
    { category: 'Prosthetic Dentures', name: 'Complete Denture', variant: 'Sunflex' },
    { category: 'Prosthetic Dentures', name: 'Partial Denture', variant: 'Acrylic' },
    { category: 'Prosthetic Dentures', name: 'Partial Denture', variant: 'Sunflex' },
    { category: 'Ortho', name: 'Fixed Appliance' },
    { category: 'Ortho', name: 'Removable Appliance' },
    { category: 'Implants', name: 'Dental Implants' }
  ];

  for (const item of treatments) {
    const existing = await prisma.treatmentCatalog.findFirst({
      where: { name: item.name, variant: item.variant || null }
    });
    if (!existing) {
      await prisma.treatmentCatalog.create({
        data: {
          category: item.category,
          name: item.name,
          variant: item.variant || null
        }
      });
    }
  }

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
