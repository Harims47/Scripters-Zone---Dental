export interface SupplierCatalogItem {
  name: string;
  unit: string;
  form?: string;
}

export interface SupplierCatalogCategory {
  category: string;
  type: 'MEDICINE' | 'MATERIAL';
  description: string;
  items: SupplierCatalogItem[];
}

export const MEDICINE_CATEGORY_NAMES = [
  'Oral Hygiene',
  'Topical',
  'Anti Inflamatory',
  'Antibiotic',
  'Anti Ulcer',
  'Supplement',
  'Sedative',
  'Injection',
  'PEDO',
] as const;

export const MATERIAL_CATEGORY_NAMES = [
  'General',
  'Prosthodontics',
  'Endodontics',
  'GP POINTS',
  'ENDO FILES',
  'FILLING',
] as const;

export const MEDICINE_CATALOG: SupplierCatalogCategory[] = [
  {
    category: 'Oral Hygiene',
    type: 'MEDICINE',
    description: 'Oral hygiene formulations, brushes, pastes, and rinses',
    items: [
      { name: 'Tooth Brush', unit: 'Piece', form: 'Oral Hygiene' },
      { name: 'Tooth Paste', unit: 'Tube', form: 'Paste' },
      { name: 'Mouth Wash', unit: 'Bottle', form: 'Mouthwash' },
    ],
  },
  {
    category: 'Topical',
    type: 'MEDICINE',
    description: 'Topical dental ointments and soothing gels',
    items: [
      { name: 'Ointment', unit: 'Tube', form: 'Ointment' },
      { name: 'Gel', unit: 'Tube', form: 'Gel' },
    ],
  },
  {
    category: 'Anti Inflamatory',
    type: 'MEDICINE',
    description: 'Anti-inflammatory and analgesic medications',
    items: [
      { name: 'Accept-P 425mg (Aceclofenac Paracetamol)', unit: '425mg', form: 'Tablet' },
      { name: 'Ibuprofen (Ibuprofen)', unit: '400mg', form: 'Tablet' },
      { name: 'Ketocorn 10 (Ketorolac Tromethamine Tablets IP 10mg)', unit: '10mg', form: 'Tablet' },
      { name: 'MEDOMOL - T (Paracetamol & Tramadol Hydrochloride Tablets)', unit: 'Tablets', form: 'Tablet' },
      { name: 'Tranzyme (Trypsin, Bromelain & Rutoside Trihydrate Tablets)', unit: 'Tablets', form: 'Tablet' },
    ],
  },
  {
    category: 'Antibiotic',
    type: 'MEDICINE',
    description: 'Antibiotic formulations and antibacterial tablets',
    items: [
      { name: 'Actofin-OZ (Ofloxacin and  Ornidazole Tablets IP)', unit: 'Tablets', form: 'Tablet' },
      { name: 'Amoxdent-500 (Amoxycillin)', unit: '500mg', form: 'Capsule' },
      { name: 'Cornceff-200 LB (Cefixime & Lactic Acid Bacillus Dispersible Tablets)', unit: '200mg', form: 'Dispersible Tablet' },
      { name: 'Erythrocin 500 (Erythromycin Stearate Tablets IP 00 MG)', unit: '500mg', form: 'Tablet' },
      { name: 'Moxclav 625mg (Amoxycillin and Potassium Clavulanate Tablets IP)', unit: '625mg', form: 'Tablet' },
      { name: 'Sporidex CV 375 (Cephalexin ER and Clavulanate Potassium Tablets)', unit: '375mg', form: 'Tablet' },
    ],
  },
  {
    category: 'Anti Ulcer',
    type: 'MEDICINE',
    description: 'Gastroprotective and anti-ulcer medications',
    items: [
      { name: 'Gaspan 40mg (Pantoprazole Sodium Tablets IP)', unit: '40mg', form: 'Tablet' },
    ],
  },
  {
    category: 'Supplement',
    type: 'MEDICINE',
    description: 'Nutritional and vitamin supplements',
    items: [
      { name: 'Limcee (Vitamin C)', unit: '500mg', form: 'Chewable Tablet' },
      { name: 'UNIZ-B (Multi Vitamin Supplement)', unit: 'Tablets', form: 'Tablet' },
    ],
  },
  {
    category: 'Sedative',
    type: 'MEDICINE',
    description: 'Sedatives and anticonvulsant tablets',
    items: [
      { name: 'Mazetol 200 (Carbamazepine Tablets IP 200)', unit: '200mg', form: 'Tablet' },
    ],
  },
  {
    category: 'Injection',
    type: 'MEDICINE',
    description: 'Injectable anti-inflammatories and corticosteroids',
    items: [
      { name: 'Dynapar 8Q (Diclofenac Sodium Injection IP 75 mg/ml)', unit: '75mg/ml', form: 'Injection' },
      { name: 'Dexa (Dexamethasone injection IP)', unit: 'Vial', form: 'Injection' },
    ],
  },
  {
    category: 'PEDO',
    type: 'MEDICINE',
    description: 'Pediatric formulations and oral hygiene items',
    items: [
      { name: 'Tooth Brush', unit: 'Piece', form: 'Oral Hygiene' },
      { name: 'Tooth Paste', unit: 'Tube', form: 'Paste' },
      { name: 'Syrup', unit: 'Bottle', form: 'Syrup' },
    ],
  },
];

