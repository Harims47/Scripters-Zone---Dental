import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PlayCircle, Users, Tag, Clock, ChevronDown, Edit2, Lock } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { toast } from 'react-hot-toast'

import { useClinicContext } from '../context/ClinicContext'
import { useAuth } from '../context/AuthContext'
import { canAccessRoute } from '../lib/route-permissions'
import { api } from '../lib/api'
import { DiscountModal } from '../components/queue/DiscountModal'
import { TreatmentPlanUI } from '../components/consultation/TreatmentPlanUI'
import { parseReasonForVisit } from '../constants/visitReasons'
import { parseTeeth, formatTeethLabel } from '../lib/toothMetadata'

type QueueRow = {
  id: string
  visitId: string
  patientId: string
  assignedDoctorId: string | null
  name: string
  reasonForVisit: string
  visitType: 'Walk-in' | 'Appointment'
  patientType: 'New Patient' | 'Existing Patient'
  status: string
  consultationFee: number
  treatmentFee: number
  medicineCost: number
  discount: number
  discountReason?: string | null
  amountDue?: number
  pendingTreatments?: any[]
}


export function QueuePage() {
  const { queue, patients, visits, consultations, appointments, updateVisit, refreshClinicOperations } = useClinicContext()
  const { currentUser } = useAuth()
  const canManageClinical = currentUser ? canAccessRoute(currentUser.role, '/doctor') : false
  const [search, setSearch] = useState('')
  const [visitTypeFilter, setVisitTypeFilter] = useState<'all' | 'Walk-in' | 'Appointment'>('all')
  const [discountModalRow, setDiscountModalRow] = useState<QueueRow | null>(null)
  const [editTreatmentRow, setEditTreatmentRow] = useState<QueueRow | null>(null)
  const editTreatmentRollbackRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [expandedProcedureIds, setExpandedProcedureIds] = useState<Record<string, boolean>>({})
  
  const navigate = useNavigate()

  // Real-time queue sync on QueuePage
  useEffect(() => {
    refreshClinicOperations();
    const timer = setInterval(() => {
      refreshClinicOperations();
    }, 2500);
    return () => clearInterval(timer);
  }, [refreshClinicOperations]);

  // Map Canonical Context Data to UI view model
  const queueRows: QueueRow[] = useMemo(() => {
    return queue.map(q => {
      const v = visits.find(visit => visit.id === q.visitId)
      const p = patients.find(pt => pt.id === q.patientId) || 
                (q as any).visit?.patient || 
                (v as any)?.patient ||
                patients.find(pt => pt.id === v?.patientId)

      // Determine Visit Type: Appointment if visit is linked to appointment or appointment exists for this visit, else Walk-in
      const isAppointment = Boolean(v?.appointmentId) || appointments.some(a => a.id === v?.appointmentId)
      const visitType: 'Walk-in' | 'Appointment' = isAppointment ? 'Appointment' : 'Walk-in'

      // Calculate Patient Type
      const patientVisits = visits.filter(visit => visit.patientId === q.patientId)
      const hasPastCompletedVisit = patientVisits.some(visit => visit.id !== q.visitId && visit.status === 'COMPLETED')
      const patientType = hasPastCompletedVisit ? 'Existing Patient' : 'New Patient'

      return {
        id: q.id,
        visitId: q.visitId,
        patientId: p?.id || q.patientId,
        assignedDoctorId: q.assignedDoctorId || null,
        name: p?.name || (q as any).visit?.patient?.name || (v as any)?.patient?.name || 'Unknown Patient',
        reasonForVisit: v?.reasonForVisit || 'Not Specified',
        visitType,
        patientType,
        status: q.status,
        consultationFee: v?.consultationFee || 0,
        treatmentFee: v?.treatmentFee || 0,
        medicineCost: v?.medicineCost || 0,
        discount: v?.discount || 0,
        discountReason: v?.discountReason || null,
        amountDue: v?.amountDue || 0,
        pendingTreatments: (q as any).pendingTreatments || []
      }
    })
  }, [queue, patients, visits, appointments])

  const handleApplyDiscount = async (discount: number, reason: string) => {
    if (!discountModalRow) return;
    try {
      const res = await updateVisit(discountModalRow.visitId, {
        discount,
        discountReason: reason
      });
      if (res.success) {
        toast.success(discount > 0 ? `₹${discount} discount saved` : 'Discount removed');
        setDiscountModalRow(null);
      } else {
        toast.error(res.error || 'Failed to update discount');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating discount');
    }
  };

  const handleAction = async (id: string, action: 'Start') => {
    const row = queueRows.find(q => q.id === id)
    if (!row) return;

    if (action === 'Start') {
      navigate(`/doctor/patient/${row.patientId}?visitId=${row.visitId}`)
    }
  }

  const filteredQueue = useMemo(() => {
    return queueRows.filter(q => {
      // Doctors only see their own assigned patients
      if (canManageClinical && currentUser?.staffId) {
        if (q.assignedDoctorId !== currentUser.staffId) return false
      }

      // Visit Type Filter (Walk-in vs Appointment)
      if (visitTypeFilter !== 'all' && q.visitType !== visitTypeFilter) {
        return false
      }

      // Search filter
      return q.name.toLowerCase().includes(search.toLowerCase()) || 
             q.patientId.toLowerCase().includes(search.toLowerCase()) ||
             q.reasonForVisit.toLowerCase().includes(search.toLowerCase())
    })
  }, [queueRows, canManageClinical, currentUser, visitTypeFilter, search])

  const exportQueue = (format: 'pdf' | 'xlsx' | 'csv') => {
    const query = new URLSearchParams({
      format,
      ...(search ? { search } : {}),
      ...(visitTypeFilter !== 'all' ? { visitType: visitTypeFilter } : {})
    }).toString();
    api.download(`/api/queue/export?${query}`, `queue_export.${format}`);
  }

function QueuePatientCell({ 
  row, 
  isOpen, 
  onToggle 
}: { 
  row: any; 
  isOpen: boolean; 
  onToggle: () => void; 
}) {
  const pending = row.original.pendingTreatments || [];
  const hasTreatments = pending.length > 0;

  return (
    <div 
      className="space-y-1.5"
      onDoubleClick={() => {
        if (hasTreatments) onToggle();
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-900 cursor-default">{row.original.name}</span>
        {hasTreatments && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 shadow-2xs transition-colors cursor-pointer select-none"
            title={isOpen ? "Click to collapse procedures" : "Click to view procedures"}
          >
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>{pending.length} {pending.length === 1 ? 'Procedure' : 'Procedures'}</span>
            <ChevronDown className={`w-3 h-3 text-amber-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {hasTreatments && isOpen && (
        <div className="space-y-1 pt-1 pl-2 border-l-2 border-amber-300">
          {pending.map((pt: any, idx: number) => {
            const nextNum = pt.nextSession?.sittingNumber || (pt.completedCount + 1);
            const schedDate = pt.nextSession?.plannedDate
              ? new Date(pt.nextSession.plannedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : null;
            const teeth = parseTeeth(pt);
            const teethTag = teeth.length > 0 ? (teeth.length === 1 ? ` #${teeth[0]}` : ` #${teeth.join(', ')}`) : '';
            const teethLabel = formatTeethLabel(pt);
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs max-w-full truncate"
                title={`Unfinished treatment: ${pt.treatmentName}${teeth.length > 0 ? ` (${teethLabel})` : ''} • Sitting ${nextNum}/${pt.totalSittings}${schedDate ? ` • Scheduled: ${schedDate}` : ''}`}
              >
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate">
                  {pt.treatmentName}{teethTag} • Sitting {nextNum}/{pt.totalSittings}
                  {schedDate ? ` • ${schedDate}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

  const columns: ColumnDef<QueueRow>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Patient Name",
      cell: ({ row }) => {
        const patientKey = row.original.patientId || row.original.id;
        const isOpen = !!expandedProcedureIds[patientKey];
        return (
          <QueuePatientCell
            row={row}
            isOpen={isOpen}
            onToggle={() => {
              setExpandedProcedureIds(prev => ({
                ...prev,
                [patientKey]: !prev[patientKey]
              }));
            }}
          />
        );
      }
    },
    {
      accessorKey: "reasonForVisit",
      header: "Reason for Visit",
      cell: ({ row }) => {
        const { primary, sub } = parseReasonForVisit(row.original.reasonForVisit)
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-slate-700">{primary || row.original.reasonForVisit}</span>
            {sub && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                {sub}
              </span>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: "visitType",
      header: "Visit Type",
      cell: ({ row }) => {
        const type = row.original.visitType
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            type === 'Walk-in' 
              ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
              : 'bg-purple-50 text-purple-700 border border-purple-200/60'
          }`}>
            {type}
          </span>
        )
      }
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
      accessorKey: "discount",
      header: "Doctor Discount",
      cell: ({ row }) => {
        const item = row.original;
        const normalizedStatus = (item.status || '').toLowerCase().trim();
        const isReadyForReception = normalizedStatus === 'ready at reception' || 
                                    normalizedStatus === 'ready for reception' || 
                                    normalizedStatus === 'ready for payment' ||
                                    normalizedStatus === 'dispensing' ||
                                    normalizedStatus === 'payment';

        if (!isReadyForReception) {
          return <span className="text-slate-400 text-xs pl-4 font-medium">Nil</span>;
        }

        const discount = item.discount || 0;
        const hasDiscount = discount > 0;

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDiscountModalRow(item);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shadow-xs ${
              hasDiscount
                ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 font-semibold cursor-pointer'
                : 'bg-slate-50 text-slate-600 border border-dashed border-slate-300 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer'
            }`}
            title={hasDiscount ? `Discount: ₹${discount}${item.discountReason ? ` (${item.discountReason})` : ''} — Click to view breakup / edit` : 'Click to give discount & view bill breakup'}
          >
            <Tag className={`w-3.5 h-3.5 ${hasDiscount ? 'text-amber-600' : 'text-slate-400'}`} />
            {hasDiscount ? (
              <span>
                Discount: <span className="font-bold text-amber-900">₹{discount}</span>
              </span>
            ) : (
              <span>Nil <span className="text-[10px] text-slate-400 font-normal">(+ Add)</span></span>
            )}
          </button>
        );
      }
    },
    {
      accessorKey: "action",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        const normalizedStatus = (item.status || '').toLowerCase().trim();
        const isReadyForReception = normalizedStatus === 'ready at reception' || 
                                    normalizedStatus === 'ready for reception' || 
                                    normalizedStatus === 'ready for payment' ||
                                    normalizedStatus === 'dispensing' ||
                                    normalizedStatus === 'payment';

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
          } else if (isReadyForReception) {
            actionButton = (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Ready at Reception
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditTreatmentRow(item)}
                  className="h-7.5 px-2.5 text-xs font-bold border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-400 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Edit procedures for this patient"
                >
                  <Edit2 className="w-3.5 h-3.5 text-teal-600" />
                  Edit Treatment
                </Button>
              </div>
            );
          } else if (item.status === 'Paid' || item.status === 'Completed') {
            actionButton = (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                {item.status}
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
            {actionButton ? actionButton : (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                {item.status}
              </span>
            )}
          </div>
        );
      }
    }
  ], [expandedProcedureIds, canManageClinical, consultations]);

  return (
    <div className="space-y-6 pb-8 w-full min-w-0">
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col w-full min-w-0">
        <DataTableToolbar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search patient, ID or reason..."
          filterSlot={
            <div className="flex items-center gap-2">
              <Select 
                value={visitTypeFilter} 
                onValueChange={(val: 'all' | 'Walk-in' | 'Appointment') => setVisitTypeFilter(val)}
              >
                <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200 text-xs font-medium text-slate-700">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                  <SelectItem value="Appointment">Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          exportOptions={{
            pdf: true,
            excel: true,
            csv: true,
            onExport: exportQueue
          }}
        />

        <div className="p-2 sm:p-4 w-full min-w-0 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={filteredQueue}
            emptyState={
              search !== '' || visitTypeFilter !== 'all' ? (
                <DataTableEmpty 
                  icon={Search} 
                  title="No patients found" 
                  description={`No queue entries matching your filter criteria.`}
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

      {discountModalRow && (
        <DiscountModal
          isOpen={!!discountModalRow}
          onClose={() => setDiscountModalRow(null)}
          patientName={discountModalRow.name}
          patientId={discountModalRow.patientId}
          visitId={discountModalRow.visitId}
          consultationFee={discountModalRow.consultationFee}
          treatmentFee={discountModalRow.treatmentFee}
          medicineCost={discountModalRow.medicineCost}
          currentDiscount={discountModalRow.discount}
          currentDiscountReason={discountModalRow.discountReason}
          onApplyDiscount={handleApplyDiscount}
        />
      )}

      {/* Edit Treatment Modal (Opened directly from Queue when patient is at Reception) */}
      {editTreatmentRow && (
        <Dialog open={!!editTreatmentRow} onOpenChange={async (open) => {
          if (!open) {
            await editTreatmentRollbackRef.current();
            setEditTreatmentRow(null);
          }
        }}>
          <DialogContent className="max-w-7xl w-[96vw] max-w-full max-h-[96vh] flex flex-col p-0 gap-0 bg-slate-50 overflow-hidden">
            <DialogHeader className="px-3.5 sm:px-5 py-2.5 bg-white border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>Edit Treatment Plan — {editTreatmentRow.name}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      Fee Locked (Patient at Reception)
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Add or update clinical procedures. Total treatment fee is locked and cannot be modified here.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-2 sm:p-3 overflow-y-auto overflow-x-hidden flex-1 w-full min-w-0 [scrollbar-gutter:stable]">
              <TreatmentPlanUI
                key={`${editTreatmentRow.patientId}-${editTreatmentRow.visitId}`}
                patientId={editTreatmentRow.patientId}
                currentVisitId={editTreatmentRow.visitId}
                treatmentFee={editTreatmentRow.treatmentFee}
                isFeeLocked={true}
                onRegisterRollback={(fn) => { editTreatmentRollbackRef.current = fn; }}
                onDone={async () => {
                  setEditTreatmentRow(null);
                  await refreshClinicOperations();
                  toast.success('Treatment procedures updated');
                }}
                onCancel={async () => {
                  await editTreatmentRollbackRef.current();
                  setEditTreatmentRow(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
