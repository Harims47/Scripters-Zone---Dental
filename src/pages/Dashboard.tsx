import { 
  Users, UserCheck, Clock, CreditCard 
} from "lucide-react"
import { 
  DashboardHeader, KpiCard, QueueSummary, AppointmentSummary, 
  DoctorStatusWidget, InventoryAlertWidget, RecentActivityWidget 
} from "../components/dashboard/dashboard-components"
import { useAuth } from "../context/AuthContext"

// --- DEMO DATA ---
const queueData = [
  { id: "q1", patientName: "James Wilson", patientId: "PT-0001", status: "Waiting", waitTime: "08" },
  { id: "q2", patientName: "Mary Smith", patientId: "PT-0002", status: "Waiting", waitTime: "14" },
  { id: "q3", patientName: "Robert Johnson", patientId: "PT-0003", status: "Waiting", waitTime: "21" },
]

const appointmentsData = [
  { id: "a1", time: "09:00 AM", patientName: "Patricia Williams", doctor: "Dr. Smith", type: "Consultation" },
  { id: "a2", time: "09:30 AM", patientName: "John Brown", doctor: "Dr. Adams", type: "Follow-up" },
  { id: "a3", time: "10:00 AM", patientName: "Linda Davis", doctor: "Dr. Lee", type: "Root Canal" },
  { id: "a4", time: "10:45 AM", patientName: "Michael Miller", doctor: "Dr. Smith", type: "Cleaning" },
]

const doctorsData: Array<{id: string, name: string, status: 'With Patient' | 'Available' | 'On Break' | 'Off Duty'}> = [
  { id: "d1", name: "Dr. Smith", status: "With Patient" },
  { id: "d2", name: "Dr. Adams", status: "Available" },
  { id: "d3", name: "Dr. Lee", status: "On Break" },
]

const inventoryData = [
  { id: "i1", item: "Amoxicillin 500mg", remaining: 8 },
  { id: "i2", item: "Paracetamol 500mg", remaining: 12 },
  { id: "i3", item: "Lidocaine Carpules", remaining: 4 },
]

const activityData: Array<{id: string, action: string, time: string, type: 'registration' | 'payment' | 'prescription' | 'appointment'}> = [
  { id: "ac1", action: "Payment completed for PT-0124", time: "2 mins ago", type: "payment" },
  { id: "ac2", action: "Patient registered: Sarah Connor", time: "15 mins ago", type: "registration" },
  { id: "ac3", action: "Prescription created for PT-0098", time: "32 mins ago", type: "prescription" },
  { id: "ac4", action: "Appointment completed by Dr. Adams", time: "1 hour ago", type: "appointment" },
]

export function Dashboard() {
  const { currentUser } = useAuth()
  const isReceptionist = currentUser?.role === 'Receptionist'

  return (
    <div className="space-y-6 pb-8">
      <DashboardHeader 
        greetingOverride={currentUser ? `Good morning, ${currentUser.name}` : undefined}
      />

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
            title="Today's Patients" value="42" icon={Users} trend="+12%" trendLabel="vs yesterday" 
            colorClass="text-primary" bgClass="bg-primary/10" 
          />
          <KpiCard 
            title="Waiting Now" value="3" icon={Clock} trendLabel="Average wait: 14m" 
            colorClass="text-amber-600" bgClass="bg-amber-100" 
          />
          <KpiCard 
            title="With Doctors" value="2" icon={UserCheck} trendLabel="Rooms 1 & 2 active" 
            colorClass="text-blue-600" bgClass="bg-blue-100" 
          />
          <KpiCard 
            title="Pending Payments" value="5" icon={CreditCard} trendLabel="$1,250 outstanding" 
            colorClass="text-rose-600" bgClass="bg-rose-100" 
          />
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: High Priority Queue & Appointments (Spans 8 cols on desktop) */}
        <div className={isReceptionist ? "lg:col-span-12 flex flex-col gap-6" : "lg:col-span-8 flex flex-col gap-6"}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[420px]">
              <QueueSummary items={queueData} title={isReceptionist ? "Patients Waiting" : "Live Queue"} />
            </div>
            <div className="h-[420px]">
              <AppointmentSummary items={appointmentsData} title="Today's Appointments" />
            </div>
          </div>
          
        </div>

        {/* Right Column: Secondary Status & Activity (Spans 4 cols on desktop) */}
        {!isReceptionist && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            <DoctorStatusWidget items={doctorsData} />
            <InventoryAlertWidget items={inventoryData} />
            <RecentActivityWidget items={activityData} />
          </div>
        )}

      </div>
    </div>
  )
}
