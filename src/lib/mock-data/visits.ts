export interface Visit {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  status: 'Draft' | 'Completed' | 'Cancelled';
  notes?: string;
}

export const DEMO_VISITS: Visit[] = [
  { id: 'VIS-0001', patientId: 'PT-0001', doctorId: 'STF-102', date: '2026-08-27', status: 'Draft' },
  { id: 'VIS-0002', patientId: 'PT-0002', doctorId: 'STF-101', date: '2026-08-27', status: 'Completed' },
];
