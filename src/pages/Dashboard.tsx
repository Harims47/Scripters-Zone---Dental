import { 
  Users, UserCheck, Clock, CreditCard, CheckCircle2 
} from "lucide-react"
import { 
  DashboardHeader, KpiCard, QueueSummary, AppointmentSummary
} from "../components/dashboard/dashboard-components"
import { useAuth } from "../context/AuthContext"
import { useClinicContext } from "../context/ClinicContext"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { AlertCircle, PlayCircle } from "lucide-react"

export function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { queue, patients, appointments, dispensings, payments, visits, startConsultationFlow, callPatient } = useClinicContext()
  const isReceptionist = currentUser?.role === 'Receptionist'

  // Find if there is a patient called for this doctor
  const nextPatientQueue = !isReceptionist ? queue.find(q => q.assignedDoctorId === currentUser?.staffId && q.status === 'Called') : null
  const nextPatient = nextPatientQueue ? patients.find(p => p.id === nextPatientQueue.patientId) : null

  const handleStartConsultation = () => {
    if (nextPatientQueue) {
      const success = startConsultationFlow(nextPatientQueue.visitId)
      if (success) {
        navigate(`/doctor/patient/${nextPatientQueue.patientId}?visitId=${nextPatientQueue.visitId}`)
      }
    }
  }

  // Derive real queue data
  const realQueueData = queue
    .filter(q => isReceptionist ? q.status === 'Waiting' : (q.assignedDoctorId === currentUser?.staffId && q.status === 'Waiting'))
    .map((q, i) => {
      const p = patients.find(pt => pt.id === q.patientId)
      return {
        id: q.id,
        visitId: q.visitId,
        patientName: p?.name || 'Unknown',
        patientId: p?.id || 'Unknown',
        status: q.status,
        waitTime: String((i * 10) + 5).padStart(2, '0') // Mock wait time for dashboard UI 
      }
    })
    .slice(0, 5) // Show top 5

  const realAppointmentsData = appointments
    .filter(a => a.status !== 'Cancelled' && a.status !== 'No Show')
    .map(a => {
      const p = patients.find(pt => pt.id === a.patientId)
      return {
        id: a.id,
        time: a.time,
        patientName: p?.name || 'Unknown',
        doctor: a.providerId,
        type: a.type
      }
    })
    .slice(0, 5)

  // Derived KPI Counts
  const today = new Date().toISOString().split('T')[0]
  const waitingNowCount = queue.filter(q => q.status === 'Waiting').length
  const todayAppointmentsCount = appointments.filter(a => a.date === today && !['Cancelled', 'No Show'].includes(a.status)).length
  const readyForDispensingCount = dispensings.filter(d => d.status === 'Pending').length
  const pendingPaymentsCount = payments.filter(p => p.status === 'Pending').length

  const myWaitingCount = queue.filter(q => q.assignedDoctorId === currentUser?.staffId && q.status === 'Waiting').length
  const inConsultationCount = queue.filter(q => q.assignedDoctorId === currentUser?.staffId && q.status === 'In Progress').length
  const myPatientsTodayCount = visits.filter(v => v.doctorId === currentUser?.staffId && v.status !== 'CANCELLED').length
  const myCompletedTodayCount = visits.filter(v => v.doctorId === currentUser?.staffId && v.status === 'COMPLETED').length

  const handleQueueAction = (item: any) => {
    if (isReceptionist) {
      callPatient(item.visitId)
    } else {
      // Doctor clicks start consultation from the waiting list directly
      const success = startConsultationFlow(item.visitId)
      if (success) {
        navigate(`/doctor/patient/${item.patientId}?visitId=${item.visitId}`)
      }
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <DashboardHeader 
        greetingOverride={currentUser ? `Good morning, ${currentUser.name}` : undefined}
      />

      {nextPatient && (
        <div className="bg-indigo-600 rounded-xl p-1 shadow-lg shadow-indigo-600/20 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-white/10 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full flex shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Next Patient is Ready</h3>
                <p className="text-indigo-100 text-sm">{nextPatient.name} is waiting in your consultation room.</p>
              </div>
            </div>
            <Button 
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6 py-5 rounded-xl shadow-sm w-full sm:w-auto"
              onClick={handleStartConsultation}
            >
              <PlayCircle className="w-5 h-5 mr-2" /> Start Consultation
            </Button>
          </div>
        </div>
      )}

      {/* KPI Row */}
      {isReceptionist ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Waiting Now" value={waitingNowCount.toString()} icon={Clock} trendLabel="Call patients when ready" 
            colorClass="text-amber-600" bgClass="bg-amber-100" 
          />
          <KpiCard 
            title="Today's Appointments" value={todayAppointmentsCount.toString()} icon={Users} trendLabel="Next at 10:00 AM" 
            colorClass="text-blue-600" bgClass="bg-blue-100" 
          />
          <KpiCard 
            title="Ready for Dispensing" value={readyForDispensingCount.toString()} icon={UserCheck} trendLabel="Medicines ready" 
            colorClass="text-emerald-600" bgClass="bg-emerald-100" 
          />
          <KpiCard 
            title="Pending Payments" value={pendingPaymentsCount.toString()} icon={CreditCard} trendLabel="Collection required" 
            colorClass="text-rose-600" bgClass="bg-rose-100" 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="My Waiting Patients" value={myWaitingCount.toString()} icon={Clock} trendLabel="Ready for consultation" 
            colorClass="text-amber-600" bgClass="bg-amber-100" 
          />
          <KpiCard 
            title="In Consultation" value={inConsultationCount.toString()} icon={UserCheck} trendLabel="Current active visits" 
            colorClass="text-blue-600" bgClass="bg-blue-100" 
          />
          <KpiCard 
            title="Today's Patients" value={myPatientsTodayCount.toString()} icon={Users} trendLabel="Assigned to you" 
            colorClass="text-primary" bgClass="bg-primary/10" 
          />
          <KpiCard 
            title="Completed Today" value={myCompletedTodayCount.toString()} icon={CheckCircle2} trendLabel="Visits finished" 
            colorClass="text-emerald-600" bgClass="bg-emerald-100" 
          />

        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Full Width Grid */}
        <div className="lg:col-span-12 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[420px]">
              <QueueSummary items={realQueueData} title={isReceptionist ? "Patients Waiting" : "My Patients Waiting"} isDoctor={!isReceptionist} onAction={handleQueueAction} />
            </div>
            <div className="h-[420px]">
              <AppointmentSummary items={realAppointmentsData} title="Today's Appointments" />
            </div>
          </div>
          
        </div>



      </div>
    </div>
  )
}
