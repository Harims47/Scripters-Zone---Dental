import { prisma } from '../db';
import defaultCatalogs from '../constants/masterCatalogs.json';

export interface CatalogSyncData {
  categories?: Array<{
    id: string;
    name: string;
    description?: string;
    status?: string;
  }>;
  medicines?: Array<{
    id: string;
    name: string;
    genericName?: string | null;
    categoryId: string;
    form: string;
    unit: string;
    stockWarningLevel?: number;
    currentStock?: number;
    unitPrice?: number;
    status?: string;
  }>;
  treatments?: Array<{
    id: string;
    category: string;
    name: string;
    variant?: string | null;
    isActive?: boolean | number;
  }>;
}

export async function syncMasterCatalogs(customData?: CatalogSyncData) {
  const data = customData || defaultCatalogs;
  const categories = data.categories || [];
  const medicines = data.medicines || [];
  const treatments = data.treatments || [];

  console.log(`[CatalogSync] Synchronizing ${categories.length} categories, ${medicines.length} medicines, ${treatments.length} treatments...`);

  let categoriesCount = 0;
  let medicinesCount = 0;
  let treatmentsCount = 0;

  // 1. Sync Categories
  for (const cat of categories) {
    await prisma.medicineCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description || '',
        status: cat.status || 'Active',
      },
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        status: cat.status || 'Active',
      },
    });
    categoriesCount++;
  }

  // 2. Sync Medicines
  for (const med of medicines) {
    await prisma.medicine.upsert({
      where: { id: med.id },
      update: {
        name: med.name,
        genericName: med.genericName || null,
        categoryId: med.categoryId,
        form: med.form,
        unit: med.unit,
        stockWarningLevel: med.stockWarningLevel ?? 10,
        currentStock: med.currentStock ?? 0,
        unitPrice: med.unitPrice ?? 0,
        status: med.status || 'Active',
      },
      create: {
        id: med.id,
        name: med.name,
        genericName: med.genericName || null,
        categoryId: med.categoryId,
        form: med.form,
        unit: med.unit,
        stockWarningLevel: med.stockWarningLevel ?? 10,
        currentStock: med.currentStock ?? 0,
        unitPrice: med.unitPrice ?? 0,
        status: med.status || 'Active',
      },
    });
    medicinesCount++;
  }

  // 3. Sync Treatments
  for (const trt of treatments) {
    const isActive = trt.isActive === undefined ? true : Boolean(trt.isActive);
    await prisma.treatmentCatalog.upsert({
      where: { id: trt.id },
      update: {
        category: trt.category,
        name: trt.name,
        variant: trt.variant || null,
        isActive,
      },
      create: {
        id: trt.id,
        category: trt.category,
        name: trt.name,
        variant: trt.variant || null,
        isActive,
      },
    });
    treatmentsCount++;
  }

  console.log(`[CatalogSync] Complete: ${categoriesCount} categories, ${medicinesCount} medicines, ${treatmentsCount} treatments synced.`);

  return {
    categoriesSynced: categoriesCount,
    medicinesSynced: medicinesCount,
    treatmentsSynced: treatmentsCount,
  };
}