export const MATERIAL_CATALOG: SupplierCatalogCategory[] = [
  {
    category: 'General',
    type: 'MATERIAL',
    description: 'General clinic dental consumables, hygiene supplies, and surgical disposables',
    items: [
      { name: 'Mask', unit: 'Box', form: 'Consumable' },
      { name: 'Gloves', unit: 'Box', form: 'Consumable' },
      { name: 'Spirit', unit: 'Bottle', form: 'Liquid' },
      { name: 'Saline', unit: 'Bottle', form: 'Liquid' },
      { name: 'Local Anesthesia', unit: 'Vial', form: 'Injectable' },
      { name: 'Articulating paper', unit: 'Booklet', form: 'Consumable' },
      { name: 'cotton rolls', unit: 'Pack', form: 'Consumable' },
      { name: 'Cotton Pellets', unit: 'Pack', form: 'Consumable' },
      { name: 'Suture Needle', unit: 'Pack', form: 'Surgical Material' },
      { name: 'Suture Thread', unit: 'Pack', form: 'Surgical Material' },
      { name: 'Syringe', unit: 'ml', form: 'Disposable' },
      { name: 'Topical Spray', unit: 'Can', form: 'Spray' },
      { name: 'Suction Tip', unit: 'Pack', form: 'Consumable' },
      { name: 'Xray Sleeve', unit: 'Pack', form: 'Consumable' },
    ],
  },
  {
    category: 'Prosthodontics',
    type: 'MATERIAL',
    description: 'Prosthetic materials, impression compounds, waxes, and dental stone',
    items: [
      { name: 'Wax', unit: 'Sheet', form: 'Dental Material' },
      { name: 'Putty', unit: 'Tub', form: 'Dental Material' },
      { name: 'Light body', unit: 'Cartridge', form: 'Dental Material' },
      { name: 'Alginate', unit: 'Pack', form: 'Powder' },
      { name: 'Adhesive', unit: 'Bottle', form: 'Liquid' },
      { name: 'Base Plate', unit: 'Pack', form: 'Dental Material' },
      { name: 'Self Cure', unit: 'Bottle', form: 'Liquid/Powder' },
      { name: 'Impression Compound', unit: 'Pack', form: 'Dental Material' },
      { name: 'Dental Stone', unit: 'Kg', form: 'Powder' },
    ],
  },
  {
    category: 'Endodontics',
    type: 'MATERIAL',
    description: 'Endodontic solutions, sealers, root canal cements, and medicaments',
    items: [
      { name: 'EDTA', unit: 'Bottle', form: 'Liquid' },
      { name: 'Devitilizer', unit: 'Tube', form: 'Paste' },
      { name: 'temp filling', unit: 'Jar', form: 'Paste' },
      { name: 'MTA', unit: 'Pack', form: 'Powder' },
      { name: 'Sodium hypochlorite', unit: 'Bottle', form: 'Liquid' },
      { name: 'bioceramic sealer', unit: 'Syringe', form: 'Paste' },
      { name: 'sealer', unit: 'Tube', form: 'Paste' },
      { name: 'Depulping liquid', unit: 'Bottle', form: 'Liquid' },
      { name: 'GP Solvent', unit: 'Bottle', form: 'Liquid' },
      { name: 'plain calcium hydroxide', unit: 'Powder/Paste', form: 'Dental Material' },
      { name: 'calcium hydroxide with iodoform', unit: 'Syringe', form: 'Paste' },
      { name: 'GIC luting cement', unit: 'Kit', form: 'Powder/Liquid' },
      { name: 'multicore', unit: 'Cartridge', form: 'Dental Material' },
      { name: 'G CEM luting', unit: 'Capsule', form: 'Cement' },
      { name: 'Paper points', unit: 'Box', form: 'Consumable' },
    ],
  },
  {
    category: 'GP POINTS',
    type: 'MATERIAL',
    description: 'Gutta-percha obturation points and tapers',
    items: [
      { name: '20 -6%', unit: 'Box', form: 'Obturation Point' },
      { name: '20 -4%', unit: 'Box', form: 'Obturation Point' },
      { name: '25 -6%', unit: 'Box', form: 'Obturation Point' },
      { name: '30 -6%', unit: 'Box', form: 'Obturation Point' },
    ],
  },
  {
    category: 'ENDO FILES',
    type: 'MATERIAL',
    description: 'Hand and rotary endodontic files, broaches, and reamers',
    items: [
      { name: 'k-file #8 -21mm', unit: 'Pack', form: 'Endodontic File' },
      { name: '#10 -21mm', unit: 'Pack', form: 'Endodontic File' },
      { name: '#15 -21mm', unit: 'Pack', form: 'Endodontic File' },
      { name: '#10 -25mm', unit: 'Pack', form: 'Endodontic File' },
      { name: '#15 -25mm', unit: 'Pack', form: 'Endodontic File' },
      { name: 'Broaches', unit: 'Pack', form: 'Endodontic File' },
      { name: 'H- FILES #15- 21mm', unit: 'Pack', form: 'Endodontic File' },
      { name: '#15-25mm', unit: 'Pack', form: 'Endodontic File' },
    ],
  },
  {
    category: 'FILLING',
    type: 'MATERIAL',
    description: 'Restorative composites, bonding agents, etchants, and filling materials',
    items: [
      { name: 'Bonding agent', unit: 'Bottle', form: 'Liquid' },
      { name: 'etchent', unit: 'Syringe', form: 'Gel' },
      { name: 'applicator tip', unit: 'Pack', form: 'Consumable' },
      { name: 'mixing pad', unit: 'Pad', form: 'Consumable' },
      { name: 'amalgam', unit: 'Capsule', form: 'Capsule' },
      { name: 'G9 Filling', unit: 'Pack', form: 'Filling Material' },
      { name: 'G 7 Filling', unit: 'Pack', form: 'Filling Material' },
      { name: 'everex posterior', unit: 'Syringe', form: 'Composite' },
      { name: 'composite -Gaenial SE', unit: 'Syringe', form: 'Composite' },
      { name: 'Gaenial -A2', unit: 'Syringe', form: 'Composite' },
      { name: 'Solarex-XA1', unit: 'Syringe', form: 'Composite' },
      { name: 'Solarex-XA2', unit: 'Syringe', form: 'Composite' },
      { name: '3M filtek -A1[FILLING]', unit: 'Syringe', form: 'Composite' },
      { name: '3M Filtek-A2[FLOW]-', unit: 'Syringe', form: 'Flowable Composite' },
      { name: 'Tetric N-ceram-A2', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-ceram-A3.5', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-ceram-B2', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-ceram-A3', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-ceram-A1', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-Power fill 2 IV A', unit: 'Syringe', form: 'Composite' },
      { name: 'Tetric N-Power fill 2 IV B', unit: 'Syringe', form: 'Composite' },
      { name: 'RC CAL', unit: 'Syringe', form: 'Paste' },
    ],
  },
];

export const SUPPLIER_CATALOG: SupplierCatalogCategory[] = [
  ...MATERIAL_CATALOG,
  ...MEDICINE_CATALOG,
];

const MATERIAL_SET = new Set(MATERIAL_CATEGORY_NAMES.map((n) => n.toLowerCase()));

export const isMaterialCategory = (catName?: string): boolean => {
  if (!catName) return false;
  const name = catName.trim().toLowerCase();
  return (
    MATERIAL_SET.has(name) ||
    name.includes('material') ||
    name.includes('equipment') ||
    name.includes('file') ||
    name.includes('points')
  );
};

export const isMedicineCategory = (catName?: string): boolean => {
  if (!catName) return false;
  return !isMaterialCategory(catName);
};

export const getCatalogCategory = (catName?: string): SupplierCatalogCategory | undefined => {
  if (!catName) return undefined;
  const normalized = catName.trim().toLowerCase();
  return SUPPLIER_CATALOG.find((c) => c.category.toLowerCase() === normalized);
};

export const getCatalogItemsForCategory = (catName?: string): SupplierCatalogItem[] => {
  const found = getCatalogCategory(catName);
  return found ? found.items : [];
};
