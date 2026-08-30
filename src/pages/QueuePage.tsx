import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QueueHeader, getStatusBadge, getPriorityBadge } from '../components/queue/queue-components'
import type { QueueRow, QueueStatus } from '../components/queue/queue-components'
import { Search, PlayCircle, Users } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
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
  const [doctorFilter, setDoctorFilter] = useState<string>(canManageClinical ? (currentUser?.staffId || 'all') : 'all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
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
      assignedDoctorId: q.assignedDoctorId,
      status: q.status as QueueStatus,
      priority: q.priority ? 'Urgent' : 'Normal',
      source
    }
  })

  // Modal states
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callTarget, setCallTarget] = useState<QueueRow | null>(null)

  const initiateCall = (row: QueueRow) => {
    setCallTarget(row)
    setCallModalOpen(true)
  }

  const handleConfirmCall = async () => {
    if (callTarget) {
      try {
        await callPatient(callTarget.visitId)
        setCallModalOpen(false)
        setCallTarget(null)
      } catch (err) {
        console.error(err)
        alert('Failed to call patient')
      }
    }
  }

  const handleAction = async (id: string, action: 'Call' | 'Start' | 'Resume' | 'Cancel') => {
    const row = queueRows.find(q => q.id === id)
    if (!row) return;

    if (action === 'Call') {
      // Transition WAITING -> CALLED
      initiateCall(row)
    } else if (action === 'Start') {
      // Transition CALLED -> WITH_DOCTOR
      try {
        const success = await startConsultationFlow(row.visitId)
        if (success) {
          navigate(`/doctor/patient/${row.patientId}?visitId=${row.visitId}`)
        }
      } catch (err) {
        console.error(err)
        alert('Failed to start consultation')
      }
    } else if (action === 'Resume') {
      // Re-enter the Doctor Workspace
      navigate(`/doctor/patient/${row.patientId}?visitId=${row.visitId}`)
    }
  }

  const filteredQueue = queueRows.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(search.toLowerCase()) || q.patientId.toLowerCase().includes(search.toLowerCase())
    const matchesDoctor = doctorFilter === 'all' || q.assignedDoctorId === doctorFilter
    const matchesStatus = statusFilter === 'all' || q.status.toLowerCase().replace(' ', '-') === statusFilter
    return matchesSearch && matchesDoctor && matchesStatus
  })

  const summary = {
    waiting: queueRows.filter(q => q.status === 'Waiting').length,
    called: queueRows.filter(q => q.status === 'Called').length,
    withDoctor: queueRows.filter(q => q.status === 'With Doctor').length,
    completed: queueRows.filter(q => q.status === 'Completed').length,
  }

  const columns: ColumnDef<QueueRow>[] = [
    {
      accessorKey: "queueNumber",
      header: "Queue #",
      cell: ({ row }) => (
        <span className="font-mono text-xl font-bold text-slate-400">#{row.original.queueNumber}</span>
      )
    },
    {
      accessorKey: "name",
      header: "Patient & Time",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.original.name}</span>
          <span className="text-xs text-amber-600 font-medium mt-0.5 inline-block">Waiting {row.original.waitTimeMin}m</span>
        </div>
      )
    },
    ...(doctorFilter === 'all' ? [{
      accessorKey: "doctor",
      header: "Assigned Doctor",
      cell: ({ row }: any) => <span className="text-sm font-medium text-slate-700">{row.original.doctor}</span>
    }] as any[] : []),
    {
      accessorKey: "source",
      header: "Context",
      cell: ({ row }) => <span className="text-sm text-slate-500 font-medium">{row.original.source}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        
        // Determine if there is an actionable button for the current user
        let actionButton = null;
        if (item.status === 'Waiting' && !canManageClinical) {
          actionButton = (
            <Button size="sm" className="h-9 shadow-sm" onClick={() => handleAction(item.id, 'Call')}>
              Call Patient
            </Button>
          );
        } else if (item.status === 'Called' && canManageClinical && item.assignedDoctorId === currentUser?.staffId) {
          actionButton = (
            <Button size="sm" variant="default" className="h-9 bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => handleAction(item.id, 'Start')}>
              <PlayCircle className="mr-2 h-4 w-4" /> Start
            </Button>
          );
        } else if (item.status === 'With Doctor' && canManageClinical && item.assignedDoctorId === currentUser?.staffId) {
          actionButton = (
            <Button size="sm" variant="outline" className="h-9 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200 shadow-sm" onClick={() => handleAction(item.id, 'Resume')}>
              <PlayCircle className="mr-2 h-4 w-4" /> Resume
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {actionButton ? actionButton : getStatusBadge(item.status)}
            <span className="hidden xl:inline">{getPriorityBadge(item.priority)}</span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      <QueueHeader summary={summary} />

      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, ID or phone..."
        exportOptions={{ pdf: true, excel: true, csv: true }}
        filterSlot={
          <>
            <select 
              className="flex h-9 w-[140px] items-center justify-between rounded-md border border-input bg-slate-50/50 hover:bg-slate-50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="all">All Doctors</option>
              {DEMO_STAFF.filter(s => s.role.includes('Doctor')).map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
            <select 
              className="flex h-9 w-[130px] items-center justify-between rounded-md border border-input bg-slate-50/50 hover:bg-slate-50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="with-doctor">With Doctor</option>
            </select>
          </>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">

        <DataTable 
          columns={columns} 
          data={filteredQueue}
          emptyState={
            search !== '' ? (
              <DataTableEmpty 
                icon={Search} 
                title="No patients found" 
                description={`There are no queue entries matching "${search}".`}
              />
            ) : (
              <DataTableEmpty 
                icon={Users}
                title="Queue is empty" 
                description="No patients are currently in the queue." 
              />
            )
          }
        />
      </div>

      {/* Call Patient Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Call Patient</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to call <span className="font-semibold text-slate-900">{callTarget?.name}</span> to the consultation room?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCallModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCall} className="bg-indigo-600 hover:bg-indigo-700 text-white">Call Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
