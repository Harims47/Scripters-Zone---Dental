import type { VisitStatus } from '../lib/visit-status'

export interface Patient {
  id: string
  name: string
  phone: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  status: 'Active' | 'Inactive'
  photoUrl?: string
  address?: string
  email?: string
  preferredCommunicationChannel?: 'AUTO' | 'WHATSAPP' | 'SMS' | 'EMAIL'
  whatsappAvailable?: boolean | null
  createdAt?: string
  updatedAt?: string
  // Notice: No visit-specific state (like queue status or current doctor)
}

export interface Appointment {
  id: string
  patientId: string
  providerId?: string
  date: string // e.g. "2026-08-27"
  time: string // e.g. "10:30 AM"
  type: 'Consultation' | 'Surgery' | 'Follow-up' | 'Routine Checkup' | 'Emergency' | 'Toothache' | 'Cleaning'
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
  treatmentFee?: number
  medicineCost?: number
  discount?: number
  discountReason?: string | null
  reasonForVisit?: string
  paymentOwner?: 'RECEPTION' | 'DOCTOR'
  
  // Workflow linkages (populated as the visit progresses)
  queueEntryId?: string
  consultationId?: string
  prescriptionId?: string
  dispensingId?: string
  paymentId?: string
  createdAt?: string
  updatedAt?: string
}

export interface QueueEntry {
  id: string
  visitId: string
  patientId: string // Denormalized for easy display
  assignedDoctorId: string
  position: number
  status: 'Waiting' | 'Called' | 'In Progress' | 'With Doctor' | 'Completed' | 'Skipped' | 'Transferred' | 'Cancelled' | 'Ready at Reception' | 'Dispensing' | 'Payment'
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
  treatmentFee?: number
  consultationWaiverReason?: string | null
  treatmentWaiverReason?: string | null
  status: 'In Progress' | 'Completed'
}

export interface PrescriptionItem {
  id?: string
  medicineId: string
  quantity: number
  dosage?: string
  frequency?: string
  duration?: string
  instructions: string
  medicine?: { id: string; name: string; unit?: string; form?: string }
}

export interface Prescription {
  id: string
  visitId: string
  doctorId: string
  status?: 'Draft' | 'Finalized' | 'Dispensed'
  notes?: string
  createdAt?: string
  items: PrescriptionItem[]
}

