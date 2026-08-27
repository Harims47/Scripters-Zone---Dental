export type PaymentMethod = 'Cash' | 'GPay';
export type PaymentStatus = 'Pending' | 'Paid';

export interface Payment {
  id: string;
  patientId: string;
  visitId: string;
  prescriptionId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  collectedBy?: string; // staff ID
}

export const DEMO_PAYMENTS: Payment[] = [
  { id: 'PAY-001', patientId: 'PT-0002', visitId: 'VIS-0002', prescriptionId: 'RX-0001', amount: 450, method: 'GPay', status: 'Pending' }
];
