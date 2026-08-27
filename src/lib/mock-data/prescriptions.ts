export interface PrescriptionItem {
  medicineId: string;
  quantity: number;
  notes?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  visitId: string;
  doctorId: string;
  date: string;
  items: PrescriptionItem[];
  status: 'Active' | 'Dispensed' | 'Cancelled';
  notes?: string;
}

export const DEMO_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'RX-0001',
    patientId: 'PT-0002',
    visitId: 'VIS-0002',
    doctorId: 'STF-101',
    date: '2026-08-27',
    status: 'Active',
    items: [
      { medicineId: 'MED-001', quantity: 15, notes: 'Take 1 after meals' },
      { medicineId: 'MED-002', quantity: 10, notes: 'SOS' }
    ],
    notes: 'Patient recovering well.'
  }
];
