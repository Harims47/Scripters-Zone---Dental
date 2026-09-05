import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Plus, Check, Loader2, Info } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { api } from '../../lib/api'
import type { TreatmentPlan, TreatmentCatalog, TreatmentPlanItem } from '../../types/domain'

export function TreatmentPlanUI({
  patientId,
  currentVisitId
}: {
  patientId: string
  currentVisitId?: string
}) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null)
  const [catalog, setCatalog] = useState<TreatmentCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedProcedure, setSelectedProcedure] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const catRes = await api.get<TreatmentCatalog[]>('/api/treatments/catalog')
        setCatalog(catRes)
        
        const planRes = await api.get<TreatmentPlan>(`/api/patients/${patientId}/treatment-plan`)
        setPlan(planRes)
      } catch (err) {
        console.error("Failed to load treatment plan", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [patientId])

  const categories = Array.from(new Set(catalog.map(c => c.category)))
  const procedures = catalog.filter(c => c.category === selectedCategory)

  const handleAdd = async () => {
    if (!selectedProcedure) return
    setSaving(true)
    try {
      const res = await api.post<TreatmentPlanItem>(`/api/patients/${patientId}/treatment-plan/items`, {
        treatmentCatalogId: selectedProcedure,
        notes: notes || undefined,
        completedVisitId: currentVisitId
      })
      setPlan(prev => prev ? { ...prev, items: [res, ...prev.items] } : null)
      setIsAdding(false)
      setSelectedCategory('')
      setSelectedProcedure('')
      setNotes('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkCompleted = async (itemId: string) => {
    setSaving(true)
    try {
      const res = await api.patch<TreatmentPlanItem>(`/api/patients/${patientId}/treatment-plan/items/${itemId}`, {
        status: 'Completed',
        completedVisitId: currentVisitId
      })
      setPlan(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? res : i)
      } : null)
    } catch (err) {
      console.error(err)
      alert("Failed to update status. Verify ownership and authorization.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading Treatment Plan...</div>
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Treatment Plan</h2>
          <p className="text-sm text-slate-500">Long-term clinical roadmap for this patient.</p>
        </div>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">Add Treatment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Category</label>
              <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setSelectedProcedure(''); }}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Procedure</label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure} disabled={!selectedCategory}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select Procedure" /></SelectTrigger>
                <SelectContent>
                  {procedures.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.variant ? `(${p.variant})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-xs font-medium text-slate-700">Tooth / Notes (Optional)</label>
             <Input placeholder="e.g. Tooth 36" value={notes} onChange={e => setNotes(e.target.value)} className="bg-white" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
             <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
             <Button size="sm" disabled={!selectedProcedure || saving} onClick={handleAdd}>
               {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
               Save Treatment
             </Button>
          </div>
        </div>
      )}

      {plan?.items.length === 0 && !isAdding && (
        <div className="text-center py-6 text-sm text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No active treatment plan items for this patient.
        </div>
      )}

      {plan && plan.items.length > 0 && (
        <div className="space-y-3">
          {plan.items.map(item => (
            <div key={item.id} className={`flex items-start justify-between p-4 rounded-xl border ${item.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.status}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{item.catalogItem?.name} {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}</span>
                </div>
                <div className="text-xs text-slate-500 ml-1">
                   {item.catalogItem?.category}
                   {item.notes && <span className="ml-2 text-slate-600 font-medium">| {item.notes}</span>}
                </div>
              </div>
              
              {item.status === 'Completed' && (
                <div className="text-xs text-emerald-600 font-medium flex items-center h-8">
                   <Check className="w-4 h-4 mr-1" /> {item.completedVisitId === currentVisitId ? 'Completed Today' : 'Completed'}
                </div>
              )}
            </div>
          ))}
          
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex gap-2 items-start mt-4">
             <Info className="w-4 h-4 shrink-0 mt-0.5" />
             <p>Marking a treatment as completed links it to the current visit. <strong>This does not automatically bill the patient.</strong> Please enter any applicable fees in the Treatment Fee input below.</p>
          </div>
        </div>
      )}
    </div>
  )
}
