export interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  categoryId: string;
  form: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Liquid' | 'Mouthwash' | 'Other';
  unit: string;
  stockWarningLevel: number;
  currentStock: number;
}

export const DEMO_MEDICINES: Medicine[] = [
  { id: 'MED-001', name: 'Amoxicillin 500mg', categoryId: 'cat1', currentStock: 150, stockWarningLevel: 50, unit: 'Tablets', form: 'Tablet' },
  { id: 'MED-002', name: 'Ibuprofen 400mg', categoryId: 'cat2', currentStock: 200, stockWarningLevel: 100, unit: 'Tablets', form: 'Tablet' },
  { id: 'MED-003', name: 'Lidocaine 2%', categoryId: 'cat3', currentStock: 45, stockWarningLevel: 20, unit: 'Vials', form: 'Injection' },
  { id: 'MED-004', name: 'Chlorhexidine 0.12%', categoryId: 'cat4', currentStock: 80, stockWarningLevel: 30, unit: 'Bottles', form: 'Mouthwash' },
  { id: 'MED-005', name: 'Vitamin C 1000mg', categoryId: 'cat5', currentStock: 300, stockWarningLevel: 150, unit: 'Tablets', form: 'Tablet' },
  { id: 'MED-006', name: 'Dental Cotton Rolls', categoryId: 'cat6', currentStock: 500, stockWarningLevel: 200, unit: 'Boxes', form: 'Other' }
];
