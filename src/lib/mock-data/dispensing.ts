export type DispensingStatus = 'Ready for Reception' | 'Dispensing' | 'Dispensed' | 'Cancelled';

export interface Dispensing {
  id: string;
  prescriptionId: string;
  patientId: string;
  visitId: string;
  date: string;
  status: DispensingStatus;
}

export const DEMO_DISPENSING: Dispensing[] = [
  { id: 'DIS-001', prescriptionId: 'RX-0001', patientId: 'PT-0002', visitId: 'VIS-0002', date: '2026-08-27', status: 'Ready for Reception' }
];
