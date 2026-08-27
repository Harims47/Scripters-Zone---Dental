export interface QueueEntry {
  id: string;
  queueNumber: string;
  patientId: string;
  visitId: string;
  arrivalTime: string;
  waitTimeMin: number;
  doctorId: string;
  status: 'Waiting' | 'With Doctor' | 'Completed' | 'Cancelled';
  priority: 'Normal' | 'Urgent';
}

export const DEMO_QUEUE: QueueEntry[] = [
  { id: 'Q-001', queueNumber: '01', patientId: 'PT-0001', visitId: 'VIS-0001', arrivalTime: '08:45 AM', waitTimeMin: 45, doctorId: 'STF-102', status: 'With Doctor', priority: 'Normal' },
  { id: 'Q-002', queueNumber: '02', patientId: 'PT-0003', visitId: 'VIS-0003', arrivalTime: '09:15 AM', waitTimeMin: 15, doctorId: 'STF-103', status: 'Waiting', priority: 'Normal' },
  { id: 'Q-003', queueNumber: '03', patientId: 'PT-0004', visitId: 'VIS-0004', arrivalTime: '09:20 AM', waitTimeMin: 10, doctorId: 'STF-101', status: 'Waiting', priority: 'Urgent' },
];
