import React, { createContext, useContext, useState } from 'react'
import type { Patient, Visit, QueueEntry, Consultation, Prescription, Dispensing, Payment } from '../types/domain'
import {
  DEMO_MEDICINES,
  type Medicine,
  type Appointment
} from '../lib/mock-data'
import { canTransitionVisit, type VisitStatus } from '../lib/visit-status'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface ClinicContextType {
  patients: Patient[]
  appointments: Appointment[]
  visits: Visit[]
  queue: QueueEntry[]
  consultations: Consultation[]
  prescriptions: Prescription[]
  dispensings: Dispensing[]
  payments: Payment[]
  medicines: Medicine[]

  addPatient: (patient: Omit<Patient, 'id'>) => Patient
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void
  updateAppointment: (appointment: Partial<Appointment>) => void
  confirmAppointmentArrival: (appointmentId: string) => { success: boolean, visitId?: string, error?: string }
  startVisit: (patientId: string, doctorId: string, isUrgent?: boolean, reasonForVisit?: string) => { visit: Visit, queueEntry: QueueEntry }
  normalizePhone: (phone: string) => string

  // Phase 0P.3 Transitions
  callPatient: (visitId: string) => boolean
  startConsultationFlow: (visitId: string) => boolean
  saveConsultation: (visitId: string, doctorId: string, data: { reasonForVisit: string, clinicalNotes: string, consultationFee?: number }, isComplete?: boolean) => boolean
  savePrescription: (prescription: Omit<Prescription, 'id'>) => void

  // Phase 0P.5
  completeDispensing: (visitId: string, prescriptionId: string, items: { medicineId: string, prescribedQuantity: number, dispensedQuantity: number }[]) => { success: boolean, error?: string }

  // Phase 0P.6
  recordPayment: (visitId: string, method: 'Cash' | 'GPay') => { success: boolean, error?: string }
}

