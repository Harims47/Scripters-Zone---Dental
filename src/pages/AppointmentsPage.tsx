import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Calendar as CalendarIcon, Clock, Edit2, XCircle, FileText, CheckCircle2 } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog'
import { PatientProfileHeader, DrawerFooterActions } from '../components/ui/drawer-patterns'
import { 
  getAppointmentStatusBadge, 
  DoctorSelector, 
  PatientSelector
} from '../components/appointments/appointment-components'
import { DEMO_STAFF, type AppointmentStatus } from '../lib/mock-data'
import { useClinicContext } from '../context/ClinicContext'

interface AppointmentRow {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  date: string
  time: string
  doctorId: string
  type: string
  status: AppointmentStatus
  notes: string
}



export function AppointmentsPage() {
  const { appointments, patients, visits, addAppointment, updateAppointment, confirmAppointmentArrival } = useClinicContext()
  const navigate = useNavigate()
  
  const data: AppointmentRow[] = useMemo(() => appointments.map(a => {
    const p = patients.find(pt => pt.id === a.patientId)
    return {
      id: a.id,
      patientId: a.patientId,
      patientName: p?.name || 'Unknown',
      patientPhone: p?.phone || '-',
      date: a.date,
      time: a.time,
      doctorId: a.providerId,
      type: a.type,
      status: a.status as AppointmentStatus,
      notes: a.notes || ''
    }
  }), [appointments, patients])

  const [search, setSearch] = useState('')
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  
  // Edit/Create form state
  const [activeItem, setActiveItem] = useState<Partial<AppointmentRow>>({})

  // Cancel dialog state
  const [cancelId, setCancelId] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setActiveItem({
      status: 'Scheduled',
      type: 'Consultation',
      date: new Date().toISOString().split('T')[0]
    })
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  const handleOpenView = (row: AppointmentRow) => {
    setActiveItem(row)
    setDrawerMode('view')
    setDrawerOpen(true)
  }

  const handleOpenEdit = (row: AppointmentRow) => {
    setActiveItem(row)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (drawerMode === 'create') {
      addAppointment({
        patientId: activeItem.patientId || '',
        providerId: activeItem.doctorId || '',
        date: activeItem.date || '',
        time: activeItem.time || '',
        type: (activeItem.type as any) || 'Consultation',
        status: (activeItem.status as AppointmentStatus) || 'Scheduled',
        notes: activeItem.notes || ''
      })
    } else if (drawerMode === 'edit') {
      updateAppointment({
        id: activeItem.id,
        patientId: activeItem.patientId,
        providerId: activeItem.doctorId,
        date: activeItem.date,
        time: activeItem.time,
        type: activeItem.type as any,
        status: activeItem.status as AppointmentStatus,
        notes: activeItem.notes
      })
    }
    setDrawerOpen(false)
  }

  const handleConfirmCancel = () => {
    if (cancelId) {
      updateAppointment({ id: cancelId, status: 'Cancelled' })
      setCancelId(null)
    }
  }

  const handleConfirmArrival = (id: string) => {
    const res = confirmAppointmentArrival(id)
    if (!res.success) {
      alert(res.error)
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(d => 
      d.patientName.toLowerCase().includes(search.toLowerCase()) || 
      d.patientId.toLowerCase().includes(search.toLowerCase()) ||
      d.patientPhone.includes(search)
    )
  }, [data, search])

  const columns: ColumnDef<AppointmentRow>[] = [
    {
      header: "Patient",
      accessorKey: "patientName",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-900">{row.original.patientName}</div>
          <div className="text-sm font-mono text-slate-500">{row.original.patientId}</div>
        </div>
      )
    },
    {
      header: "Date & Time",
      accessorKey: "date",
      cell: ({ row }) => (
        <div>
          <div className="text-slate-900">{row.original.date}</div>
          <div className="text-sm text-slate-500">{row.original.time}</div>
        </div>
      )
    },
    {
      header: "Provider",
      accessorKey: "doctorId",
      cell: ({ row }) => {
        const doc = DEMO_STAFF.find((d: any) => d.id === row.original.doctorId)
        return (
          <div>
            <div className="text-slate-900">{doc?.name || row.original.doctorId}</div>
            <div className="text-xs text-slate-500">{doc?.role}</div>
          </div>
        )
      }
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => <span className="text-slate-700">{row.original.type}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => getAppointmentStatusBadge(row.original.status)
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {['Scheduled', 'Confirmed'].includes(row.original.status) && (
            <>
              <Button variant="outline" size="sm" className="h-8 shadow-sm text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100" onClick={() => handleConfirmArrival(row.original.id)}>
                Check In
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => handleOpenEdit(row.original)} aria-label="Edit appointment">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => setCancelId(row.original.id)} aria-label="Cancel appointment">
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => handleOpenView(row.original)} className="shadow-sm">
            View
          </Button>
        </div>
      )
    }
  ]

  // Derived for drawer header
  const isEditing = drawerMode === 'edit'
  const isCreating = drawerMode === 'create'
  
  const drawerPatient = patients.find(p => p.id === activeItem.patientId) || 
    (isCreating ? undefined : { name: activeItem.patientName || '', id: activeItem.patientId || '', phone: activeItem.patientPhone || '' })

  const relatedVisit = activeItem.id ? visits.find(v => v.appointmentId === activeItem.id) : undefined

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-slate-500 mt-1">Manage scheduled patient appointments and surgeons.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search patient or phone..." 
            className="pl-9 bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none">Doctor</Button>
          <Button variant="outline" className="flex-1 sm:flex-none">Status</Button>
          <Button variant="outline" className="flex-1 sm:flex-none">Date</Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1">
        <DataTable columns={columns} data={filteredData} />
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep Appointment</Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>Cancel Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          
          {/* Drawer Header */}
          {isCreating ? (
            <div className="px-6 py-6 bg-slate-900 border-b border-slate-800">
              <h2 className="text-xl font-bold tracking-tight text-white">New Appointment</h2>
              <p className="text-slate-400 mt-1">Schedule a visit with a doctor or surgeon.</p>
            </div>
          ) : (
            <PatientProfileHeader 
              name={drawerPatient?.name || ''}
              patientId={drawerPatient?.id || ''}
              phone={drawerPatient?.phone || ''}
              statusElement={getAppointmentStatusBadge(activeItem.status as AppointmentStatus)}
              modeText={isEditing ? 'Reschedule / Edit' : `Appointment: ${activeItem.id}`}
            />
          )}

          {/* Checked In Success State */}
          {drawerMode === 'view' && activeItem.status === 'Checked In' && (
            <div className="px-6 py-4 bg-teal-50 border-b border-teal-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-teal-900">Patient checked in successfully</h4>
                <p className="text-sm text-teal-700 mt-1">Patient is waiting in the queue.</p>
              </div>
            </div>
          )}

          {/* Drawer Body */}
          <SheetScrollArea className="p-0 bg-slate-50 flex-1">
            <div className="px-6 sm:px-8 py-8 space-y-8">
              
              {/* Form Fields */}
              <div className="space-y-6">
                
                {/* Patient Selection (Only in Create Mode) */}
                {isCreating && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Patient</label>
                    <PatientSelector 
                      value={activeItem.patientId || ''} 
                      onChange={(val) => setActiveItem(prev => ({ ...prev, patientId: val }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Provider</label>
                  <DoctorSelector 
                    value={activeItem.doctorId || ''} 
                    onChange={(val) => setActiveItem(prev => ({ ...prev, doctorId: val }))}
                    disabled={drawerMode === 'view'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Date</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        type="date" 
                        className="pl-9 bg-white" 
                        value={activeItem.date || ''}
                        onChange={e => setActiveItem(prev => ({ ...prev, date: e.target.value }))}
                        readOnly={drawerMode === 'view'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        type="time" 
                        className="pl-9 bg-white" 
                        value={activeItem.time ? activeItem.time.replace(/ (AM|PM)/, '') : ''} // basic mock time handling
                        onChange={e => setActiveItem(prev => ({ ...prev, time: e.target.value }))}
                        readOnly={drawerMode === 'view'}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Appointment Type</label>
                  <Input 
                    value={activeItem.type || ''}
                    placeholder="e.g. Consultation, Surgery"
                    onChange={e => setActiveItem(prev => ({ ...prev, type: e.target.value }))}
                    readOnly={drawerMode === 'view'}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Notes / Reason</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea 
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={activeItem.notes || ''}
                      placeholder="Enter appointment notes..."
                      onChange={e => setActiveItem(prev => ({ ...prev, notes: e.target.value }))}
                      readOnly={drawerMode === 'view'}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Status</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={activeItem.status || 'Scheduled'}
                      onChange={e => setActiveItem(prev => ({ ...prev, status: e.target.value as AppointmentStatus }))}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Checked In">Checked In</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="No Show">No Show</option>
                    </select>
                  </div>
                )}

              </div>

            </div>
          </SheetScrollArea>
          
          {/* Drawer Footer */}
          <div className="bg-white border-t px-6 py-4">
            {drawerMode === 'view' ? (
              <DrawerFooterActions>
                <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto">Close</Button>
                {activeItem.status === 'Checked In' && relatedVisit && (
                  <Button variant="outline" className="w-full sm:w-auto border-teal-200 text-teal-700 bg-teal-50" onClick={() => navigate('/queue')}>
                    View in Queue
                  </Button>
                )}
                {['Scheduled', 'Confirmed'].includes(activeItem.status || '') && (
                  <>
                    <Button className="w-full sm:w-auto border-teal-600 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { handleConfirmArrival(activeItem.id || ''); setDrawerOpen(false); }}>
                      Check In
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDrawerMode('edit')}>
                      Edit
                    </Button>
                  </>
                )}
              </DrawerFooterActions>
            ) : (
              <DrawerFooterActions>
                <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={handleSave}
                  disabled={isCreating && !activeItem.patientId}
                >
                  {isCreating ? 'Schedule Appointment' : 'Save Changes'}
                </Button>
              </DrawerFooterActions>
            )}
          </div>

        </SheetContent>
      </Sheet>

    </div>
  )
}
