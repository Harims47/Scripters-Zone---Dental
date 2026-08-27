import type { 
  Patient, 
  Visit, 
  QueueEntry, 
  Consultation, 
  Prescription, 
  Dispensing, 
  Payment 
} from '../../types/domain'

// Demonstration of a fully linked visit workflow
export const DEMO_CANONICAL_PATIENT: Patient = {
  id: "PT-0001",
  name: "James Wilson",
  phone: "+91 555-1627",
  age: 45,
  gender: "Male",
  status: "Active"
}

export const DEMO_CANONICAL_VISIT: Visit = {
  id: "VIS-0001",
  patientId: "PT-0001",
  doctorId: "DOC-001", // Assuming Dr. Arun
  status: "WAITING",
  amountDue: 1500,
  
  // Linkages to sub-workflows
  queueEntryId: "Q-0001",
  consultationId: "CON-0001",
  prescriptionId: "RX-0001",
  dispensingId: "DSP-0001",
  paymentId: "PAY-0001"
}

export const DEMO_CANONICAL_QUEUE: QueueEntry = {
  id: "Q-0001",
  visitId: "VIS-0001",
  patientId: "PT-0001",
  assignedDoctorId: "DOC-001",
  position: 1,
  status: "Waiting",
  priority: false,
  arrivalTime: "09:30 AM"
}

export const DEMO_CANONICAL_CONSULTATION: Consultation = {
  id: "CON-0001",
  visitId: "VIS-0001",
  doctorId: "DOC-001",
  reasonForVisit: "Routine checkup and slight pain in lower right molar.",
  clinicalNotes: "Observed mild caries on tooth 46. Patient advised to maintain oral hygiene.",
  status: "Completed"
}

export const DEMO_CANONICAL_PRESCRIPTION: Prescription = {
  id: "RX-0001",
  visitId: "VIS-0001",
  doctorId: "DOC-001",
  status: "Finalized",
  notes: "Take after meals.",
  items: [
    {
      id: "RXI-0001",
      medicineId: "MED-001", // Assuming Amoxicillin 500mg
      quantity: 10,
      instructions: "1 tablet twice daily for 5 days"
    },
    {
      id: "RXI-0002",
      medicineId: "MED-003", // Assuming Paracetamol
      quantity: 10,
      instructions: "1 tablet twice daily or as needed for pain"
    }
  ]
}

export const DEMO_CANONICAL_DISPENSING: Dispensing = {
  id: "DSP-0001",
  visitId: "VIS-0001",
  prescriptionId: "RX-0001",
  status: "Pending",
  items: [
    {
      id: "DSPI-0001",
      medicineId: "MED-001",
      prescribedQuantity: 10,
      dispensedQuantity: 10
    },
    {
      id: "DSPI-0002",
      medicineId: "MED-003",
      prescribedQuantity: 10,
      dispensedQuantity: 10
    }
  ]
}

export const DEMO_CANONICAL_PAYMENT: Payment = {
  id: "PAY-0001",
  visitId: "VIS-0001",
  amount: 1500,
  method: "Cash",
  status: "Pending"
}
