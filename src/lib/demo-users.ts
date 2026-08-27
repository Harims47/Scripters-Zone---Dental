import type { ClinicRole } from './role-config'
import { DEMO_STAFF } from './mock-data'

export interface DemoUser {
  id: string
  name: string
  role: ClinicRole
  staffId?: string // Link to a canonical staff record if applicable
}

// Derive users from the existing mock staff data where possible
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'U-001',
    name: 'Dr. Arun',
    role: 'Head Doctor',
    staffId: DEMO_STAFF.find(s => s.role === 'Head Doctor')?.id || 'DOC-001'
  },
  {
    id: 'U-002',
    name: 'Dr. Carter',
    role: 'Duty Doctor',
    staffId: DEMO_STAFF.find(s => s.role === 'Duty Doctor')?.id
  },
  {
    id: 'U-003',
    name: 'Reception User',
    role: 'Receptionist',
    staffId: DEMO_STAFF.find(s => s.role === 'Receptionist')?.id
  },
  {
    id: 'U-004',
    name: 'Assistant User',
    role: 'Assistant',
    staffId: DEMO_STAFF.find(s => s.role === 'Assistant')?.id
  },
  {
    id: 'U-005',
    name: 'Dr. Surgeon',
    role: 'Surgeon',
    staffId: DEMO_STAFF.find(s => s.role === 'Surgeon')?.id
  }
]
