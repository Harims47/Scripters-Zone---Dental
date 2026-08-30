import type { ClinicRole } from '../role-config';

export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: ClinicRole;
  status: 'Active' | 'Inactive';
}

export const DEMO_STAFF: Staff[] = [
  { id: 'STF-001', name: 'Dr. Arun', phone: '+91 98765 43210', role: 'Head Doctor', status: 'Active' },
  { id: 'STF-102', name: 'Dr. Smith', phone: '+91 98765 43211', role: 'Duty Doctor', status: 'Active' },
  { id: 'STF-103', name: 'Dr. Adams', phone: '+91 98765 43212', role: 'Duty Doctor', status: 'Active' },
  { id: 'STF-104', name: 'Dr. Lee', phone: '+91 98765 43213', role: 'Duty Doctor', status: 'Active' },
  { id: 'STF-105', name: 'Sarah Connor', phone: '+91 98765 43214', role: 'Receptionist', status: 'Active' },
  { id: 'STF-106', name: 'John Doe', phone: '+91 98765 43215', role: 'Receptionist', status: 'Active' },
  { id: 'STF-107', name: 'Emily Clark', phone: '+91 98765 43216', role: 'Receptionist', status: 'Active' },
  { id: 'STF-108', name: 'Michael Brown', phone: '+91 98765 43217', role: 'Receptionist', status: 'Active' },
  { id: 'STF-109', name: 'Jessica Davis', phone: '+91 98765 43218', role: 'Receptionist', status: 'Active' },
  { id: 'STF-110', name: 'David Wilson', phone: '+91 98765 43219', role: 'Receptionist', status: 'Active' },
  { id: 'STF-111', name: 'Dr. Carter', phone: '+91 98765 43220', role: 'Duty Doctor', status: 'Active' }
];

export const DEMO_PROVIDERS = DEMO_STAFF.filter(s => 
  s.role === 'Head Doctor' || s.role === 'Duty Doctor'
);
