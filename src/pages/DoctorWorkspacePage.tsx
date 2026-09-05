import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Search, Info, Edit, FileText, Pill, Plus, Minus, Trash2, GripVertical } from 'lucide-react'
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'

import { TreatmentPlanUI } from '../components/consultation/TreatmentPlanUI'
import type { PrescriptionLineItem } from '../components/prescription/prescription-components'
import { MEDICINE_CATEGORIES } from '../lib/medicine-categories'
import type { Medicine } from '../lib/mock-data'

import { useClinicContext } from '../context/ClinicContext'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

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

function RxRow({ item, onUpdateField, onRemove }: { item: PrescriptionLineItem; onUpdateField: (id: string, field: keyof PrescriptionLineItem, value: any) => void; onRemove: (id: string) => void }) {
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
        {/* Frequency */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Frequency</label>
          <Select value={item.frequency || ''} onValueChange={v => onUpdateField(item.id, 'frequency', v)}>
            <SelectTrigger className="h-9 bg-slate-50 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {FREQ_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
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
      {/* Instructions */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Instructions</label>
        <div className="flex gap-1.5 flex-wrap">
          {INSTRUCTION_OPTIONS.map(o => (
            <button
              key={o}
              onClick={() => onUpdateField(item.id, 'instructions', o)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                item.instructions === o
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              {o}
            </button>
          ))}
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

  const { visits, patients, consultations, prescriptions, medicines, saveConsultation, savePrescription } = useClinicContext()

  // Canonical Entities
  const visit = visits.find(v => v.id === visitId)
  const patient = patients.find(p => p.id === (visit ? visit.patientId : patientId))
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)

  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false)
  const [consultationModalOpen, setConsultationModalOpen] = useState(false)
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)

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
    }
  }, [consultation])

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
      dosage: '1 tablet',
      frequency: 'Twice daily',
      duration: '5 days',
      instructions: 'After meals'
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
        {/* Header Back */}
        <div className="mb-2">
          <Button variant="ghost" onClick={() => navigate('/queue')} className="text-slate-500 hover:text-slate-900 -ml-3 h-8">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
          </Button>
        </div>

        {/* Patient Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>

          <div className="w-24 h-24 shrink-0 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-2xl">
                {patient.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-slate-600">

              <div><span className="font-medium text-slate-900">Phone:</span> {patient.phone}</div>
              <div><span className="font-medium text-slate-900">Age/Gender:</span> {patient.age} / {patient.gender}</div>
              <div><span className="font-medium text-slate-900">Visit Type:</span> {visit.appointmentId ? 'Appointment' : 'Walk-in'}</div>
              <div><span className="font-medium text-slate-900">Patient Type:</span> {patientType}</div>
              <div className="md:col-span-2"><span className="font-medium text-slate-900">Reason for Visit:</span> {visit.reasonForVisit}</div>
            </div>
          </div>
        </div>

        {/* Main Workspace Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Current Visit Workspace</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setTreatmentModalOpen(true)} className="h-9 shadow-sm bg-white">
                <Plus className="mr-2 h-4 w-4 text-emerald-600" /> Treatment Plan
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConsultationModalOpen(true)} className="h-9 shadow-sm bg-white">
                <FileText className="mr-2 h-4 w-4 text-blue-600" /> Consultation
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPrescriptionModalOpen(true)} className="h-9 shadow-sm bg-white">
                <Pill className="mr-2 h-4 w-4 text-indigo-600" /> Prescription
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-8 min-h-[400px]">

            {/* Render Saved Sections */}
            {treatmentPlan && treatmentPlan.items.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Treatment Plan
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setTreatmentModalOpen(true)} className="h-8 px-2 text-slate-500 hover:text-slate-900">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 space-y-3">
                  {treatmentPlan.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-800">
                        {item.catalogItem?.name || item.treatmentName || 'Unknown Treatment'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-white border border-slate-200">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consultation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> Consultation
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setConsultationModalOpen(true)} className="h-8 px-2 text-slate-500 hover:text-slate-900">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
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
                  <div className="flex gap-6 pt-2 border-t border-slate-200/60">
                    <div><strong className="text-slate-900">Consultation Fee:</strong> ₹{consultation.consultationFee}</div>
                    <div><strong className="text-slate-900">Treatment Fee:</strong> ₹{(consultation as any).treatmentFee || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {prescription && prescription.items.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" /> Prescription
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setPrescriptionModalOpen(true)} className="h-8 px-2 text-slate-500 hover:text-slate-900">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase border-b border-slate-200/60">
                      <tr>
                        <th className="pb-2 font-semibold">Medicine</th>
                        <th className="pb-2 font-semibold">Dosage</th>
                        <th className="pb-2 font-semibold">Freq/Duration</th>
                        <th className="pb-2 font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {prescription.items.map(item => {
                        const medName = medicines.find(m => m.id === item.medicineId)?.name || 'Unknown'
                        return (
                          <tr key={item.id}>
                            <td className="py-3 font-medium text-slate-900">{medName}</td>
                            <td className="py-3 text-slate-600">{item.dosage}</td>
                            <td className="py-3 text-slate-600">{item.frequency} for {item.duration}</td>
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
              <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full border border-dashed border-slate-200 flex items-center justify-center mb-4">
                  <Info className="w-6 h-6 text-slate-400" />
                </div>
                <p>No clinical records added yet for this visit.</p>
                <p className="text-sm mt-1">Use the buttons above to add a Treatment Plan, Consultation, or Prescription.</p>
              </div>
            )}

          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium" onClick={() => setCompleteModalOpen(true)}>
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
              <TreatmentPlanUI patientId={patient.id} currentVisitId={visitId!} />
            </div>
            <DialogFooter className="p-4 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0">
              <Button onClick={() => setTreatmentModalOpen(false)}>Done</Button>
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
              <div className="space-y-3">
                <Label htmlFor="reasonForVisit" className="text-sm font-semibold text-slate-700">Reason for Visit</Label>
                <Input id="reasonForVisit" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="clinicalNotes" className="text-sm font-semibold text-slate-700">Clinical Notes</Label>
                <Textarea id="clinicalNotes" className="min-h-[160px]" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div className="space-y-3">
                  <Label htmlFor="consultationFee" className="text-sm font-semibold text-slate-700">Consultation Fee (₹)</Label>
                  <Input id="consultationFee" type="number" min="0" step="50" value={consultationFee} onChange={(e) => setConsultationFee(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="treatmentFee" className="text-sm font-semibold text-slate-700">Treatment Fee (₹)</Label>
                  <Input id="treatmentFee" type="number" min="0" step="50" value={treatmentFee} onChange={(e) => setTreatmentFee(Number(e.target.value) || 0)} />
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

        {/* Complete Consultation Modal */}
        <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Consultation?</DialogTitle>
              <DialogDescription>
                This will complete the doctor's consultation and send the patient back to Reception.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
              <Button onClick={handleComplete} className="bg-indigo-600 hover:bg-indigo-700 text-white">Complete Consultation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
