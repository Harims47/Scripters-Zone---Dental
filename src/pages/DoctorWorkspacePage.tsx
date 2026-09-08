import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Search, Info, Edit, Eye, FileText, Pill, Plus, Minus, Trash2, GripVertical, Printer, History, Clock } from 'lucide-react'
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'

import { TreatmentPlanUI } from '../components/consultation/TreatmentPlanUI'
import { HistoricalVisitDetails } from '../components/history/HistoricalVisitDetails'
import type { PrescriptionLineItem } from '../components/prescription/prescription-components'
import { MEDICINE_CATEGORIES } from '../lib/medicine-categories'
import type { Medicine } from '../lib/mock-data'

import { useClinicContext } from '../context/ClinicContext'
import { api, API_BASE_URL } from '../lib/api'
import { cn } from '../lib/utils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

// ── Inline prescription sub-components (avoids Dialog portal DnD issues) ──

function MedBadge({ categoryId }: { categoryId: string }) {
  const cat = MEDICINE_CATEGORIES[categoryId]
  if (!cat) return null
  return (
    <Badge variant="outline" className={cn(cat.bgClass, cat.textClass, cat.borderClass, 'font-medium text-[10px] uppercase tracking-wider')}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', cat.dotClass)} />
      {cat.displayName}
    </Badge>
  )
}

function DraggableMedItem({ medicine, onAdd }: { medicine: Medicine; onAdd: (med: Medicine) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: medicine.id, data: medicine })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center p-3 bg-white border rounded-lg shadow-sm select-none gap-2 transition-colors hover:border-indigo-300 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 ring-2 ring-indigo-400 z-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm leading-tight">{medicine.name}</div>
        <div className="text-xs text-slate-400 mt-0.5">{medicine.form} · {medicine.unit}</div>
        <div className="mt-1"><MedBadge categoryId={medicine.categoryId} /></div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onAdd(medicine) }}
      >
        <Plus className="h-4 w-4 mr-1" /> Add
      </Button>
    </div>
  )
}

function PrescriptionDropArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'rx-drop' })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex flex-col rounded-xl border-2 transition-all duration-150 min-h-[300px] p-3 overflow-y-auto',
        isOver ? 'border-indigo-400 bg-indigo-50/40 border-dashed' : 'border-transparent bg-slate-50'
      )}
    >
      {children}
    </div>
  )
}

const DOSAGE_OPTIONS = [
  '½ Tablet',
  '1 Tablet',
  '1½ Tablets',
  '2 Tablets',
  '3 Tablets',
  '½ Capsule',
  '1 Capsule',
  '2 Capsules',
  '5 ml',
  '10 ml',
  '15 ml',
  '1 Drop',
  '2 Drops',
  '1 Sachet',
]
const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'At bedtime', 'As needed']
const DURATION_OPTIONS = ['1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days']
const INSTRUCTION_OPTIONS = [
  'Before Breakfast',
  'After Breakfast',
  'Before Lunch',
  'After Lunch',
  'Before Dinner',
  'After Dinner',
]

const CLINICAL_NOTE_TAGS = [
  'Routine Examination',
  'Mild Gingivitis',
  'Deep Caries',
  'Acute Pulpitis',
  'Calculus & Plaque',
  'Tooth Mobility',
  'Sensitivity',
  'Scaling Advised',
  'RCT Advised',
  'Extraction Advised'
]

