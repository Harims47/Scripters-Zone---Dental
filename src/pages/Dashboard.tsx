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

// --- DEMO DATA ---
const appointmentsData = [
  { id: "a1", time: "09:00 AM", patientName: "Patricia Williams", doctor: "Dr. Smith", type: "Consultation" },
  { id: "a2", time: "09:30 AM", patientName: "John Brown", doctor: "Dr. Adams", type: "Follow-up" },
  { id: "a3", time: "10:00 AM", patientName: "Linda Davis", doctor: "Dr. Lee", type: "Root Canal" },
  { id: "a4", time: "10:45 AM", patientName: "Michael Miller", doctor: "Dr. Smith", type: "Cleaning" },
]



export function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { queue, patients, startConsultationFlow, callPatient } = useClinicContext()
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
            title="Waiting Now" value="3" icon={Clock} trendLabel="Call patients when ready" 
            colorClass="text-amber-600" bgClass="bg-amber-100" 
          />
          <KpiCard 
            title="Today's Appointments" value="8" icon={Users} trendLabel="Next at 10:00 AM" 
            colorClass="text-blue-600" bgClass="bg-blue-100" 
          />
          <KpiCard 
            title="Ready for Dispensing" value="2" icon={UserCheck} trendLabel="Medicines ready" 
            colorClass="text-emerald-600" bgClass="bg-emerald-100" 
          />
          <KpiCard 
            title="Pending Payments" value="5" icon={CreditCard} trendLabel="Collection required" 
            colorClass="text-rose-600" bgClass="bg-rose-100" 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="My Waiting Patients" value="3" icon={Clock} trendLabel="Ready for consultation" 
            colorClass="text-amber-600" bgClass="bg-amber-100" 
          />
          <KpiCard 
            title="In Consultation" value="1" icon={UserCheck} trendLabel="Current active visits" 
            colorClass="text-blue-600" bgClass="bg-blue-100" 
          />
          <KpiCard 
            title="Today's Patients" value="12" icon={Users} trendLabel="Assigned to you" 
            colorClass="text-primary" bgClass="bg-primary/10" 
          />
          <KpiCard 
            title="Completed Today" value="8" icon={CheckCircle2} trendLabel="Visits finished" 
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
              <AppointmentSummary items={appointmentsData} title="Today's Appointments" />
            </div>
          </div>
          
        </div>



      </div>
    </div>
  )
}
