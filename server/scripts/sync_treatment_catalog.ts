import { prisma } from '../src/db';

export const NEW_TREATMENT_CATALOG = [
  // 1. Endodontics
  { category: 'Endodontics', name: 'Filling', variant: null },
  { category: 'Endodontics', name: 'RCT', variant: null },
  { category: 'Endodontics', name: 'Permanent Filling', variant: null },
  { category: 'Endodontics', name: 'RE RCT', variant: null },
  { category: 'Endodontics', name: 'POST & CORE', variant: null },
  { category: 'Endodontics', name: 'APICOECTOMY', variant: null },

  // 2. Prosthodontics
  { category: 'Prosthodontics', name: 'Complete Denture', variant: null },
  { category: 'Prosthodontics', name: 'Removable Partial Denture', variant: null },
  { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Metal Ceramic' },
  { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Zirconia' },
  { category: 'Prosthodontics', name: 'Fixed Partial Denture', variant: 'Acrylic' },

  // 3. Orthodontics
  { category: 'Orthodontics', name: 'Fixed Appliance', variant: 'Basic' },
  { category: 'Orthodontics', name: 'Fixed Appliance', variant: 'Self Ligating Damon' },
  { category: 'Orthodontics', name: 'Removable Appliance', variant: null },
  { category: 'Orthodontics', name: 'Invisalign', variant: null },

  // 4. Periodontics
  { category: 'Periodontics', name: 'Scaling', variant: null },
  { category: 'Periodontics', name: 'Curettage', variant: null },
  { category: 'Periodontics', name: 'Flap Surgery', variant: null },
  { category: 'Periodontics', name: 'Bone Graft', variant: null },

  // 5. Surgery
  { category: 'Surgery', name: 'Extraction', variant: null },
  { category: 'Surgery', name: 'Impaction', variant: null },
  { category: 'Surgery', name: 'Frenectomy', variant: null },
  { category: 'Surgery', name: 'Splinting', variant: null },
  { category: 'Surgery', name: 'Ankyloglossia', variant: null },
  { category: 'Surgery', name: 'Fixation', variant: null },
  { category: 'Surgery', name: 'Soft Tissue Removal', variant: null },

  // 6. Pedodontics
  { category: 'Pedodontics', name: 'Filling', variant: null },
  { category: 'Pedodontics', name: 'Pulpectomy', variant: null },
  { category: 'Pedodontics', name: 'Extraction', variant: null },

  // 7. Neurological
  { category: 'Neurological', name: 'Trigeminal Neurologia', variant: null },
  { category: 'Neurological', name: 'MPDS', variant: null },
  { category: 'Neurological', name: 'Facial Palsy', variant: null },
];

async function syncCatalog() {
  console.log('[Catalog Sync] Starting treatment catalog synchronization...');

  // 1. Deactivate old items that are not in the new catalog
  const existingItems = await prisma.treatmentCatalog.findMany();
  for (const item of existingItems) {
    const isStillPresent = NEW_TREATMENT_CATALOG.some(
      (n) =>
        n.category.toLowerCase() === item.category.toLowerCase() &&
        n.name.toLowerCase() === item.name.toLowerCase() &&
        (n.variant || '').toLowerCase() === (item.variant || '').toLowerCase()
    );

    if (!isStillPresent && item.isActive) {
      await prisma.treatmentCatalog.update({
        where: { id: item.id },
        data: { isActive: false },
      });
      console.log(`Deactivated legacy item: ${item.category} - ${item.name} (${item.variant || 'No variant'})`);
    }
  }

  // 2. Upsert new catalog items
  for (const newItem of NEW_TREATMENT_CATALOG) {
    const existing = await prisma.treatmentCatalog.findFirst({
      where: {
        category: newItem.category,
        name: newItem.name,
        variant: newItem.variant || null,
      },
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.treatmentCatalog.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
    } else {
      await prisma.treatmentCatalog.create({
        data: {
          category: newItem.category,
          name: newItem.name,
          variant: newItem.variant || null,
          isActive: true,
        },
      });
      console.log(`Created new item: ${newItem.category} - ${newItem.name} (${newItem.variant || 'No variant'})`);
    }
  }

  const activeItems = await prisma.treatmentCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  console.log(`[Catalog Sync] Completed. Active catalog items count: ${activeItems.length}`);
  for (const a of activeItems) {
    console.log(`  • [${a.category}] ${a.name} ${a.variant ? `(${a.variant})` : ''}`);
  }

  await prisma.$disconnect();
}

syncCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error syncing catalog:', err);
    process.exit(1);
  });
