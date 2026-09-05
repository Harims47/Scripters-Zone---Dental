import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QueueStatus } from '../components/queue/queue-components'
import { Search, PlayCircle, Users, Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '../components/ui/button'

import { useClinicContext } from '../context/ClinicContext'
import { useAuth } from '../context/AuthContext'
import { canAccessRoute } from '../lib/route-permissions'
import { api } from '../lib/api'

type QueueRow = {
  id: string
  visitId: string
  patientId: string
  assignedDoctorId: string | null
  name: string
  reasonForVisit: string
  patientType: 'New Patient' | 'Existing Patient'
  status: string
}

export function QueuePage() {
  const { queue, patients, visits, consultations } = useClinicContext()
  const { currentUser } = useAuth()
  const canManageClinical = currentUser ? canAccessRoute(currentUser.role, '/doctor') : false
  const [search, setSearch] = useState('')
  
  const navigate = useNavigate()

  // Map Canonical Context Data to UI view model
  const queueRows: QueueRow[] = queue.map(q => {
    const p = patients.find(pt => pt.id === q.patientId)
    const v = visits.find(visit => visit.id === q.visitId)

    // Calculate Patient Type
    const patientVisits = visits.filter(visit => visit.patientId === q.patientId)
    const hasPastCompletedVisit = patientVisits.some(visit => visit.id !== q.visitId && visit.status === 'Completed')
    const patientType = hasPastCompletedVisit ? 'Existing Patient' : 'New Patient'

    return {
      id: q.id,
      visitId: q.visitId,
      patientId: q.patientId,
      assignedDoctorId: q.assignedDoctorId || null,
      name: p?.name || 'Unknown Patient',
      reasonForVisit: v?.reasonForVisit || 'Not Specified',
      patientType,
      status: q.status
    }
  })

  const handleAction = async (id: string, action: 'Start') => {
    const row = queueRows.find(q => q.id === id)
    if (!row) return;

    if (action === 'Start') {
      navigate(`/doctor/patient/${row.patientId}?visitId=${row.visitId}`)
    }
  }

  const filteredQueue = queueRows.filter(q => {
    // Doctors only see their own assigned patients
    if (canManageClinical && currentUser?.staffId) {
      if (q.assignedDoctorId !== currentUser.staffId) return false
    }
    // Search filter
    return q.name.toLowerCase().includes(search.toLowerCase()) || q.patientId.toLowerCase().includes(search.toLowerCase())
  })

  const exportQueue = (format: 'pdf' | 'xlsx' | 'csv') => {
    const query = new URLSearchParams({
      format,
      ...(search ? { search } : {})
    }).toString();
    api.download(`/api/queue/export?${query}`, `queue_export.${format}`);
  }

  const columns: ColumnDef<QueueRow>[] = [
    {
      accessorKey: "name",
      header: "Patient Name",
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 block">{row.original.name}</span>
      )
    },
    {
      accessorKey: "reasonForVisit",
      header: "Reason for Visit",
      cell: ({ row }) => <span className="text-sm font-medium text-slate-700">{row.original.reasonForVisit}</span>
    },
    {
      accessorKey: "patientType",
      header: "Patient Type",
      cell: ({ row }) => {
        const type = row.original.patientType
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            type === 'New Patient' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {type}
          </span>
        )
      }
    },
    {
      accessorKey: "action",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        let actionButton = null;
        if (canManageClinical) {
          if (item.status === 'Called' || item.status === 'With Doctor' || item.status === 'Waiting' || item.status === 'In Progress' || item.status === 'Transferred') {
            const hasConsultation = consultations.some(c => c.visitId === item.visitId);
            const isResuming = item.status === 'With Doctor' || item.status === 'Transferred' || hasConsultation;
            actionButton = (
              <Button size="sm" variant="default" className="h-9 bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white" onClick={() => handleAction(item.id, 'Start')}>
                <PlayCircle className="mr-2 h-4 w-4" /> {isResuming ? 'Resume Consulting' : 'Start Consulting'}
              </Button>
            );
          } else if (item.status === 'Ready for Reception' || item.status === 'Ready for Payment' || item.status === 'Paid' || item.status === 'Completed') {
            actionButton = (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                {item.status === 'Ready for Reception' ? 'Completed (At Reception)' : item.status}
              </span>
            );
          }
        }

        return (
          <div className="flex items-center gap-2">
            {item.status === 'Transferred' && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">
                Transferred
              </span>
            )}
            {actionButton ? actionButton : <span className="text-sm text-slate-500 italic">Not available</span>}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, ID or phone..."
        actionSlot={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportQueue('pdf')} className="h-9 bg-white">
              <FileText className="mr-2 h-4 w-4 text-red-500" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportQueue('xlsx')} className="h-9 bg-white">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportQueue('csv')} className="h-9 bg-white">
              <File className="mr-2 h-4 w-4 text-blue-600" /> CSV
            </Button>
          </div>
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
    </div>
  )
}
