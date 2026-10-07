const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const catalogs = await prisma.treatmentCatalog.findMany({ take: 20 });
  console.log('Catalogs:', catalogs.map(c => ({ id: c.id, name: c.name, variant: c.variant })));
  const staff = await prisma.staff.findMany();
  console.log('Staff:', staff.map(s => ({ id: s.id, name: s.name, role: s.role })));
  const sampleImages = await prisma.dentalImage.findMany({ take: 2 });
  console.log('Sample images:', sampleImages.map(i => ({ type: i.type, tooth: i.toothNumber, fileName: i.fileName, urlLen: i.imageUrl?.length, urlSnippet: i.imageUrl?.slice(0, 80) })));
}

main()
  .catch(console.error)
  .finally(() => pool.end());
