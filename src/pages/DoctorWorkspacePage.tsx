import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Stethoscope, CheckCircle2, Search, Info } from 'lucide-react'
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { PatientClinicalSummary, PatientVisitHistory } from '../components/consultation/consultation-components'
import { HistoricalVisitDetails } from '../components/history/HistoricalVisitDetails'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'

import { DraggableMedicineItem, PrescriptionDropZone, PrescriptionRow } from '../components/prescription/prescription-components'
import type { PrescriptionLineItem } from '../components/prescription/prescription-components'
import { MEDICINE_CATEGORIES } from '../lib/medicine-categories'
import { type Medicine } from '../lib/mock-data'

import { useClinicContext } from '../context/ClinicContext'
import { DEMO_STAFF } from '../lib/mock-data'

export function DoctorWorkspacePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')
  const navigate = useNavigate()
  
  const { visits, patients, consultations, prescriptions, medicines, saveConsultation, savePrescription } = useClinicContext()

  // 1. Resolve Canonical Entities
  const visit = visits.find(v => v.id === visitId)
  const patient = patients.find(p => p.id === (visit ? visit.patientId : patientId))
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)
  const assignedDoctor = DEMO_STAFF.find(d => d.id === visit?.doctorId)

  // 2. Local State for Form & History
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [selectedHistoryVisitId, setSelectedHistoryVisitId] = useState<string | null>(null)
  const [consultationFee, setConsultationFee] = useState<number>(500)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Prescription State
  const [activePrescription, setActivePrescription] = useState<PrescriptionLineItem[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [activeStep, setActiveStep] = useState<1 | 2>(1)

  // 3. Hydrate form when context changes
  useEffect(() => {
    if (consultation) {
      setReason(consultation.reasonForVisit)
      setNotes(consultation.clinicalNotes)
      if (consultation.consultationFee !== undefined) setConsultationFee(consultation.consultationFee)
    }
  }, [consultation])

  useEffect(() => {
    if (prescription) {
      setPrescriptionNotes(prescription.notes)
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
      setPrescriptionNotes('')
    }
  }, [prescription, medicines])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // --- ERROR / INVALID ROUTE ---
  if (!visit || !patient) {
    return (
      <div className="max-w-3xl mx-auto pt-16">
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Stethoscope className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invalid Visit</h2>
            <p className="text-slate-500 mt-2">The requested visit could not be found or has been removed.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/queue')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Queue
          </Button>
        </div>
      </div>
    )
  }

  // --- PRESCRIPTION ACTIONS ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event
    if (over && over.id === 'prescription-dropzone') {
      const draggedMed = active.data.current as Medicine
      if (draggedMed) handleAddMedicine(draggedMed)
    }
  }

  const handleAddMedicine = (med: Medicine) => {
    setActivePrescription(prev => {
      const existing = prev.find(p => p.id === med.id)
      if (existing) {
        return prev.map(p => p.id === med.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { ...med, quantity: 1 }]
    })
  }

  const updateItemField = (id: string, field: keyof PrescriptionLineItem, value: any) => {
    setActivePrescription(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const removeItem = (id: string) => {
    setActivePrescription(prev => prev.filter(p => p.id !== id))
  }

  // --- COMBINED ACTIONS ---
  const _saveBoth = async (isComplete: boolean) => {
    if (visit && assignedDoctor) {
      setErrorMsg(null)
      
      // 1. Save Consultation (Draft)
      // We always save the draft first, even if completing, to ensure data is saved before the state transition locks it.
      const consultRes = await saveConsultation(visit.id, { reasonForVisit: reason, clinicalNotes: notes, consultationFee }, false)
      
      if (!consultRes.success) {
        setErrorMsg(consultRes.error || 'Failed to save consultation draft.')
        return
      }

      // 2. Save Prescription
      if (activePrescription.length > 0 || prescription) {
        const rxRes = await savePrescription({
          visitId: visit.id,
          doctorId: assignedDoctor.id,
          status: 'Draft',
          notes: prescriptionNotes,
          items: activePrescription.map(p => ({
            id: `RXI-${Math.random().toString(36).substring(2, 9)}`,
            medicineId: p.id,
            quantity: p.quantity,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            instructions: p.instructions || ''
          }))
        })
        
        if (!rxRes.success) {
           setErrorMsg(rxRes.error || 'Failed to save prescription.')
           return
        }
      }

      // 3. Complete if requested
      if (isComplete) {
         const completeRes = await saveConsultation(visit.id, { reasonForVisit: reason, clinicalNotes: notes, consultationFee }, true)
         if (!completeRes.success) {
            setErrorMsg(completeRes.error || 'Failed to complete consultation.')
            return
         }
      }
    }
  }

  const handleSaveDraft = () => _saveBoth(false)
  const handleComplete = () => _saveBoth(true)

  // --- COMPLETED VIEW ---
  if (visit.status === 'READY_FOR_RECEPTION' || visit.status === 'COMPLETED' || visit.status === 'READY_FOR_PAYMENT') {
    return (
      <div className="max-w-3xl mx-auto pt-16">
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Consultation Completed</h2>
            <p className="text-lg text-slate-500 mt-2">Ready for Reception</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl inline-block mx-auto text-left min-w-[300px]">
            <p className="font-semibold text-slate-900 mb-1">Patient: {patient.name}</p>
            <p className="text-slate-600 font-mono text-sm mb-4">{patient.id} • {visit.id}</p>
            <Button className="w-full shadow-sm" variant="outline" onClick={() => navigate('/queue')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Queue
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Patient History Resolution
  const patientHistory = visits
    .filter(v => v.patientId === patient.id && v.status === 'COMPLETED' && v.id !== visitId)
    .map(v => {
      return {
        id: v.id,
        date: 'Completed Visit',
        title: v.reasonForVisit || 'Consultation completed',
        status: v.status
      }
    })

  const handleViewPastVisit = (id: string) => {
    setSelectedHistoryVisitId(id)
    setHistoryDrawerOpen(true)
  }

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(medSearch.toLowerCase())
    const matchesCat = catFilter === 'all' || m.categoryId === catFilter
    return matchesSearch && matchesCat
  })

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
        
        {/* Simple Navigation */}
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2" onClick={() => navigate('/queue')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
          </Button>
        </div>

        {/* Main Workspace */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium mb-4">
            {errorMsg}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Patient Context */}
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col gap-6">
            <PatientClinicalSummary 
              patientId={patient.id}
              name={patient.name}
              phone={patient.phone}
              age={patient.age}
              status={visit.status}
            />
            <PatientVisitHistory visits={patientHistory} onView={handleViewPastVisit} />
          </div>

          {/* RIGHT COLUMN: Clinical Input & Prescription */}
          <div className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6">
            
            {/* Stepper Header */}
            <div className="flex items-center gap-4 mb-2">
              <div className={`flex items-center gap-2 ${activeStep === 1 ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${activeStep === 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-transparent border-slate-200 text-slate-400'}`}>1</span>
                Clinical Notes
              </div>
              <div className="flex-1 h-px bg-slate-200 max-w-[40px]" />
              <div className={`flex items-center gap-2 ${activeStep === 2 ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${activeStep === 2 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-transparent border-slate-200 text-slate-400'}`}>2</span>
                Prescription
              </div>
            </div>

            {activeStep === 1 && (
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 flex-wrap justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-semibold text-slate-900">Consultation</h2>
                </div>
                {consultation?.status === 'In Progress' && (
                  <Badge variant="outline" className="text-slate-500 bg-slate-50">Draft Saved</Badge>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Reason for Visit (from Reception)</Label>
                  <Input 
                    placeholder="e.g. Toothache, Routine Checkup..." 
                    className="bg-slate-50/50 border-slate-200 text-slate-700"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Can be updated if the patient provides new information.</p>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <Label htmlFor="clinicalNotes" className="text-sm font-semibold text-slate-700">Clinical Notes</Label>
                  <Textarea id="clinicalNotes" placeholder="Enter detailed clinical findings, diagnosis, and treatment plan..." className="min-h-[160px] resize-y bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500/20" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="space-y-3 pt-6 border-t border-slate-100 max-w-sm">
                  <Label htmlFor="consultationFee" className="text-sm font-semibold text-slate-700">Consultation Fee (₹)</Label>
                  <Input id="consultationFee" type="number" min="0" step="50" className="bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500/20" value={consultationFee} onChange={(e) => setConsultationFee(Number(e.target.value) || 0)} />
                </div>
              </div>
              {/* Step 1 Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-8">
                <Button variant="outline" className="w-full sm:w-auto font-medium shadow-sm bg-white hover:bg-slate-50" onClick={handleSaveDraft}>
                  Save Draft
                </Button>
                <Button 
                  className="w-full sm:w-auto font-medium shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setActiveStep(2)}
                  disabled={!reason || !notes}
                >
                  Next: Prescription
                </Button>
              </div>
            </div>
            )}

            {activeStep === 2 && (
              <>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Medicine Palette */}
              <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[500px]">
                <div className="p-4 border-b bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900 mb-4 uppercase text-xs tracking-wider">Medicine Catalog</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search..." className="pl-9 h-9" value={medSearch} onChange={e => setMedSearch(e.target.value)} />
                    </div>
                    <Select value={catFilter} onValueChange={setCatFilter}>
                      <SelectTrigger className="w-[110px] h-9">
                        <SelectValue placeholder="Cat." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {Object.values(MEDICINE_CATEGORIES).map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                  {filteredMedicines.map(med => (
                    <DraggableMedicineItem key={med.id} medicine={med} onAdd={handleAddMedicine} />
                  ))}
                  {filteredMedicines.length === 0 && (
                    <div className="text-center p-6 text-slate-500 text-sm">No medicines found.</div>
                  )}
                </div>
              </div>

              {/* Prescription Dropzone */}
              <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-4 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 uppercase text-xs tracking-wider">Prescription</h3>
                  <div className="text-sm font-medium text-slate-500">
                    {activePrescription.length} items
                  </div>
                </div>

                <PrescriptionDropZone> 
                  <div className="flex flex-col gap-3 h-full">
                    {activePrescription.length === 0 ? (
                      <div className="m-auto flex flex-col items-center justify-center text-slate-400 max-w-sm text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-300">
                          <Info className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-600">No medicines prescribed</p>
                        <p className="text-sm mt-1">Drag or click medicines from the catalog to add them.</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto pr-2 space-y-3">
                        {activePrescription.map(item => (
                          <PrescriptionRow 
                            key={item.id} 
                            item={item} 
                            onUpdateField={updateItemField} 
                            onRemove={removeItem} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </PrescriptionDropZone>
              </div>
            </div>
              {/* Step 2 Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={() => setActiveStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clinical Notes
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto font-medium shadow-sm bg-white hover:bg-slate-50" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                  <Button 
                    className="w-full sm:w-auto font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleComplete}
                    disabled={!reason || !notes}
                  >
                    Complete Consultation & Generate Bill
                  </Button>
                </div>
              </div>
              </>
            )}

          </div>
        </div>

        {/* Historical Visit Dialog */}
        <Dialog open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historical Visit Details</DialogTitle>
              <DialogDescription>
                Review the read-only clinical records for this completed visit.
              </DialogDescription>
            </DialogHeader>
            {selectedHistoryVisitId && <HistoricalVisitDetails visitId={selectedHistoryVisitId} />}
          </DialogContent>
        </Dialog>

      </div>
    </DndContext>
  )
}
