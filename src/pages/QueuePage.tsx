import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QueueHeader, QueueEntry, getStatusBadge } from '../components/queue/queue-components'
import type { QueueRow, QueueStatus } from '../components/queue/queue-components'
import { Search } from 'lucide-react'
import { Input } from '../components/ui/input'
import { PatientProfileHeader, DrawerSection, DrawerFooterActions, ReadOnlyField } from '../components/ui/drawer-patterns'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { Button } from '../components/ui/button'

import { DEMO_STAFF } from '../lib/mock-data'
import { useClinicContext } from '../context/ClinicContext'
import { useAuth } from '../context/AuthContext'
import { canAccessRoute } from '../lib/route-permissions'

export function QueuePage() {
  const { queue, patients, visits, callPatient, startConsultationFlow } = useClinicContext()
  const { currentUser } = useAuth()
  const canManageClinical = currentUser ? canAccessRoute(currentUser.role, '/doctor') : false
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<QueueRow | null>(null)
  
  const navigate = useNavigate()

  // Map Canonical Context Data to UI view model
  const queueRows: QueueRow[] = queue.map(q => {
    const p = patients.find(pt => pt.id === q.patientId)
    const d = DEMO_STAFF.find(st => st.id === q.assignedDoctorId)
    const v = visits.find(visit => visit.id === q.visitId)
    const source = v?.appointmentId ? 'Appointment' : 'Walk-in'

    // Calculate mock wait time for demo
    const [hours, _minutes, period] = (q.arrivalTime || "09:00 AM").match(/(\d+):(\d+)\s*(AM|PM)/)?.slice(1) || ["9", "0", "AM"];
    // Calculate mock wait time for demo - cap it to realistic ranges (0 to 45 mins)
    let arrivalHour = parseInt(hours);
    if (period === 'PM' && arrivalHour < 12) arrivalHour += 12;
    if (period === 'AM' && arrivalHour === 12) arrivalHour = 0;
    
    let diffMin = 0;
    // For demo realism, instead of actual elapsed time which could be 500+ mins if time is old,
    // generate a stable, believable mock wait time based on patient string sum.
    const charSum = q.patientId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    diffMin = (charSum % 40) + 5; // 5 to 45 minutes

    return {
      id: q.id,
      queueNumber: String(q.position).padStart(2, '0'),
      visitId: q.visitId,
      name: p?.name || 'Unknown Patient',
      patientId: q.patientId,
      phone: p?.phone || 'Unknown',
      arrivalTime: q.arrivalTime,
      waitTimeMin: isNaN(diffMin) ? 0 : diffMin,
      doctor: d?.name || 'Unassigned',
      status: q.status as QueueStatus,
      priority: q.priority ? 'Urgent' : 'Normal',
      source
    }
  })

  const handleAction = (id: string, action: 'Call' | 'Start' | 'Complete' | 'Cancel') => {
    const row = queueRows.find(q => q.id === id)
    if (!row) return;

    if (action === 'Call') {
      // Transition WAITING -> CALLED
      callPatient(row.visitId)
    } else if (action === 'Start') {
      // Transition CALLED -> WITH_DOCTOR
      const success = startConsultationFlow(row.visitId)
      if (success) {
        navigate(`/doctor/patient/${row.patientId}?visitId=${row.visitId}`)
      }
    }
  }

  const handleView = (id: string) => {
    const p = queueRows.find(q => q.id === id)
    if (p) {
      setSelectedPatient(p)
      setDrawerOpen(true)
    }
  }

  const filteredQueue = queueRows.filter(q => q.name.toLowerCase().includes(search.toLowerCase()) || q.patientId.toLowerCase().includes(search.toLowerCase()))

  const summary = {
    waiting: queueRows.filter(q => q.status === 'Waiting').length,
    called: queueRows.filter(q => q.status === 'Called').length,
    withDoctor: queueRows.filter(q => q.status === 'With Doctor').length,
    completed: queueRows.filter(q => q.status === 'Completed').length,
  }

  return (
    <div className="space-y-6 pb-8">
      <QueueHeader summary={summary} />

      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4 bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patient, ID or phone..." className="pl-9 bg-slate-50/50 hover:bg-slate-50 h-9 transition-colors" onChange={(e: any) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <select className="flex h-9 w-[140px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="all-doctors">All Doctors</option>
              <option value="dr-smith">Dr. Smith</option>
              <option value="dr-adams">Dr. Adams</option>
              <option value="dr-lee">Dr. Lee</option>
            </select>
            {canManageClinical && (
              <select className="flex h-9 w-[130px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="all-status">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="with-doctor">With Doctor</option>
              </select>
            )}
            {canManageClinical && (
              <Button variant="outline" size="sm" className="h-9 shadow-sm">
                Filters
              </Button>
            )}
          </div>
        </div>
        
        {/* Table Header (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-6 px-4 py-3 border-b bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="w-24">Queue #</div>
          <div className="flex-1">Patient Identity</div>
          <div className="w-32">Wait / Arrival</div>
          <div className="w-36">Assigned Doctor</div>
          <div className="w-48">Status</div>
          <div className="w-48 text-right">Actions</div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-slate-100">
          {filteredQueue.map(item => (
            <QueueEntry key={item.id} item={item} onAction={handleAction} onView={handleView} canManageClinical={canManageClinical} />
          ))}
          {filteredQueue.length === 0 && (
            <div className="p-8 text-center text-slate-500">No patients found matching your filters.</div>
          )}
        </div>
      </div>

      {/* Reused Patient Drawer Implementation */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          {selectedPatient && (
            <>
              <PatientProfileHeader 
                name={selectedPatient.name}
                patientId={selectedPatient.patientId}
                phone={selectedPatient.phone}
                statusElement={getStatusBadge(selectedPatient.status)}
                modeText="Patient Workspace"
              />
              <SheetScrollArea className="p-0 bg-slate-50 flex-1">
                <div className="px-6 sm:px-8 py-8 space-y-10">
                  <DrawerSection title="Queue Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                      {!canManageClinical ? (
                        <>
                          <ReadOnlyField label="Doctor" value={selectedPatient.doctor} />
                          <ReadOnlyField label="Arrival Time" value={selectedPatient.arrivalTime} />
                          <ReadOnlyField label="Wait Time" value={`${selectedPatient.waitTimeMin} minutes`} />
                        </>
                      ) : (
                        <>
                          <ReadOnlyField label="Queue Number" value={`#${selectedPatient.queueNumber}`} isMono />
                          <ReadOnlyField label="Priority" value={selectedPatient.priority} />
                          <ReadOnlyField label="Wait Time" value={`${selectedPatient.waitTimeMin} minutes`} />
                          <ReadOnlyField label="Arrival Time" value={selectedPatient.arrivalTime} />
                        </>
                      )}
                    </div>
                  </DrawerSection>
                  <DrawerSection title="Basic Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                      <ReadOnlyField label="Full Name" value={selectedPatient.name} />
                      <ReadOnlyField label="Patient ID" value={selectedPatient.patientId} isMono />
                      <ReadOnlyField label="Phone" value={selectedPatient.phone} />
                      <ReadOnlyField label="Age" value="Unknown (Demo)" />
                    </div>
                  </DrawerSection>
                </div>
              </SheetScrollArea>
              <DrawerFooterActions>
                <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto font-medium bg-white shadow-sm">Close</Button>
              </DrawerFooterActions>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}
