import React, { createContext, useContext } from 'react'
import type { Patient, Visit, QueueEntry, Consultation, Prescription, Dispensing, Payment } from '../types/domain'
import {
  type Medicine,
  type Appointment
} from '../lib/mock-data'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

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
  staff: any[]
  
  addPatient: (patientData: Omit<Patient, 'id'>) => Promise<Patient>
  updatePatient?: (id: string, updates: Partial<Patient>) => Promise<void>
  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<Appointment>
  updateAppointment: (appointment: Partial<Appointment>) => Promise<void>
  confirmAppointmentArrival: (appointmentId: string) => Promise<{ success: boolean, visitId?: string, error?: string }>
  startVisit: (patientId: string, doctorId?: string, isUrgent?: boolean, reasonForVisit?: string) => Promise<{ visit: Visit, queueEntry: QueueEntry }>
  cancelVisit: (visitId: string) => Promise<{ success: boolean, error?: string }>
  assignDoctor: (queueId: string, doctorId: string) => Promise<{ success: boolean, error?: string }>
  normalizePhone: (phone: string) => string

  // Phase 0P.3 Transitions
  callPatient: (visitId: string) => Promise<boolean>
  startConsultationFlow: (visitId: string) => Promise<boolean>
  saveConsultation: (visitId: string, data: { reasonForVisit: string, clinicalNotes: string, consultationFee?: number, treatmentFee?: number }, isComplete?: boolean) => Promise<{ success: boolean, error?: string }>
  savePrescription: (prescription: Omit<Prescription, 'id'>) => Promise<{ success: boolean, error?: string }>

  // Phase 0P.5
  completeDispensing: (visitId: string, prescriptionId: string, items: { medicineId: string, prescribedQuantity: number, dispensedQuantity: number }[]) => Promise<{ success: boolean, error?: string }>
  recordPayment: (visitId: string, amount: number, method: 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card', notes?: string, isFinalPayment?: boolean) => Promise<{ success: boolean, error?: string }>
  adjustMedicineStock: (id: string, adjustmentAmount: number) => Promise<{ success: boolean, error?: string, medicine?: Medicine }>
}

