export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  lastVisit?: string;
  status: 'Active' | 'Inactive';
}

export const DEMO_PATIENTS: Patient[] = [
  { id: 'PT-0001', name: 'James Wilson', phone: '+91 555-1627', age: 45, gender: 'Male', status: 'Active' },
  { id: 'PT-0002', name: 'Mary Smith', phone: '+91 555-8321', age: 34, gender: 'Female', status: 'Active' },
  { id: 'PT-0003', name: 'Robert Johnson', phone: '+91 555-4432', age: 52, gender: 'Male', status: 'Active' },
  { id: 'PT-0004', name: 'Patricia Williams', phone: '+91 555-9012', age: 28, gender: 'Female', status: 'Active' },
  { id: 'PT-0005', name: 'John Brown', phone: '+91 555-6678', age: 60, gender: 'Male', status: 'Active' }
];
