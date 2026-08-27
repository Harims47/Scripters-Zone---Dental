export type ClinicRole = 'Head Doctor' | 'Duty Doctor' | 'Receptionist' | 'Assistant' | 'Surgeon'

export type ClinicModule = 
  | 'Dashboard'
  | 'Patients'
  | 'Appointments'
  | 'Queue'
  | 'Doctor Workspace'
  | 'Prescriptions'
  | 'Inventory'
  | 'Dispensing'
  | 'Payments'
  | 'Staff Management'
  | 'Settings'

export interface RoleConfig {
  role: ClinicRole
  label: string
  description: string
  permissions: ClinicModule[]
}

export const ROLE_CONFIG: Record<ClinicRole, RoleConfig> = {
  'Head Doctor': {
    role: 'Head Doctor',
    label: 'Head Doctor (Super Admin)',
    description: 'Full clinic access including staff and settings management.',
    permissions: ['Dashboard', 'Patients', 'Appointments', 'Queue', 'Doctor Workspace', 'Prescriptions', 'Inventory', 'Dispensing', 'Payments', 'Staff Management', 'Settings']
  },
  'Duty Doctor': {
    role: 'Duty Doctor',
    label: 'Duty Doctor',
    description: 'Clinical access for daily patient consultations.',
    permissions: ['Dashboard', 'Patients', 'Queue', 'Doctor Workspace', 'Prescriptions']
  },
  'Receptionist': {
    role: 'Receptionist',
    label: 'Receptionist',
    description: 'Front-desk operations, appointments, and payments.',
    permissions: ['Dashboard', 'Patients', 'Appointments', 'Queue', 'Dispensing', 'Payments']
  },
  'Assistant': {
    role: 'Assistant',
    label: 'Assistant',
    description: 'Limited access for operational assistance.',
    permissions: ['Queue', 'Inventory']
  },
  'Surgeon': {
    role: 'Surgeon',
    label: 'Surgeon',
    description: 'Access specifically for scheduled surgeries.',
    permissions: ['Appointments', 'Queue', 'Doctor Workspace', 'Prescriptions']
  }
}

// All available modules for the preview UI
export const ALL_MODULES: ClinicModule[] = [
  'Dashboard', 'Patients', 'Appointments', 'Queue', 'Doctor Workspace', 
  'Prescriptions', 'Inventory', 'Dispensing', 'Payments', 'Staff Management', 'Settings'
]
