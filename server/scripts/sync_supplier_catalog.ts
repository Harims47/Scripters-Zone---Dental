import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/db';
import { SUPPLIER_CATALOG, MEDICINE_CATEGORY_NAMES, MATERIAL_CATEGORY_NAMES } from '../src/constants/supplierCatalog';

export async function syncSupplierCatalog() {
  console.log('[Supplier Catalog Sync] Starting synchronization of supplier categories and dosage/supply items...');

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;

  const validCategoryNames = new Set<string>([...MEDICINE_CATEGORY_NAMES, ...MATERIAL_CATEGORY_NAMES]);

  for (const catEntry of SUPPLIER_CATALOG) {
    // 1. Upsert MedicineCategory
    let category = await prisma.medicineCategory.findUnique({
      where: { name: catEntry.category },
    });

    if (!category) {
      category = await prisma.medicineCategory.create({
        data: {
          name: catEntry.category,
          description: catEntry.description,
          status: 'Active',
        },
      });
      categoriesCreated++;
      console.log(`[Category] Created: "${catEntry.category}" (${category.id})`);
    } else {
      if (category.status !== 'Active' || category.description !== catEntry.description) {
        category = await prisma.medicineCategory.update({
          where: { id: category.id },
          data: {
            description: catEntry.description,
            status: 'Active',
          },
        });
        categoriesUpdated++;
      }
    }

    // 2. Upsert Items under this Category
    for (const item of catEntry.items) {
      const existingItem = await prisma.medicine.findFirst({
        where: {
          name: item.name,
          categoryId: category.id,
        },
      });

      if (!existingItem) {
        await prisma.medicine.create({
          data: {
            name: item.name,
            categoryId: category.id,
            form: item.form || (catEntry.type === 'MATERIAL' ? 'Dental Material' : 'Tablet'),
            unit: item.unit || (catEntry.type === 'MATERIAL' ? 'Unit' : 'Tablets'),
            stockWarningLevel: 10,
            currentStock: 0,
            unitPrice: 0,
            status: 'Active',
          },
        });
        itemsCreated++;
      } else {
        await prisma.medicine.update({
          where: { id: existingItem.id },
          data: {
            form: item.form || existingItem.form,
            unit: item.unit || existingItem.unit,
            status: 'Active',
          },
        });
        itemsUpdated++;
      }
    }
  }

  // 3. Migrate items from legacy categories to the new separated categories if any exist
  const legacyCatNames = ['Antibiotics', 'Painkillers', 'Anesthetics', 'Antiseptics', 'Vitamins/Supplements', 'Consumables'];
  for (const legacyName of legacyCatNames) {
    const legacyCat = await prisma.medicineCategory.findUnique({
      where: { name: legacyName },
      include: { medicines: true }
    });

    if (legacyCat && legacyCat.medicines.length > 0) {
      for (const med of legacyCat.medicines) {
        // Find which new category this med belongs to
        let targetCatName = '';
        for (const catEntry of SUPPLIER_CATALOG) {
          if (catEntry.items.some(i => i.name.toLowerCase() === med.name.toLowerCase())) {
            targetCatName = catEntry.category;
            break;
          }
        }

        if (!targetCatName) {
          if (legacyName === 'Antibiotics') targetCatName = 'Antibiotic';
          else if (legacyName === 'Painkillers') targetCatName = 'Anti Inflamatory';
          else if (legacyName === 'Antiseptics') targetCatName = 'Topical';
          else if (legacyName === 'Vitamins/Supplements') targetCatName = 'Supplement';
          else if (legacyName === 'Consumables') targetCatName = 'Oral Hygiene';
          else if (legacyName === 'Anesthetics') targetCatName = 'General';
        }

        if (targetCatName) {
          const targetCat = await prisma.medicineCategory.findUnique({ where: { name: targetCatName } });
          if (targetCat) {
            await prisma.medicine.update({
              where: { id: med.id },
              data: { categoryId: targetCat.id }
            });
            console.log(`[Migrated] Item "${med.name}" moved from "${legacyName}" to "${targetCatName}"`);
          }
        }
      }
    }

    if (legacyCat && legacyCat.status === 'Active') {
      await prisma.medicineCategory.update({
        where: { id: legacyCat.id },
        data: { status: 'Inactive' }
      });
      console.log(`[Category Inactivated] Obsolete category "${legacyName}" set to Inactive`);
    }
  }

  console.log('\n============================================================');
  console.log('🎉 Supplier Catalog Synchronization Complete!');
  console.log(`   Categories : ${categoriesCreated} created, ${categoriesUpdated} updated`);
  console.log(`   Dosage Items: ${itemsCreated} created, ${itemsUpdated} updated`);
  console.log('============================================================\n');

  return {
    categoriesCreated,
    categoriesUpdated,
    itemsCreated,
    itemsUpdated,
  };
}

if (require.main === module) {
  syncSupplierCatalog()
    .catch((err) => {
      console.error('[Sync Error]', err.message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