const ClinicContext = createContext<ClinicContextType | null>(null)

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [visits, setVisits] = React.useState<Visit[]>([])
  const [queue, setQueue] = React.useState<QueueEntry[]>([])
  const [consultations, setConsultations] = React.useState<Consultation[]>([])
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([])

  React.useEffect(() => {
    if (isAuthenticated) {
      api.get<Patient[]>('/api/patients').then(res => setPatients((res as any).data || res)).catch(console.error)
      api.get<Appointment[]>('/api/appointments').then(res => setAppointments((res as any).data || res)).catch(console.error)
      api.get<any[]>('/api/visits').then(res => {
        const visitsData = (res as any).data || res;
        setVisits(visitsData)
        
        const allConsultations: Consultation[] = []
        const allPrescriptions: Prescription[] = []
        const allDispensings: Dispensing[] = []
        
        visitsData.forEach((v: any) => {
          if (v.consultation) allConsultations.push(v.consultation)
          if (v.prescription) allPrescriptions.push(v.prescription)
          if (v.dispensing) allDispensings.push(v.dispensing)
        })
        
        setConsultations(allConsultations)
        setPrescriptions(allPrescriptions)
        setDispensings(allDispensings)
      }).catch(console.error)
      api.get<QueueEntry[]>('/api/queue').then(res => setQueue((res as any).data || res)).catch(console.error)
      api.get<any>('/api/staff?limit=100').then(res => {
        setStaff(res.data?.data || res.data || res)
      }).catch(console.error)
    } else {
      setPatients([])
      setAppointments([])
      setVisits([])
      setQueue([])
      setConsultations([])
      setPrescriptions([])
      setDispensings([])
    }
  }, [isAuthenticated])

  const [dispensings, setDispensings] = React.useState<Dispensing[]>([])
  const [payments, setPayments] = React.useState<Payment[]>([])
  
  const [medicines, setMedicines] = React.useState<Medicine[]>([])
  const [staff, setStaff] = React.useState<any[]>([])

  React.useEffect(() => {
    if (isAuthenticated) {
      api.get<{ data: Medicine[] }>('/api/inventory').then(res => setMedicines(res.data || (res as any))).catch(console.error)
      api.get<Payment[]>('/api/payments').then(res => setPayments((res as any).data || res)).catch(console.error)
      api.get<any>('/api/staff?limit=100').then(res => {
        setStaff(res.data?.data || res.data || res)
      }).catch(console.error)
    } else {
      setMedicines([])
      setPayments([])
      setStaff([])
    }
  }, [isAuthenticated])

  // Remove old LocalStorage for migrated domains
  React.useEffect(() => {
    localStorage.removeItem('dc_v2_patients')
    localStorage.removeItem('dc_v2_appointments')
    localStorage.removeItem('dc_v2_visits')
    localStorage.removeItem('dc_v2_queue')
    localStorage.removeItem('dc_v2_consultations')
    localStorage.removeItem('dc_v2_prescriptions')
    localStorage.removeItem('dc_v2_medicines')
    localStorage.removeItem('dc_v2_dispensings')
    localStorage.removeItem('dc_v2_payments')
  }, [])

  const normalizePhone = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '')
  }

  const addPatient = async (patientData: Omit<Patient, 'id'>) => {
    const res = await api.post<Patient>('/api/patients', patientData)
    const patient = (res as any).data || res;
    setPatients(prev => [...prev, patient])
    return patient
  }

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    const res = await api.patch<Patient>(`/api/patients/${id}`, updates)
    const patient = (res as any).data || res;
    setPatients(prev => prev.map(p => p.id === id ? patient : p))
  }

  const addAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    const res = await api.post<Appointment>('/api/appointments', appointmentData)
    const appointment = (res as any).data || res;
    setAppointments(prev => [appointment, ...prev])
    return appointment
  }

  const updateAppointment = async (appointmentData: Partial<Appointment>) => {
    const res = await api.patch<Appointment>(`/api/appointments/${appointmentData.id}`, appointmentData)
    const appointment = (res as any).data || res;
    setAppointments(prev => prev.map(a => a.id === appointmentData.id ? appointment : a))
  }

  const confirmAppointmentArrival = async (appointmentId: string) => {
    // Try to find locally first, but don't fail immediately if not found because 
    // it might have just been created in the same render cycle
    const appointment = appointments.find(a => a.id === appointmentId)
    if (appointment && (appointment.status === 'Cancelled' || appointment.status === 'No Show')) {
      return { success: false, error: 'Cannot confirm arrival for a cancelled or no-show appointment.' }
    }

    // Phase 3.2: Complete the check-in transaction via backend
    const res = await api.post<{ data: { visit: Visit, queueEntry: QueueEntry } }>('/api/visits/check-in', { appointmentId })
    
    // Refetch queue and visits to maintain full context, or append directly
    const data = (res as any).data || res;
    // The backend returns the visit object with queueEntry nested inside it
    const visitObj = data;
    const queueEntryObj = visitObj.queueEntry;
    
    setVisits(prev => [visitObj, ...prev])
    if (queueEntryObj) {
      setQueue(prev => [...prev, queueEntryObj])
    }
    
    // Status update is bundled in the backend transaction, update local appt state
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'Checked In' } as Appointment : a))
    
    return { success: true, visitId: visitObj.id }
  }

  const startVisit = async (patientId: string, doctorId?: string, isUrgent = false, reasonForVisit?: string) => {
    const res = await api.post<Visit & { queueEntry: QueueEntry }>('/api/visits/walk-in', {
      patientId, doctorId, isUrgent, reasonForVisit
    })
    
    const data = (res as any).data || res;

    const newVisit = { ...data, queueEntry: undefined } // Backend includes queueEntry inside visit response
    const newQueueEntry = data.queueEntry

    setVisits(prev => [newVisit as unknown as Visit, ...prev])
    if (newQueueEntry) {
      setQueue(prev => [...prev, newQueueEntry])
    }

    return { visit: newVisit as unknown as Visit, queueEntry: newQueueEntry as QueueEntry }
  }

  const cancelVisit = async (visitId: string) => {
    try {
      const response = await api.patch(`/api/visits/${visitId}/cancel`);
      const updatedVisit = (response as any).data || response;
      if (updatedVisit && updatedVisit.id) {
        setVisits(prev => prev.map(v => v.id === visitId ? updatedVisit : v));
        if (updatedVisit.queueEntry) {
          setQueue(prev => prev.map(q => q.visitId === visitId ? updatedVisit.queueEntry : q));
        }
        return { success: true };
      }
      return { success: false, error: 'Failed to cancel visit' };
    } catch (err: any) {
      console.error('Failed to cancel visit:', err);
      return { success: false, error: err.response?.data?.error || err.message || 'Error cancelling visit' };
    }
  }

  const assignDoctor = async (queueId: string, doctorId: string) => {
    try {
      const res = await api.patch<{ data: { queueEntry: QueueEntry, visit: Visit } }>(`/api/queue/${queueId}/assign`, {
        doctorId
      })
      const data = (res as any).data || res;
      setVisits(prev => prev.map(v => v.id === data.visit.id ? data.visit : v))
      setQueue(prev => prev.map(queueEntry => queueEntry.id === queueId ? data.queueEntry : queueEntry))
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to assign doctor' }
    }
  }

  // --- Phase 0P.3 Handlers ---
  const callPatient = async (visitId: string) => {
    const q = queue.find(q => q.visitId === visitId)
    if (!q) return false;

    const res = await api.patch<{ data: { queueEntry: QueueEntry, visit: Visit } }>(`/api/queue/${q.id}/transition`, {
      action: 'CALL_PATIENT'
    })
    
    const data = (res as any).data || res;
    setVisits(prev => prev.map(v => v.id === visitId ? data.visit : v))
    setQueue(prev => prev.map(queueEntry => queueEntry.id === q.id ? data.queueEntry : queueEntry))
    return true
  }

  const startConsultationFlow = async (visitId: string) => {
    const q = queue.find(q => q.visitId === visitId)
    if (!q) return false;

    const res = await api.patch<{ data: { queueEntry: QueueEntry, visit: Visit } }>(`/api/queue/${q.id}/transition`, {
      action: 'START_CONSULTATION'
    })
    
    const data = (res as any).data || res;
    setVisits(prev => prev.map(v => v.id === visitId ? data.visit : v))
    setQueue(prev => prev.map(queueEntry => queueEntry.id === q.id ? data.queueEntry : queueEntry))
    return true
  }

  const saveConsultation = async (visitId: string, data: { reasonForVisit: string, clinicalNotes: string, consultationFee?: number, treatmentFee?: number }, isComplete = false) => {
    try {
      if (isComplete) {
        await api.post<{ data: { visit: Visit } }>(`/api/consultations/visit/${visitId}/complete`)
        
        // Refresh visits data to pull updated consultation/prescription/queue statuses
        const freshVisitsRes = await api.get<{ data: any[] }>('/api/visits')
        const freshVisits = (freshVisitsRes as any).data || freshVisitsRes;
        setVisits(freshVisits)
        
        const allConsultations: Consultation[] = []
        const allPrescriptions: Prescription[] = []
        freshVisits.forEach((v: any) => {
          if (v.consultation) allConsultations.push(v.consultation)
          if (v.prescription) allPrescriptions.push(v.prescription)
        })
        setConsultations(allConsultations)
        setPrescriptions(allPrescriptions)
        
        // Also refresh queue list
        const queueRes = await api.get<{ data: QueueEntry[] }>('/api/queue')
        setQueue((queueRes as any).data || queueRes)
        
        return { success: true }
      } else {
        const existing = consultations.find(c => c.visitId === visitId)
        let savedConsultation;
        if (existing) {
          const res = await api.patch<{ data: Consultation }>(`/api/consultations/${existing.id}`, data)
          savedConsultation = (res as any).data || res;
        } else {
          const res = await api.post<{ data: Consultation }>('/api/consultations', { ...data, visitId })
          savedConsultation = (res as any).data || res;
        }
        
        setConsultations(prev => {
          const idx = prev.findIndex(c => c.id === savedConsultation.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = savedConsultation
            return next
          }
          return [...prev, savedConsultation]
        })
        return { success: true }
      }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.response?.data?.error || 'Failed to save consultation' }
    }
  }

  const savePrescription = async (prescriptionData: Omit<Prescription, 'id'>) => {
    try {
      const res = await api.post<{ data: Prescription }>('/api/prescriptions', prescriptionData)
      const savedPrescription = (res as any).data || res;
      setPrescriptions(prev => {
        const idx = prev.findIndex(p => p.id === savedPrescription.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = savedPrescription
          return next
        }
        return [...prev, savedPrescription]
      })
      return { success: true }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.response?.data?.error || err.message || 'Failed to save prescription' }
    }
  }

  const adjustMedicineStock = async (id: string, adjustmentAmount: number) => {
    try {
      const res = await api.patch<{ data: Medicine }>(`/api/inventory/${id}/adjust`, { adjustmentAmount })
      // Server returns the updated medicine directly usually, but check if wrapped in `data`
      const updatedMed = res.data || (res as unknown as Medicine)
      setMedicines(prev => prev.map(m => m.id === id ? updatedMed : m))
      return { success: true, medicine: updatedMed }
    } catch (err: any) {
      console.error(err)
      return { success: false, error: err.response?.data?.error || err.message || 'Failed to adjust stock' }
    }
  }

  const completeDispensing = async (visitId: string, prescriptionId: string, items: { medicineId: string, prescribedQuantity: number, dispensedQuantity: number }[]) => {
    try {
      const res = await api.post<{ dispensing: Dispensing, visit: Visit }>('/api/dispensings/complete', {
        visitId,
        prescriptionId,
        items
      });
      
      const { dispensing, visit } = res;

      // Refresh data
      setDispensings(prev => [...prev, dispensing]);
      setVisits(prev => prev.map(v => v.id === visitId ? visit : v));
      
      // Also refresh inventory to get updated stock levels after dispensing
      const invRes = await api.get<{ data: Medicine[] }>('/api/inventory');
      setMedicines(invRes.data || (invRes as any));

      return { success: true }
    } catch (err: any) {
      console.error(err);
      const details = err.response?.data?.details ? ` - ${err.response.data.details}` : '';
      return { success: false, error: (err.response?.data?.error || err.message || 'Failed to record payment') + details }
    }
  }

  const recordPayment = async (visitId: string, amount: number, method: 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card', notes?: string, isFinalPayment?: boolean) => {
    try {
      const res = await api.post<{ payment: Payment, visit: Visit }>('/api/payments', {
        visitId,
        amount,
        method,
        notes,
        isFinalPayment
      });

      const payment = res.payment || (res as any).data?.payment;
      const updatedVisit = res.visit || (res as any).data?.visit;

      if (payment) setPayments(prev => [...prev, payment]);
      if (updatedVisit) setVisits(prev => prev.map(v => v.id === visitId ? updatedVisit : v));

      return { success: true }
    } catch (err: any) {
      console.error(err);
      const details = err.response?.data?.details ? ` - ${err.response.data.details}` : '';
      return { success: false, error: (err.response?.data?.error || err.message || 'Failed to record payment') + details }
    }
  }

  return (
    <ClinicContext.Provider value={{
      patients, appointments, visits, queue, consultations, prescriptions, dispensings, payments, medicines,
      staff,
      addPatient, updatePatient, addAppointment, updateAppointment, confirmAppointmentArrival, startVisit, cancelVisit,
        assignDoctor,
        normalizePhone,
        callPatient, startConsultationFlow, saveConsultation, savePrescription, completeDispensing, recordPayment, adjustMedicineStock
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
