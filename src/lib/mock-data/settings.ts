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
