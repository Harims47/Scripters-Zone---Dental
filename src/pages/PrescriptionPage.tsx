import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { Search, Info, ArrowLeft } from 'lucide-react'
import { PatientProfileHeader, DrawerSection } from '../components/ui/drawer-patterns'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { DraggableMedicineItem, PrescriptionDropZone, PrescriptionRow } from '../components/prescription/prescription-components'
import type { PrescriptionLineItem } from '../components/prescription/prescription-components'
import { MEDICINE_CATEGORIES } from '../lib/medicine-categories'
import { type Medicine } from '../lib/mock-data'
import { useClinicContext } from '../context/ClinicContext'

export function PrescriptionPage() {
  const [searchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')
  const navigate = useNavigate()
  
  const { visits, patients, prescriptions, medicines, savePrescription } = useClinicContext()

  // 1. Resolve Canonical Entities
  const visit = visits.find(v => v.id === visitId)
  const patient = patients.find(p => p.id === visit?.patientId)
  const prescription = prescriptions.find(p => p.visitId === visitId)

  // 2. Local State
  const [activePrescription, setActivePrescription] = useState<PrescriptionLineItem[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [notes, setNotes] = useState('')

  // 3. Hydrate state
  useEffect(() => {
    if (prescription) {
      setNotes(prescription.notes)
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
      setNotes('')
    }
  }, [prescription])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // --- ACTIONS ---
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

  const handleSave = (status: 'Draft' | 'Finalized') => {
    if (visit && patient) {
      savePrescription({
        visitId: visit.id,
        doctorId: visit.doctorId,
        status,
        notes,
        items: activePrescription.map(p => ({
          id: `RXI-${Math.random().toString(36).substring(2, 9)}`, // naive ID generator
          medicineId: p.id,
          quantity: p.quantity,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          instructions: p.instructions || ''
        }))
      })
      navigate(`/doctor/patient/${patient.id}?visitId=${visit.id}`)
    }
  }

  // --- INVALID ROUTE SAFEGUARD ---
  if (!visit || !patient) {
    return (
      <div className="max-w-3xl mx-auto pt-16">
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Info className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invalid Visit Context</h2>
            <p className="text-slate-500 mt-2">Cannot create or view a prescription without an active Visit.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/queue')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Queue
          </Button>
        </div>
      </div>
    )
  }

  // --- VIEW RENDER ---
  const totalQuantity = activePrescription.reduce((acc, cur) => acc + cur.quantity, 0)

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchesCat = catFilter === 'all' || m.categoryId === catFilter
    return matchesSearch && matchesCat
  })

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2" onClick={() => navigate(`/doctor/patient/${patient.id}?visitId=${visit.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Workspace
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden shrink-0">
            <PatientProfileHeader 
              name={patient.name} 
              patientId={patient.id} 
              phone={patient.phone} 
              modeText={`Prescription Workspace • ${visit.id}`} 
            />
          </div>
        </div>

        {/* 2-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Medicine Palette */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[600px]">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 mb-4 uppercase text-xs tracking-wider">Medicine Palette</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search medicines..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
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

          {/* RIGHT: Prescription Dropzone */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-4 flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 uppercase text-xs tracking-wider">Selected Medicines</h3>
                <div className="text-sm font-medium text-slate-500">
                  {activePrescription.length} items (Qty: {totalQuantity})
                </div>
              </div>

              {/* The Droppable Area */}
              <PrescriptionDropZone> 
                <div className="flex flex-col gap-3 h-full">
                  {activePrescription.length === 0 ? (
                    <div className="m-auto flex flex-col items-center justify-center text-slate-400 max-w-sm text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-300">
                        <Info className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600">No medicines added</p>
                      <p className="text-sm mt-1">Search for a medicine above to add it to this prescription.</p>
                    </div>
                  ) : (
                    activePrescription.map(item => (
                      <PrescriptionRow 
                        key={item.id} 
                        item={item} 
                        onUpdateField={updateItemField} 
                        onRemove={removeItem} 
                      />
                    ))
                  )}
                </div>
              </PrescriptionDropZone>
            </div>

            {/* Notes & Actions */}
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-5 space-y-4">
              <DrawerSection title="Clinical Notes (Optional)">
                <Textarea 
                  placeholder="Enter any additional instructions for the pharmacy or patient..." 
                  className="min-h-[100px] resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </DrawerSection>
              
              <div className="pt-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/doctor/patient/${patient.id}?visitId=${visit.id}`)}>Back / Cancel</Button>
                <Button 
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700" 
                  disabled={activePrescription.length === 0}
                  onClick={() => handleSave('Finalized')}
                >
                  {prescription ? 'Update Prescription' : 'Save Prescription'}
                </Button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </DndContext>
  )
}
