export type AppointmentType = 'Consultation' | 'Surgery' | 'Follow-up';
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  date: string;
  time: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
}

export const DEMO_APPOINTMENTS: Appointment[] = [
  { id: 'APT-1001', patientId: 'PT-0001', providerId: 'STF-101', date: '2026-08-28', time: '10:30 AM', type: 'Consultation', status: 'Scheduled', notes: 'Routine checkup.' },
  { id: 'APT-1002', patientId: 'PT-0002', providerId: 'STF-111', date: '2026-08-28', time: '11:15 AM', type: 'Surgery', status: 'Confirmed', notes: 'Root canal procedure.' },
  { id: 'APT-1003', patientId: 'PT-0003', providerId: 'STF-102', date: '2026-08-27', time: '09:00 AM', type: 'Follow-up', status: 'Completed', notes: 'Reviewing healing.' }
];
