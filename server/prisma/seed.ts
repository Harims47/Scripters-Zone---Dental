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
    // 1. Endodontics
    { category: 'Endodontics', name: 'Filling' },
    { category: 'Endodontics', name: 'RCT' },
    { category: 'Endodontics', name: 'Permanent Filling' },
    { category: 'Endodontics', name: 'RE RCT' },
    { category: 'Endodontics', name: 'POST & CORE' },
    { category: 'Endodontics', name: 'APICOECTOMY' },

    // 2. Prosthodontics
    { category: 'Prosthodontics', name: 'Complete Denture' },
    { category: 'Prosthodontics', name: 'Removable Partial Denture' },
    { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Metal Ceramic' },
    { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Zirconia' },
    { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Acrylic' },

    // 3. Orthodontics
    { category: 'Orthodontics', name: 'Fixed Appliance', variant: 'Basic' },
    { category: 'Orthodontics', name: 'Fixed Appliance', variant: 'Self Ligating Damon' },
    { category: 'Orthodontics', name: 'Removable Appliance' },
    { category: 'Orthodontics', name: 'Invisalign' },

    // 4. Periodontics
    { category: 'Periodontics', name: 'Scaling' },
    { category: 'Periodontics', name: 'Curettage' },
    { category: 'Periodontics', name: 'Flap Surgery' },
    { category: 'Periodontics', name: 'Bone Graft' },

    // 5. Surgery
    { category: 'Surgery', name: 'Extraction' },
    { category: 'Surgery', name: 'Impaction' },
    { category: 'Surgery', name: 'Frenectomy' },
    { category: 'Surgery', name: 'Splinting' },
    { category: 'Surgery', name: 'Ankyloglossia' },
    { category: 'Surgery', name: 'Fixation' },
    { category: 'Surgery', name: 'Soft Tissue Removal' },

    // 6. Pedodontics
    { category: 'Pedodontics', name: 'Filling' },
    { category: 'Pedodontics', name: 'Pulpectomy' },
    { category: 'Pedodontics', name: 'Extraction' },

    // 7. Neurological
    { category: 'Neurological', name: 'Trigeminal Neurologia' },
    { category: 'Neurological', name: 'MPDS' },
    { category: 'Neurological', name: 'Facial Palsy' }
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