function RxRow({ item, onUpdateField, onRemove }: { item: PrescriptionLineItem; onUpdateField: (id: string, field: keyof PrescriptionLineItem, value: any) => void; onRemove: (id: string) => void }) {
  const selectedInstructions = item.instructions
    ? item.instructions.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const toggleInstruction = (inst: string) => {
    let next: string[]
    if (selectedInstructions.includes(inst)) {
      next = selectedInstructions.filter(i => i !== inst)
    } else {
      next = [...selectedInstructions, inst]
    }
    const joined = next.join(', ')
    onUpdateField(item.id, 'instructions', joined)

    // Automatically calculate and sync frequency based on meal instruction count
    let autoFreq = 'Once daily'
    if (next.length === 2) autoFreq = 'Twice daily'
    else if (next.length === 3) autoFreq = 'Three times daily'
    else if (next.length >= 4) autoFreq = 'Four times daily'
    else if (next.length === 1) {
      if (next[0].includes('Dinner')) autoFreq = 'At bedtime'
      else autoFreq = 'Once daily'
    }
    onUpdateField(item.id, 'frequency', autoFreq)
  }

  const isLowStock = item.currentStock <= (item.stockWarningLevel || 10)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-900 text-sm">{item.name} <span className="text-slate-400 font-normal text-xs ml-1">{item.unit}</span></div>
          <div className="mt-1"><MedBadge categoryId={item.categoryId} /></div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qty</label>
          <div className="flex items-center border rounded-md overflow-hidden bg-slate-50">
            <button className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={() => onUpdateField(item.id, 'quantity', Math.max(1, item.quantity - 1))}><Minus className="h-3 w-3" /></button>
            <input
              className="w-full text-center text-sm font-semibold bg-transparent border-0 outline-none py-1.5"
              value={item.quantity}
              onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onUpdateField(item.id, 'quantity', v) }}
            />
            <button className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" onClick={() => onUpdateField(item.id, 'quantity', item.quantity + 1)}><Plus className="h-3 w-3" /></button>
          </div>
        </div>
        {/* Dosage */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dosage</label>
          <Select value={item.dosage || ''} onValueChange={v => onUpdateField(item.id, 'dosage', v)}>
            <SelectTrigger className="h-9 bg-slate-50 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {DOSAGE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Available Stock (Count only) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Available Stock</label>
          <div className={cn(
            "h-9 px-3 rounded-md border flex items-center justify-between text-xs font-semibold",
            isLowStock
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          )}>
            <span className="font-bold text-sm">{item.currentStock}</span>
            <span className={cn(
              "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
              isLowStock ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
            )}>
              {isLowStock ? 'Low' : 'In Stock'}
            </span>
          </div>
        </div>
        {/* Duration */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Duration</label>
          <Select value={item.duration || ''} onValueChange={v => onUpdateField(item.id, 'duration', v)}>
            <SelectTrigger className="h-9 bg-slate-50 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Instructions (Multi-select) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Instructions (Select All That Apply)</label>
          {selectedInstructions.length > 0 && (
            <span className="text-[11px] text-indigo-600 font-medium">
              {item.frequency || (selectedInstructions.length === 1 ? 'Once daily' : selectedInstructions.length === 2 ? 'Twice daily' : `${selectedInstructions.length} times daily`)}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {INSTRUCTION_OPTIONS.map(o => {
            const isSelected = selectedInstructions.includes(o)
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggleInstruction(o)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium',
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                {isSelected && <span className="text-[10px]">✓</span>}
                {o}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function DoctorWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const patientId = id;
  const [searchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')
  const navigate = useNavigate()

  const { visits, patients, consultations, prescriptions, medicines, saveConsultation, savePrescription, queue, staff, assignDoctor } = useClinicContext()

  // Canonical Entities
  const visit = visits.find(v => v.id === visitId)
  const patient = patients.find(p => p.id === (visit ? visit.patientId : patientId))
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)
  const visitDoctor = staff.find(s => s.id === visit?.doctorId)

  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false)
  const [viewTreatmentModalOpen, setViewTreatmentModalOpen] = useState(false)
  const [consultationModalOpen, setConsultationModalOpen] = useState(false)
  const [viewConsultationModalOpen, setViewConsultationModalOpen] = useState(false)
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false)
  const [viewPrescriptionModalOpen, setViewPrescriptionModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferDoctorId, setTransferDoctorId] = useState<string>('')
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [viewingHistoricalVisitId, setViewingHistoricalVisitId] = useState<string | null>(null)

  // Consultation state
  const [reason, setReason] = useState(visit?.reasonForVisit || '')
  const [notes, setNotes] = useState('')
  const [consultationFee, setConsultationFee] = useState<number>(500)
  const [treatmentFee, setTreatmentFee] = useState<number>(0)

  // Prescription State
  const [activePrescription, setActivePrescription] = useState<PrescriptionLineItem[]>([])
  const [medSearch, setMedSearch] = useState('')

  // Local Treatment Plan State for preview
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null)

  useEffect(() => {
    if (patientId) {
      api.get<any>(`/api/patients/${patientId}/treatment-plan`)
        .then(res => setTreatmentPlan(res))
        .catch(console.error)
    }
  }, [patientId, treatmentModalOpen]) // Re-fetch when treatment modal closes

  useEffect(() => {
    if (consultation) {
      setReason(consultation.reasonForVisit)
      setNotes(consultation.clinicalNotes)
      if (consultation.consultationFee !== undefined) setConsultationFee(consultation.consultationFee)
      if ((consultation as any).treatmentFee !== undefined) setTreatmentFee((consultation as any).treatmentFee)
    } else if (visit?.reasonForVisit) {
      setReason(visit.reasonForVisit)
    }
  }, [consultation, visit?.reasonForVisit])


  useEffect(() => {
    if (prescription) {
      const mappedItems = prescription.items.map(item => {
        const med = medicines.find(m => m.id === item.medicineId)
        return {
          id: item.medicineId,
          name: med?.name || 'Unknown',
          categoryId: med?.categoryId || 'cat1',
          form: med?.form || 'Other',
          unit: med?.unit || 'Units',
          stockWarningLevel: med?.stockWarningLevel || 0,
          currentStock: med?.currentStock || 0,
          quantity: item.quantity,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        }
      })
      setActivePrescription(mappedItems as any[])
    } else {
      setActivePrescription([])
    }
  }, [prescription, medicines])

  const handlePrintPrescription = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/prescription/${visitId}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to generate prescription');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const rxSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  if (!patient || !visit) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-xl font-bold text-slate-800">Invalid Visit Context</h2>
        <p className="text-slate-500 mt-2">Could not load the requested visit details.</p>
        <Button onClick={() => navigate('/queue')} className="mt-6">Return to Queue</Button>
      </div>
    )
  }

  const patientVisits = visits.filter(v => v.patientId === patient.id)
  const hasPastCompletedVisit = patientVisits.some(v => v.id !== visit.id && v.status === 'Completed')
  const patientType = hasPastCompletedVisit ? 'Existing Patient' : 'New Patient'

  // --- Handlers ---
  const handleSaveConsultation = async () => {
    if (visitId) {
      await saveConsultation(visitId, {
        reasonForVisit: reason,
        clinicalNotes: notes,
        consultationFee,
        treatmentFee: treatmentFee as any
      })
      setConsultationModalOpen(false)
    }
  }

  const handleSavePrescription = async () => {
    if (!visitId || activePrescription.length === 0) {
      setPrescriptionModalOpen(false)
      return
    }
    const result = await savePrescription({
      visitId,
      patientId: patient.id,
      doctorId: visit.doctorId || '',
      notes: '',
      items: activePrescription.map(item => ({
        medicineId: item.id,
        quantity: item.quantity,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions
      }))
    })
    if (result.success) {
      setPrescriptionModalOpen(false)
    } else {
      alert('Failed to save prescription: ' + result.error)
    }
  }

  const handleComplete = async () => {
    if (visitId) {
      try {
        const result = await saveConsultation(visitId, { reasonForVisit: '', clinicalNotes: '' }, true)
        if (result.success) {
          setCompleteModalOpen(false)
          navigate('/queue')
        } else {
          alert('Failed to complete consultation: ' + result.error)
        }
      } catch (err) {
        console.error(err)
        alert('Failed to complete consultation')
      }
    }
  }

  const handleTransfer = async () => {
    const queueEntry = queue.find(q => q.visitId === visitId);
    if (!queueEntry) {
      alert("Queue entry not found for this visit");
      return;
    }
    if (!transferDoctorId) return;

    try {
      const result = await assignDoctor(queueEntry.id, transferDoctorId);
      if (result.success) {
        setTransferModalOpen(false);
        navigate('/queue');
      } else {
        alert('Failed to transfer patient: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to transfer patient');
    }
  }

  // --- Prescription Helpers ---
  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(medSearch.toLowerCase()) ||
      med.genericName?.toLowerCase().includes(medSearch.toLowerCase())
    return matchesSearch && med.currentStock > 0
  })

  const handleRxDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && over.id === 'rx-drop') {
      const med = active.data.current as Medicine
      if (med) handleAddMedicine(med)
    }
  }

  const handleAddMedicine = (med: Medicine) => {
    if (activePrescription.some(item => item.id === med.id)) return
    const newItem: PrescriptionLineItem = {
      id: med.id,
      name: med.name,
      categoryId: med.categoryId,
      form: med.form,
      unit: med.unit,
      stockWarningLevel: med.stockWarningLevel,
      currentStock: med.currentStock,
      quantity: 1,
      dosage: '1 Tablet',
      frequency: 'Twice daily',
      duration: '5 days',
      instructions: 'After Breakfast, After Dinner'
    }
    setActivePrescription(prev => [...prev, newItem])
  }

  const updateItemField = (id: string, field: keyof PrescriptionLineItem, value: any) => {
    setActivePrescription(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }
  const removeItem = (id: string) => {
    setActivePrescription(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-4">
        {/* Header Back & Action Buttons */}
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-start gap-4">
          <Button variant="ghost" onClick={() => navigate('/queue')} className="text-slate-500 hover:text-slate-900 -ml-3 h-8">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setTreatmentModalOpen(true)} className="h-9 shadow-sm bg-white border-slate-200">
              <Plus className="mr-2 h-4 w-4 text-emerald-600" /> Treatment Plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConsultationModalOpen(true)} className="h-9 shadow-sm bg-white border-slate-200">
              <FileText className="mr-2 h-4 w-4 text-blue-600" /> Consultation
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrescriptionModalOpen(true)} className="h-9 shadow-sm bg-white border-slate-200">
              <Pill className="mr-2 h-4 w-4 text-indigo-600" /> Prescription
            </Button>
          </div>
        </div>

        {/* Patient Summary Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold  uppercase tracking-wider">Patient Summary</h3>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 whitespace-nowrap">Reason for Visit:</span>
                <span className="bg-slate-50 px-3 py-1 rounded border border-slate-100 text-slate-800 truncate max-w-xs">
                  {visit.reasonForVisit || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 whitespace-nowrap">Date:</span>
                <span className="whitespace-nowrap text-slate-700">{new Date(visit.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 whitespace-nowrap">Time:</span>
                <span className="whitespace-nowrap text-slate-700">{new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            {/* Left: Photo */}
            <div className="w-24 h-24 shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden rounded-md">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-medium">{patient.name.charAt(0)}</span>
              )}
            </div>

            {/* Right: Details (3 Columns) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm text-slate-700 min-w-0">

              {/* Column 1: Identity */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 truncate">{patient.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 whitespace-nowrap">Patient ID:</span>
                  <span className="whitespace-nowrap">{patient.id.split('-')[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 whitespace-nowrap">Location:</span>
                    <span className="text-slate-600 truncate">{patient.address || 'Not provided'}</span>
                  </div>

                </div>
              </div>

              {/* Column 2: Demographics */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 whitespace-nowrap">Age:</span> <span className="whitespace-nowrap">{patient.age}</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 whitespace-nowrap">Gender:</span> <span className="whitespace-nowrap">{patient.gender}</span></div>
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 whitespace-nowrap">Phone:</span> <span className="whitespace-nowrap">{patient.phone}</span></div>
              </div>

              {/* Column 3: Encounter Details */}
              <div className="space-y-4 pt-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 whitespace-nowrap">Patient Type:</span> <span className="truncate">{patientType}</span></div>
                  <div className="flex items-center gap-2"><span className="font-semibold text-slate-900 whitespace-nowrap">Visit Type:</span> <span className="truncate">{visit.appointmentId ? 'Appointment' : 'Walk-in'}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 whitespace-nowrap">Assigned Doctor:</span>
                    <span className="truncate">{visitDoctor?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryDrawerOpen(true)}
                    className="w-full sm:w-auto text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm font-medium flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    View Patient History
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Workspace Sections */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[400px] content-start">

            {/* Render Saved Sections */}
            {treatmentPlan && treatmentPlan.items.length > 0 && (
              <div className="md:col-span-6 space-y-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Treatment Plan
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setViewTreatmentModalOpen(true)} className="h-8 px-3 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">
                      <Eye className="h-4 w-4 mr-1.5" /> View
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setTreatmentModalOpen(true)} className="h-8 px-3 text-slate-700 bg-slate-100 hover:bg-slate-200 border-0">
                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 text-sm text-slate-700 space-y-4">
                  <div>
                    <strong className="block mb-1 text-slate-900">Procedures</strong>
                    <div className="space-y-2">
                      {treatmentPlan.items.map((item: any) => {
                        const procedure = item.catalogItem?.name || item.treatmentName || 'Unknown Treatment'
                        const variant = item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''
                        const category = item.catalogItem?.category || item.category
                        const notes = item.notes

                        return (
                          <div key={item.id} className="text-slate-800">
                            <div>
                              <span className="font-medium text-slate-900">{procedure} {variant}</span>
                              {category && <span className="text-xs text-slate-500 ml-2">({category})</span>}
                            </div>
                            {notes && (
                              <div className="text-xs text-slate-600 mt-0.5 ml-1">
                                Tooth / Notes: {notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60">
                    <div><strong className="text-slate-900">Treatment Fee:</strong> ₹{treatmentFee}</div>
                  </div>
                </div>
              </div>
            )}

            {consultation && (
              <div className="md:col-span-6 space-y-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> Consultation
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setViewConsultationModalOpen(true)} className="h-8 px-3 text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-800">
                      <Eye className="h-4 w-4 mr-1.5" /> View
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConsultationModalOpen(true)} className="h-8 px-3 text-slate-700 bg-slate-100 hover:bg-slate-200 border-0">
                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 text-sm text-slate-700 space-y-4">
                  <div>
                    <strong className="block mb-1 text-slate-900">Reason for Visit</strong>
                    {consultation.reasonForVisit}
                  </div>
                  <div>
                    <strong className="block mb-1 text-slate-900">Clinical Notes</strong>
                    <div className="whitespace-pre-wrap">{consultation.clinicalNotes}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60">
                    <div><strong className="text-slate-900">Consultation Fee:</strong> ₹{consultation.consultationFee}</div>
                  </div>
                </div>
              </div>
            )}

            {prescription && prescription.items.length > 0 && (
              <div className="md:col-span-12 space-y-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" /> Prescription
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setViewPrescriptionModalOpen(true)} className="h-8 px-3 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800">
                      <Eye className="h-4 w-4 mr-1.5" /> View
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPrescriptionModalOpen(true)} className="h-8 px-3 text-slate-700 bg-slate-100 hover:bg-slate-200 border-0">
                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintPrescription} className="h-8 px-3 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                      <Printer className="h-4 w-4 mr-1.5" /> Print
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase border-b border-slate-200/60">
                      <tr>
                        <th className="pb-2 font-semibold">Medicine</th>
                        <th className="pb-2 font-semibold">Dosage</th>
                        <th className="pb-2 font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {prescription.items.map(item => {
                        const medName = medicines.find(m => m.id === item.medicineId)?.name || 'Unknown'
                        return (
                          <tr key={item.id}>
                            <td className="py-3 font-medium text-slate-900">
                              <div>{medName}</div>
                              {item.instructions && (
                                <div className="text-xs text-indigo-600 font-normal mt-0.5">{item.instructions}</div>
                              )}
                            </td>
                            <td className="py-3 text-slate-600">{item.dosage}</td>
                            <td className="py-3 font-medium text-slate-700">{item.quantity}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!treatmentPlan || treatmentPlan.items.length === 0) && !consultation && (!prescription || prescription.items.length === 0) && (
              <div className="md:col-span-12 text-center text-slate-400 py-12 flex flex-col items-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full border border-dashed border-slate-200 flex items-center justify-center mb-4">
                  <Info className="w-6 h-6 text-slate-400" />
                </div>
                <p>No clinical records added yet for this visit.</p>
                <p className="text-sm mt-1">Use the buttons above to add a Treatment Plan, Consultation, or Prescription.</p>
              </div>
            )}

          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-4 justify-end">
            <Button size="lg" variant="outline" className="text-slate-700 font-medium bg-white" onClick={() => setTransferModalOpen(true)}>
              Transfer Patient
            </Button>
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              onClick={async () => {
                const hasMedicines = (prescription && prescription.items && prescription.items.length > 0) || activePrescription.length > 0
                if (!hasMedicines) {
                  const res = await MySwal.fire({
                    title: 'No Medicines Prescribed',
                    text: 'You have not given any medicine for this patient. Do you still want to continue or cancel?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, Continue',
                    cancelButtonText: 'Cancel & Add Medicine',
                    confirmButtonColor: '#4f46e5', // indigo-600
                    cancelButtonColor: '#94a3b8', // slate-400
                    customClass: {
                      popup: 'rounded-2xl',
                      confirmButton: 'rounded-lg font-semibold px-6 py-2.5',
                      cancelButton: 'rounded-lg font-semibold px-6 py-2.5'
                    }
                  })
                  if (!res.isConfirmed) {
                    return
                  }

                  // Ask for the clinical reason why no medicines were prescribed
                  const reasonRes = await MySwal.fire({
                    title: 'Reason for No Medication',
                    text: 'Please select why no medicines are prescribed for this visit:',
                    icon: 'question',
                    input: 'select',
                    inputOptions: {
                      'Routine checkup / No medication needed': 'Routine checkup / No medication needed',
                      'Procedure completed under local anesthesia only (No post-op meds required)': 'Procedure completed under local anesthesia only (No post-op meds required)',
                      'Patient already on existing medication': 'Patient already on existing medication',
                      'Referred to specialist / external facility': 'Referred to specialist / external facility',
                      'Diagnostic only (X-ray / Consultation / Impressions)': 'Diagnostic only (X-ray / Consultation / Impressions)',
                      'Patient declined medication': 'Patient declined medication',
                      'Other': 'Other (Clinical judgement)'
                    },
                    inputPlaceholder: 'Select a reason...',
                    showCancelButton: true,
                    confirmButtonText: 'Continue',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#4f46e5',
                    cancelButtonColor: '#94a3b8',
                    inputValidator: (value) => {
                      if (!value) {
                        return 'Please select a reason to proceed'
                      }
                      return null
                    },
                    customClass: {
                      popup: 'rounded-2xl',
                      confirmButton: 'rounded-lg font-semibold px-6 py-2.5',
                      cancelButton: 'rounded-lg font-semibold px-6 py-2.5',
                      input: 'rounded-lg border-slate-200 text-sm'
                    }
                  })

                  if (!reasonRes.isConfirmed || !reasonRes.value) {
                    return
                  }

                  const selectedReason = reasonRes.value === 'Other' ? 'Other clinical judgement' : reasonRes.value
                  const noMedNote = `[No Medication Prescribed: ${selectedReason}]`

                  // Update notes in state and persist to consultation record
                  const updatedNotes = notes ? (notes.includes('[No Medication Prescribed:') ? notes.replace(/\[No Medication Prescribed:[^\]]+\]/, noMedNote) : `${notes}\n\n${noMedNote}`) : noMedNote
                  setNotes(updatedNotes)

                  if (visitId) {
                    await saveConsultation(visitId, {
                      reasonForVisit: reason || visit?.reasonForVisit || '',
                      clinicalNotes: updatedNotes,
                      consultationFee,
                      treatmentFee
                    })
                  }
                }
                setCompleteModalOpen(true)
              }}
            >
              Complete Consultation
            </Button>
          </div>
        </div>

        {/* Modals */}

        {/* Treatment Plan Modal */}
        <Dialog open={treatmentModalOpen} onOpenChange={setTreatmentModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-50 p-0 gap-0">
            <DialogHeader className="p-6 pb-4 bg-white border-b border-slate-100">
              <DialogTitle>Treatment Plan</DialogTitle>
            </DialogHeader>
            <div className="p-6 pb-20">
              <TreatmentPlanUI
                patientId={patient.id}
                currentVisitId={visitId!}
                treatmentFee={treatmentFee}
                onSaveTreatmentFee={async (newFee) => {
                  setTreatmentFee(newFee)
                  if (visitId) {
                    await saveConsultation(visitId, {
                      reasonForVisit: reason || visit?.reasonForVisit || '',
                      clinicalNotes: notes,
                      consultationFee,
                      treatmentFee: newFee
                    })
                  }
                }}
              />
            </div>
            <DialogFooter className="p-4 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0">
              <Button onClick={() => setTreatmentModalOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Treatment Plan Modal (Read-only) */}
        <Dialog open={viewTreatmentModalOpen} onOpenChange={setViewTreatmentModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Treatment Plan Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Planned Procedures</label>
                <div className="space-y-2.5 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {treatmentPlan?.items && treatmentPlan.items.length > 0 ? (
                    treatmentPlan.items.map((item: any) => {
                      const procedure = item.catalogItem?.name || item.treatmentName || 'Unknown Treatment'
                      const variant = item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''
                      const category = item.catalogItem?.category || item.category
                      const notes = item.notes

                      return (
                        <div key={item.id} className="text-sm">
                          <div className="font-semibold text-slate-900">
                            {procedure} {variant}
                            {category && <span className="text-xs font-medium text-slate-500 ml-2">({category})</span>}
                          </div>
                          {notes && (
                            <div className="text-xs text-slate-600 mt-0.5">
                              Tooth / Notes: <span className="font-medium text-slate-800">{notes}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-400">No procedures in treatment plan.</p>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Treatment Fee:</span>
                <span className="font-bold text-emerald-600 text-base">₹{treatmentFee}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewTreatmentModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Consultation Modal (Read-only) */}
        <Dialog open={viewConsultationModalOpen} onOpenChange={setViewConsultationModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Consultation Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Visit</label>
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium text-slate-800">
                  {reason || 'Not specified'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Notes</label>
                <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {notes || 'No clinical notes recorded.'}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Consultation Fee:</span>
                <span className="font-bold text-slate-900 text-base">₹{consultationFee}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewConsultationModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Consultation Modal */}
        <Dialog open={consultationModalOpen} onOpenChange={setConsultationModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Consultation Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Reason for Visit</Label>
                <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  {reason || 'Not specified'}
                </div>
                <p className="text-xs text-slate-400">Captured at registration — cannot be changed here.</p>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clinicalNotes" className="text-sm font-semibold text-slate-700">Clinical Notes</Label>
                  <span className="text-[11px] text-slate-400">Click tags to add/remove or type custom notes</span>
                </div>

                {/* Predefined Quick Tags (No scrollbar, wraps cleanly to fit screen) */}
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Dental Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CLINICAL_NOTE_TAGS.map((tag) => {
                      const isIncluded = notes.toLowerCase().includes(tag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isIncluded) {
                              // Remove tag from notes
                              const regex = new RegExp(`(^|\\n|,\\s*)${tag}(,\\s*|\\n|$)`, 'gi');
                              const cleaned = notes.replace(regex, '$1').replace(/(^,\s*|,\s*$)/g, '').trim();
                              setNotes(cleaned);
                            } else {
                              // Append tag with comma or newline
                              const newNotes = notes.trim() ? `${notes.trim()}, ${tag}` : tag;
                              setNotes(newNotes);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium ${isIncluded
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50'
                            }`}
                        >
                          {isIncluded && <span className="text-[10px]">✓</span>}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Textarea
                  id="clinicalNotes"
                  className="min-h-[110px] text-sm leading-relaxed"
                  placeholder="Enter clinical observations, diagnoses, patient symptoms, or select from the tags above..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="border-t border-slate-100 pt-6">
                <div className="space-y-3 max-w-xs">
                  <Label htmlFor="consultationFee" className="text-sm font-semibold text-slate-700">Consultation Fee (₹)</Label>
                  <Input id="consultationFee" type="number" min="0" step="50" value={consultationFee} onChange={(e) => setConsultationFee(Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConsultationModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveConsultation}>Save Consultation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Prescription Modal — DndContext lives INSIDE the Dialog to avoid portal issues */}
        <Dialog open={prescriptionModalOpen} onOpenChange={setPrescriptionModalOpen}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 bg-white border-b border-slate-100 shrink-0">
              <DialogTitle>Prescription</DialogTitle>
            </DialogHeader>

            <DndContext sensors={rxSensors} onDragEnd={handleRxDragEnd}>
              <div className="flex-1 overflow-hidden grid grid-cols-5 gap-0 min-h-0">

                {/* ── Left: Medicine catalog ── */}
                <div className="col-span-2 border-r border-slate-100 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search medicines..."
                        className="pl-9 h-9 text-sm bg-white"
                        value={medSearch}
                        onChange={e => setMedSearch(e.target.value)}
                        autoFocus={false}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {filteredMedicines.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm">No medicines in stock.</div>
                    ) : (
                      filteredMedicines.map(med => (
                        <DraggableMedItem key={med.id} medicine={med} onAdd={handleAddMedicine} />
                      ))
                    )}
                  </div>
                </div>

                {/* ── Right: Prescription drop area ── */}
                <div className="col-span-3 flex flex-col overflow-hidden bg-slate-50/30">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prescribed Medicines</span>
                    <span className="text-xs text-slate-400">{activePrescription.length} item{activePrescription.length !== 1 ? 's' : ''}</span>
                  </div>
                  <PrescriptionDropArea>
                    {activePrescription.length === 0 ? (
                      <div className="m-auto flex flex-col items-center text-center text-slate-400 py-12 px-4">
                        <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                          <Pill className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500 text-sm">No medicines added yet</p>
                        <p className="text-xs mt-1 text-slate-400">Drag from the catalog or click <strong>+ Add</strong></p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activePrescription.map(item => (
                          <RxRow
                            key={item.id}
                            item={item}
                            onUpdateField={updateItemField}
                            onRemove={removeItem}
                          />
                        ))}
                      </div>
                    )}
                  </PrescriptionDropArea>
                </div>
              </div>
            </DndContext>

            <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 shrink-0">
              <Button variant="outline" onClick={() => setPrescriptionModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSavePrescription}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={activePrescription.length === 0}
              >
                Save Prescription ({activePrescription.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Prescription Modal (Read-only) */}
        <Dialog open={viewPrescriptionModalOpen} onOpenChange={setViewPrescriptionModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                Prescription Details
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase border-b border-slate-200/60 bg-white/70">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Medicine</th>
                      <th className="px-3 py-2.5 font-semibold">Dosage</th>
                      <th className="px-3 py-2.5 font-semibold">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70">
                    {prescription?.items && prescription.items.length > 0 ? (
                      prescription.items.map(item => {
                        const medName = medicines.find(m => m.id === item.medicineId)?.name || 'Unknown'
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div>{medName}</div>
                              {item.instructions && (
                                <div className="text-xs text-indigo-600 font-normal mt-0.5">{item.instructions}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-600">{item.dosage || '-'}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800">{item.quantity}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                          No medicines prescribed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintPrescription} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                <Printer className="h-4 w-4 mr-1.5" /> Print Prescription
              </Button>
              <Button onClick={() => setViewPrescriptionModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Modal */}
        <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Consultation?</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-slate-500">
                This will complete the doctor's consultation and send the patient back to Reception.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
              <Button onClick={handleComplete} className="bg-indigo-600 hover:bg-indigo-700 text-white">Complete Consultation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Modal */}
        <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer Patient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-500">
                Select another doctor to transfer this patient to. They will be placed in the selected doctor's queue.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Doctor</label>
                <Select value={transferDoctorId} onValueChange={setTransferDoctorId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {staff.filter(s => ['Head Doctor', 'Duty Doctor'].includes(s.role) && s.status === 'Active').map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({d.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={!transferDoctorId}>Transfer Patient</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Patient History Drawer */}
        <Sheet open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
          <SheetContent side="right" className="w-[450px] sm:w-[580px] p-0 flex flex-col bg-slate-50 h-full">
            <SheetTitle className="sr-only">Patient History</SheetTitle>

            {/* Drawer Header */}
            <div className="h-16 pl-6 pr-14 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">Patient History</h2>
              </div>
              <Badge variant="outline" className="bg-slate-100 text-slate-600 text-xs font-mono font-medium">
                {patient.id.split('-')[0].toUpperCase()}
              </Badge>
            </div>

            {/* Current Patient Header Bar */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{patient.age} Yrs, {patient.gender}</span>
                    <span>•</span>
                    <span>{patient.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Current Visit</span>
                  <Badge variant="secondary" className="mt-0.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-100">
                    Active in Workspace
                  </Badge>
                </div>
              </div>
            </div>

            {/* Previous Visits List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previous Visits</h4>
                <span className="text-xs text-slate-400 font-medium">
                  {patientVisits.filter(v => v.id !== visit.id).length} previous record{patientVisits.filter(v => v.id !== visit.id).length !== 1 ? 's' : ''}
                </span>
              </div>

              {(() => {
                const previousVisits = patientVisits
                  .filter(v => v.id !== visit.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (previousVisits.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400">
                      <div className="w-12 h-12 bg-slate-50 rounded-full border border-dashed border-slate-200 flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600 text-sm">No previous visit history.</p>
                      <p className="text-xs text-slate-400 mt-1">This is the patient's first documented visit at DentalCore.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {previousVisits.map((prevVisit) => {
                      const prevDoctor = staff.find((s: any) => s.id === prevVisit.doctorId);
                      const isCompleted = prevVisit.status === 'COMPLETED' || prevVisit.status === 'Completed';
                      const isCancelled = prevVisit.status === 'CANCELLED' || prevVisit.status === 'Cancelled';

                      return (
                        <div
                          key={prevVisit.id}
                          className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {new Date(prevVisit.createdAt).toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(prevVisit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Badge
                                  className={cn(
                                    "text-[10px] px-2 py-0.5",
                                    isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      isCancelled ? "bg-rose-50 text-rose-700 border-rose-200" :
                                        "bg-slate-100 text-slate-700 border-slate-200"
                                  )}
                                >
                                  {prevVisit.status}
                                </Badge>
                              </div>

                              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                <span className="font-medium text-slate-700">Doctor:</span>
                                <span>{prevDoctor?.name || 'Unassigned Doctor'}</span>
                              </div>

                              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                <span className="font-medium text-slate-700">Type:</span>
                                <span>{prevVisit.appointmentId ? 'Appointment' : 'Walk-in'}</span>
                              </div>

                              <div className="text-xs text-slate-600">
                                <span className="font-medium text-slate-700">Reason: </span>
                                <span className="text-slate-800">{prevVisit.reasonForVisit || 'General Consultation'}</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingHistoricalVisitId(prevVisit.id)}
                              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 shrink-0 text-xs px-3 h-8 shadow-2xs"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <Button
                variant="outline"
                onClick={() => setHistoryDrawerOpen(false)}
                className="w-full text-slate-700"
              >
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Read-only Historical Visit Details Dialog */}
        <Dialog open={!!viewingHistoricalVisitId} onOpenChange={(open) => !open && setViewingHistoricalVisitId(null)}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-white">
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <History className="w-5 h-5 text-indigo-600" />
                Historical Visit Records
              </DialogTitle>
              <DialogDescription>
                Review the read-only clinical records for this completed visit.
              </DialogDescription>
            </DialogHeader>
            <div className="p-0">
              {viewingHistoricalVisitId && (
                <HistoricalVisitDetails
                  visitId={viewingHistoricalVisitId}
                />
              )}
            </div>
            <DialogFooter className="p-4 bg-white border-t border-slate-200">
              <Button variant="outline" onClick={() => setViewingHistoricalVisitId(null)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
