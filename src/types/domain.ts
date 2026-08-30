import type { VisitStatus } from '../lib/visit-status'

export interface Patient {
  id: string
  name: string
  phone: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  status: 'Active' | 'Inactive'
  photoUrl?: string
  // Notice: No visit-specific state (like queue status or current doctor)
}

export interface Appointment {
  id: string
  patientId: string
  providerId: string
  date: string // e.g. "2026-08-27"
  time: string // e.g. "10:30 AM"
  type: 'Consultation' | 'Surgery' | 'Follow-up' | 'Routine Checkup' | 'Emergency'
  status: 'Scheduled' | 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show'
  notes?: string
  photoUrl?: string // Optional capture during appointment booking
}

export interface Visit {
  id: string
  patientId: string
  doctorId: string // The primary provider handling this visit
  appointmentId?: string // Optional, as patients can be walk-ins
  status: VisitStatus
  amountDue: number
  consultationFee?: number
  medicineCost?: number
  reasonForVisit?: string
  
  // Workflow linkages (populated as the visit progresses)
  queueEntryId?: string
  consultationId?: string
  prescriptionId?: string
  dispensingId?: string
  paymentId?: string
}

export interface QueueEntry {
  id: string
  visitId: string
  patientId: string // Denormalized for easy display
  assignedDoctorId: string
  position: number
  status: 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Skipped'
  priority: boolean
  arrivalTime: string // e.g. ISO string or "10:00 AM"
}

export interface Consultation {
  id: string
  visitId: string
  doctorId: string
  reasonForVisit: string
  clinicalNotes: string
  consultationFee: number
  status: 'In Progress' | 'Completed'
}

export interface PrescriptionItem {
  id: string
  medicineId: string
  quantity: number
  dosage?: string
  frequency?: string
  duration?: string
  instructions: string
}

export interface Prescription {
  id: string
  visitId: string
  doctorId: string
  status: 'Draft' | 'Finalized' | 'Dispensed'
  notes: string
  items: PrescriptionItem[]
}

export interface DispensingItem {
  id: string
  medicineId: string
  prescribedQuantity: number
  dispensedQuantity: number
}

export interface Dispensing {
  id: string
  visitId: string
  prescriptionId: string
  status: 'Pending' | 'Partial' | 'Completed'
  items: DispensingItem[]
}

export interface Payment {
  id: string
  visitId: string
  amount: number
  method: 'Cash' | 'GPay'
  status: 'Pending' | 'Paid'
  // Strictly no card, gateway, partial payments, installments, or transaction IDs.
}

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