export interface DispensingItem {
  id: string
  medicineId: string
  prescribedQuantity: number
  dispensedQuantity: number
  medicine?: { id: string; name: string; unit?: string; form?: string }
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
  patientId?: string
  amount: number
  method: 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card'
  status: string
  notes?: string | null
  date: string
  createdAt: string
  updatedAt?: string
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

export interface TreatmentCatalog {
  id: string
  category: string
  name: string
  variant: string | null
  isActive: boolean
}

export interface TreatmentSession {
  id: string;
  treatmentPlanItemId: string;
  sittingNumber: number;
  stage?: string | null;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  plannedDate?: string | null;
  actualDate?: string | null;
  visitId?: string | null;
  doctorId?: string | null;
  doctor?: { id: string; name: string; role: string } | null;
  clinicalNotes?: string | null;
  workPerformed?: string | null;
  materialsUsed?: string | null;
  nextSittingDate?: string | null;
  followUpInstructions?: string | null;
  fee?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  treatmentCatalogId: string;
  toothNumber?: number | null;
  status: 'Planned' | 'In Progress' | 'Completed';
  notes: string | null;
  totalSittings: number;
  completedVisitId: string | null;
  completedAt: string | null;
  catalogItem?: TreatmentCatalog;
  sessions?: TreatmentSession[];
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  items: TreatmentPlanItem[];
}

export type DentalImageType = 'OPG' | 'RVG';

export interface DentalImage {
  id: string;
  patientId: string;
  visitId?: string | null;
  toothNumber?: number | null;
  type: DentalImageType;
  title?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  imageUrl: string;
  notes?: string | null;
  uploadedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineCategory {
  id: string;
  name: string;
  description?: string | null;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  _count?: {
    medicines: number;
  };
}

export interface Supplier {
  id: string
  name: string
  contactPerson?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  status: 'Active' | 'Inactive'
  createdAt: string
  updatedAt?: string
  categories?: MedicineCategory[]
  _count?: {
    purchaseOrders: number
    bills?: number
    categories?: number
  }
  financials?: {
    totalBills: number
    totalBilled: number
    totalPaid: number
    outstandingBalance: number
  }
}

export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  medicineId: string
  orderedQuantity: number
  receivedQuantity: number
  unitCost: number
  createdAt: string
  updatedAt?: string
  medicine?: {
    id: string
    name: string
    unit: string
    currentStock: number
    form?: string
    unitPrice?: number
    category?: {
      id?: string
      name?: string
    }
  }
}

export type SupplierBillStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled'

export interface SupplierPayment {
  id: string
  supplierBillId: string
  amount: number
  method: 'Cash' | 'Bank Transfer' | 'UPI'
  notes?: string | null
  date: string
  createdAt: string
  updatedAt?: string
}

export interface SupplierBill {
  id: string
  supplierId: string
  purchaseOrderId?: string | null
  invoiceNumber: string
  invoiceDate: string
  amount: number
  billImageUrl?: string | null
  totalPaid?: number
  balance?: number
  notes?: string | null
  status: SupplierBillStatus
  createdAt: string
  updatedAt?: string
  supplier?: Supplier
  purchaseOrder?: PurchaseOrder
  payments?: SupplierPayment[]
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  orderDate: string
  status: PurchaseOrderStatus
  notes?: string | null
  createdAt: string
  updatedAt?: string
  supplier?: Supplier
  items: PurchaseOrderItem[]
  bills?: SupplierBill[]
}

export interface StockMovement {
  id: string
  medicineId: string
  movementType: 'PURCHASE_RECEIPT' | 'DISPENSING' | 'ADJUSTMENT'
  quantity: number
  balanceAfter: number
  referenceType?: string | null
  referenceId?: string | null
  reason?: string | null
  performedBy?: string | null
  createdAt: string
}

export interface HistoricalVisitFinancialSummary {
  amountDue: number
  totalPaid: number
  balance: number
  status: 'Paid' | 'Partial' | 'Unpaid'
  consultationFee: number
  treatmentFee: number
  medicineCost: number
}

export interface HistoricalVisit extends Visit {
  createdAt: string
  updatedAt?: string
  doctor: { id: string; name: string; role: string } | null
  appointment?: Appointment | null
  consultation?: Consultation | null
  prescription?: (Prescription & {
    items: Array<PrescriptionItem & {
      medicine?: { id: string; name: string; unit?: string; form?: string }
    }>
  }) | null
  dispensing?: (Dispensing & {
    items: Array<DispensingItem & {
      medicine?: { id: string; name: string; unit?: string; form?: string }
    }>
  }) | null
  completedTreatmentItems?: Array<TreatmentPlanItem & {
    catalogItem?: TreatmentCatalog
  }>
  treatmentSessions?: Array<TreatmentSession & {
    treatmentPlanItem?: TreatmentPlanItem & { catalogItem?: TreatmentCatalog }
    doctor?: { id: string; name: string; role: string } | null
  }>
  payments: Payment[]
  financialSummary: HistoricalVisitFinancialSummary
  dentalImages?: DentalImage[]
}

export interface PatientHistoryData {
  patient: Patient & { dentalImages?: DentalImage[] }
  treatmentPlan: (TreatmentPlan & {
    items: Array<TreatmentPlanItem & {
      catalogItem?: TreatmentCatalog
      completedVisit?: Visit
    }>
  }) | null
  visits: HistoricalVisit[]
  dentalImages?: DentalImage[]
}

export interface ExternalDoctorAdvice {
  id: string
  visitId: string
  patientId: string
  doctorId?: string | null
  doctorName: string
  doctorEmail: string
  doctorPhone?: string | null
  speciality: string
  hospitalClinic?: string | null
  medicalCondition: string
  plannedProcedure: string
  clinicalQuery: string
  status: 'PENDING' | 'CLEARED' | 'CLEARED_WITH_PRECAUTIONS' | 'CONTRAINDICATED'
  doctorResponse?: string | null
  emailSent: boolean
  emailSentAt?: string | null
  createdAt: string
  updatedAt: string
}

