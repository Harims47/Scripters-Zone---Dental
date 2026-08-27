export interface ClinicProfile {
  name: string
  phone: string
  email: string
  address: string
  city: string
  pin: string
  language: string
}

export const DEMO_CLINIC_PROFILE: ClinicProfile = {
  name: "DentalCore Dental Clinic",
  phone: "+91 98765 43210",
  email: "clinic@dentalcore.demo",
  address: "12 MG Road",
  city: "Bengaluru",
  pin: "560001",
  language: "English"
}

export interface AppointmentTypeConfig {
  id: string
  name: string
  description: string
  status: "Active" | "Inactive"
}

export const DEMO_APPOINTMENT_TYPES: AppointmentTypeConfig[] = [
  { id: "apt1", name: "Consultation", description: "Standard initial or general consultation.", status: "Active" },
  { id: "apt2", name: "Follow-up", description: "Brief check-up after a recent procedure.", status: "Active" },
  { id: "apt3", name: "Cleaning", description: "Routine dental scaling and cleaning.", status: "Active" },
  { id: "apt4", name: "Root Canal", description: "Endodontic therapy.", status: "Active" },
  { id: "apt5", name: "Extraction", description: "Simple or surgical tooth extraction.", status: "Active" },
  { id: "apt6", name: "Surgery", description: "Major dental surgical procedures.", status: "Active" }
]

export interface QueueSettings {
  enabled: boolean
  allowPriority: boolean
  defaultStatus: string
  maxVisible: number
}

export const DEMO_QUEUE_SETTINGS: QueueSettings = {
  enabled: true,
  allowPriority: true,
  defaultStatus: "Waiting",
  maxVisible: 50
}

export interface PaymentMethodConfig {
  id: string
  name: string
  status: "Active" | "Inactive"
}

export const DEMO_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: "pm1", name: "Cash", status: "Active" },
  { id: "pm2", name: "GPay", status: "Active" }
]
