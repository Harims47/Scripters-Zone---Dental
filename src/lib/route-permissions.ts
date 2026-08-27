import { ROLE_CONFIG } from './role-config'
import type { ClinicRole, ClinicModule } from './role-config'

// Mapping routes to required modules according to the UI flow
// This directly maps a URL path prefix to the Clinical Module permission it requires.
export const ROUTE_MODULE_MAP: Record<string, ClinicModule> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/queue': 'Queue',
  '/doctor': 'Doctor Workspace', // Matches /doctor/patient/:id
  '/prescriptions': 'Prescriptions',
  '/inventory': 'Inventory',
  '/reception/dispensing': 'Dispensing',
  '/payments': 'Payments',
  '/staff': 'Staff Management',
  '/settings': 'Settings'
}

/**
 * Checks if a role is permitted to access a given URL path based on ROLE_CONFIG.
 */
export function canAccessRoute(role: ClinicRole, path: string): boolean {
  const config = ROLE_CONFIG[role]
  if (!config) return false

  // Find the matching module for the path
  const matchingKey = Object.keys(ROUTE_MODULE_MAP).find(prefix => path.startsWith(prefix))
  
  // If the path doesn't map to a specific module, allow access (e.g. /login, /unauthorized)
  if (!matchingKey) return true 
  
  const requiredModule = ROUTE_MODULE_MAP[matchingKey]
  return config.permissions.includes(requiredModule)
}
