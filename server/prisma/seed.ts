import { prisma } from '../src/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

/**
 * 1. Master Catalogs (Safe for initial setup)
 * Initializes essential treatment catalogs and medicine categories.
 */
async function seedMasterCatalogs() {
  console.log('[Seed] Seeding master medicine categories and treatment catalog...');

  const defaultCategories = [
    { id: 'cat1', name: 'Antibiotics', description: 'Medicines commonly used to treat bacterial infections.' },
    { id: 'cat2', name: 'Painkillers', description: 'Analgesics and anti-inflammatory medications for pain management.' },
    { id: 'cat3', name: 'Anesthetics', description: 'Local anesthetics used during dental procedures.' },
    { id: 'cat4', name: 'Antiseptics', description: 'Antiseptic solutions and mouthwashes for infection control.' },
    { id: 'cat5', name: 'Vitamins/Supplements', description: 'Dietary supplements and vitamins.' },
    { id: 'cat6', name: 'Consumables', description: 'General clinic dental consumables and supplies.' },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.medicineCategory.findUnique({ where: { id: cat.id } });
    if (!existing) {
      await prisma.medicineCategory.create({
        data: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          status: 'Active'
        }
      });
    }
  }

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

  console.log('[Seed] Master catalog setup complete.');
}

/**
 * 2. Development-Only Demo Users
 * STRICT SAFETY: This function will refuse to run in production environments.
 */
async function seedDevelopmentDemoUsers() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.warn('[SEED SAFETY] Production environment detected. Skipping demo user creation.');
    return;
  }

  // Check if any users already exist
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`[Seed] Existing users found (${existingUserCount}). Skipping demo user seeding.`);
    return;
  }

  console.log('[Seed] Seeding development demo accounts (headdoctor, dutydoctor, receptionist)...');
  const passwordHash = await bcrypt.hash('demo123', 10);

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

  console.log('[Seed] Development demo users created successfully.');
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  const targetHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : '';

  console.log(`[Seed] Starting seed execution. Target host: ${targetHost || 'unknown'}, Mode: ${process.env.NODE_ENV || 'development'}`);

  // 1. Seed master catalogs
  await seedMasterCatalogs();

  // 2. Conditionally seed development demo data
  if (!isProduction) {
    await seedDevelopmentDemoUsers();
  } else {
    console.log('[Seed] Production mode active: Only master catalogs were processed. Zero demo accounts created.');
  }

  console.log('[Seed] Seed execution finished cleanly.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