const ClinicContext = createContext<ClinicContextType | null>(null)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useLocalStorage<Patient[]>('dc_v2_patients', [])
  const [appointments, setAppointments] = useLocalStorage<Appointment[]>('dc_v2_appointments', [])
  const [visits, setVisits] = useLocalStorage<Visit[]>('dc_v2_visits', [])
  const [queue, setQueue] = useLocalStorage<QueueEntry[]>('dc_v2_queue', [])
  const [consultations, setConsultations] = useLocalStorage<Consultation[]>('dc_v2_consultations', [])
  const [prescriptions, setPrescriptions] = useLocalStorage<Prescription[]>('dc_v2_prescriptions', [])
  const [dispensings, setDispensings] = useLocalStorage<Dispensing[]>('dc_v2_dispensings', [])
  const [payments, setPayments] = useLocalStorage<Payment[]>('dc_v2_payments', [])
  
  const [medicines, setMedicines] = useState<Medicine[]>(DEMO_MEDICINES.map(m => ({ ...m })))

  const normalizePhone = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '')
  }

  const addPatient = (patientData: Omit<Patient, 'id'>) => {
    const newId = `PT-${String(patients.length + 1).padStart(4, '0')}`
    const newPatient: Patient = {
      ...patientData,
      id: newId
    }
    setPatients(prev => [...prev, newPatient])
    return newPatient
  }

  const addAppointment = (appointmentData: Omit<Appointment, 'id'>) => {
    const newId = `APT-${String(appointments.length + 1000).padStart(4, '0')}`
    setAppointments(prev => [{ ...appointmentData, id: newId }, ...prev])
  }

  const updateAppointment = (appointmentData: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === appointmentData.id ? { ...a, ...appointmentData } as Appointment : a))
  }

  const confirmAppointmentArrival = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId)
    if (!appointment) return { success: false, error: 'Appointment not found.' }
    if (appointment.status === 'Cancelled' || appointment.status === 'No Show') {
      return { success: false, error: 'Cannot confirm arrival for a cancelled or no-show appointment.' }
    }

    // Check if a visit already exists for this appointment
    const existingVisit = visits.find(v => v.appointmentId === appointmentId)
    if (existingVisit) {
      return { success: false, error: 'A visit has already been created for this appointment.', visitId: existingVisit.id }
    }

    // Existing active visit protection
    const activeVisit = visits.find(v => v.patientId === appointment.patientId && !['COMPLETED', 'CANCELLED'].includes(v.status))
    if (activeVisit) {
      return { success: false, error: 'This patient already has an active visit.' }
    }

    const newVisitId = `VIS-${String(visits.length + 1000).padStart(4, '0')}`
    const newQueueId = `Q-${String(queue.length + 1000).padStart(4, '0')}`

    const newVisit: Visit = {
      id: newVisitId,
      patientId: appointment.patientId,
      doctorId: appointment.providerId, // inherit doctor
      appointmentId: appointment.id,
      status: 'WAITING',
      amountDue: 1500, // standard mock amount
      queueEntryId: newQueueId
    }

    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newQueueEntry: QueueEntry = {
      id: newQueueId,
      visitId: newVisitId,
      patientId: appointment.patientId,
      assignedDoctorId: appointment.providerId,
      position: queue.length + 1,
      status: 'Waiting',
      priority: false,
      arrivalTime: timeString
    }

    setVisits(prev => [...prev, newVisit])
    setQueue(prev => [...prev, newQueueEntry])
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'Checked In' } : a))

    return { success: true, visitId: newVisitId }
  }

  const startVisit = (patientId: string, doctorId: string, isUrgent = false, reasonForVisit?: string) => {
    const newVisitId = `VIS-${String(visits.length + 1000).padStart(4, '0')}`
    const newQueueId = `Q-${String(queue.length + 1000).padStart(4, '0')}`

    const newVisit: Visit = {
      id: newVisitId,
      patientId,
      doctorId,
      status: 'WAITING',
      reasonForVisit,
      amountDue: 1500, // Mock billing amount Phase 0P.6
      queueEntryId: newQueueId
    }

    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newQueueEntry: QueueEntry = {
      id: newQueueId,
      visitId: newVisitId,
      patientId,
      assignedDoctorId: doctorId,
      position: queue.length + 1,
      status: 'Waiting',
      priority: isUrgent,
      arrivalTime: timeString
    }

    setVisits(prev => [...prev, newVisit])
    setQueue(prev => [...prev, newQueueEntry])

    return { visit: newVisit, queueEntry: newQueueEntry }
  }

  // --- Phase 0P.3 Handlers ---

  const transitionVisitSafely = (visitId: string, targetStatus: VisitStatus, queueStatusMap?: QueueEntry['status']): boolean => {
    const v = visits.find(v => v.id === visitId)
    if (!v) return false;

    if (canTransitionVisit(v.status, targetStatus)) {
      setVisits(prev => prev.map(visit => visit.id === visitId ? { ...visit, status: targetStatus } : visit))
      if (queueStatusMap) {
        setQueue(prev => prev.map(q => q.visitId === visitId ? { ...q, status: queueStatusMap } : q))
      }
      return true;
    } else {
      console.warn(`Invalid visit transition: ${v.status} -> ${targetStatus}`)
      return false;
    }
  }

  const callPatient = (visitId: string) => {
    return transitionVisitSafely(visitId, 'CALLED', 'Called')
  }

  const startConsultationFlow = (visitId: string) => {
    return transitionVisitSafely(visitId, 'WITH_DOCTOR', 'In Progress')
  }

  const saveConsultation = (visitId: string, doctorId: string, data: { reasonForVisit: string, clinicalNotes: string, consultationFee?: number }, isComplete = false) => {
    let success = false;

    if (isComplete) {
      const transitioned = transitionVisitSafely(visitId, 'READY_FOR_RECEPTION', 'Completed')
      if (!transitioned) return false;
      success = true;
    } else {
      success = true; // Drafting doesn't change visit status
    }

    if (success) {
      setConsultations(prev => {
        const existing = prev.find(c => c.visitId === visitId)
        if (existing) {
          return prev.map(c => c.visitId === visitId ? {
            ...c,
            ...data,
            consultationFee: data.consultationFee || 0,
            status: isComplete ? 'Completed' : 'In Progress'
          } : c)
        } else {
          const newId = `CON-${String(prev.length + 1000).padStart(4, '0')}`
          return [...prev, {
            id: newId,
            visitId,
            doctorId,
            ...data,
            consultationFee: data.consultationFee || 0,
            status: isComplete ? 'Completed' : 'In Progress'
          }]
        }
      })
      // Link consultation ID and update fee to visit if not already linked
      setVisits(prev => prev.map(v => {
        if (v.id === visitId) {
          let updated = { ...v }
          if (!v.consultationId) {
            const newId = `CON-${String(consultations.length + 1000).padStart(4, '0')}` // Naive generation fallback
            updated.consultationId = newId
          }
          if (data.consultationFee !== undefined) {
            updated.consultationFee = data.consultationFee
            updated.amountDue = (data.consultationFee || 0) + (updated.medicineCost || 0)
          }
          return updated
        }
        return v
      }))
    }

    return success;
  }

  const savePrescription = (prescriptionData: Omit<Prescription, 'id'>) => {
    setPrescriptions(prev => {
      const existing = prev.find(p => p.visitId === prescriptionData.visitId)
      if (existing) {
        return prev.map(p => p.visitId === prescriptionData.visitId ? { ...p, ...prescriptionData } : p)
      } else {
        const newId = `RX-${String(prev.length + 1000).padStart(4, '0')}`
        // Also update Visit with prescription ID
        setVisits(visits => visits.map(v => v.id === prescriptionData.visitId ? { ...v, prescriptionId: newId } : v))
        return [...prev, { ...prescriptionData, id: newId }]
      }
    })
  }

  const completeDispensing = (visitId: string, prescriptionId: string, items: { medicineId: string, prescribedQuantity: number, dispensedQuantity: number }[]) => {
    // 1. Duplicate check
    const existing = dispensings.find(d => d.visitId === visitId && d.prescriptionId === prescriptionId)
    if (existing) {
      return { success: false, error: 'Dispensing already completed for this visit.' }
    }

    // 2. Validate all quantities atomically against context medicines
    for (const item of items) {
      if (item.dispensedQuantity < 0) return { success: false, error: 'Dispensed quantity cannot be negative.' }
      if (item.dispensedQuantity > item.prescribedQuantity) return { success: false, error: 'Dispensed quantity cannot exceed prescribed quantity.' }
      const med = medicines.find(m => m.id === item.medicineId)
      if (!med) return { success: false, error: `Medicine ${item.medicineId} not found.` }
      if (item.dispensedQuantity > med.currentStock) {
        return { success: false, error: `Insufficient stock for ${med.name}. Requested: ${item.dispensedQuantity}, Available: ${med.currentStock}.` }
      }
    }

    // 3. Stock deduction
    setMedicines(prev => prev.map(med => {
      const dispItem = items.find(i => i.medicineId === med.id)
      if (dispItem) {
        return { ...med, currentStock: med.currentStock - dispItem.dispensedQuantity }
      }
      return med
    }))

    // 4. Create Dispensing record
    const newId = `DSP-${String(dispensings.length + 1000).padStart(4, '0')}`
    const newRecord: Dispensing = {
      id: newId,
      visitId,
      prescriptionId,
      status: 'Completed',
      items: items.map((it, idx) => ({ id: `DITEM-${newId}-${idx}`, ...it }))
    }
    setDispensings(prev => [...prev, newRecord])

    // Calculate medicine cost
    let medicineCost = 0;
    for (const item of items) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (med && med.unitPrice) {
        medicineCost += (item.dispensedQuantity * med.unitPrice);
      }
    }

    // 5. Transition Visit and update cost
    setVisits(prev => prev.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          medicineCost,
          amountDue: (v.consultationFee || 0) + medicineCost
        }
      }
      return v
    }))
    transitionVisitSafely(visitId, 'READY_FOR_PAYMENT')

    return { success: true }
  }

  const recordPayment = (visitId: string, method: 'Cash' | 'GPay') => {
    const visit = visits.find(v => v.id === visitId)
    if (!visit) return { success: false, error: 'Visit not found.' }

    if (visit.status !== 'READY_FOR_PAYMENT') {
      return { success: false, error: 'Visit is not ready for payment.' }
    }

    const existing = payments.find(p => p.visitId === visitId)
    if (existing) {
      return { success: false, error: 'Payment already recorded for this visit.' }
    }

    const newId = `PAY-${String(payments.length + 1000).padStart(4, '0')}`

    const newPayment: Payment = {
      id: newId,
      visitId,
      amount: visit.amountDue,
      method,
      status: 'Paid'
    }

    setPayments(prev => [...prev, newPayment])

    // Transition 1: READY_FOR_PAYMENT -> PAID
    transitionVisitSafely(visitId, 'PAID')
    // Transition 2: PAID -> COMPLETED
    transitionVisitSafely(visitId, 'COMPLETED')

    return { success: true }
  }

  return (
    <ClinicContext.Provider value={{
      patients, appointments, visits, queue, consultations, prescriptions, dispensings, payments, medicines,
      addPatient, addAppointment, updateAppointment, confirmAppointmentArrival, startVisit, normalizePhone,
      callPatient, startConsultationFlow, saveConsultation, savePrescription, completeDispensing, recordPayment
    }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinicContext() {
  const context = useContext(ClinicContext)
  if (!context) {
    throw new Error('useClinicContext must be used within a ClinicProvider')
  }
  return context
}
