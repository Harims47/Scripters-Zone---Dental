import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Stethoscope, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { PatientProfileHeader } from '../components/ui/drawer-patterns'
import { PatientClinicalSummary, PatientVisitHistory } from '../components/consultation/consultation-components'
import { useClinicContext } from '../context/ClinicContext'
import { DEMO_STAFF } from '../lib/mock-data'

export function DoctorWorkspacePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')
  const navigate = useNavigate()
  
  const { visits, patients, consultations, prescriptions, saveConsultation } = useClinicContext()

  // 1. Resolve Canonical Entities
  const visit = visits.find(v => v.id === visitId)
  const patient = patients.find(p => p.id === (visit ? visit.patientId : patientId))
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)
  const assignedDoctor = DEMO_STAFF.find(d => d.id === visit?.doctorId)

  // 2. Local State for Form
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // 3. Hydrate form when consultation changes
  useEffect(() => {
    if (consultation) {
      setReason(consultation.reasonForVisit)
      setNotes(consultation.clinicalNotes)
    }
  }, [consultation])

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

  // --- ACTIONS ---
  const handleSaveDraft = () => {
    if (visit && assignedDoctor) {
      saveConsultation(visit.id, assignedDoctor.id, { reasonForVisit: reason, clinicalNotes: notes }, false)
    }
  }

  const handleComplete = () => {
    if (visit && assignedDoctor) {
      saveConsultation(visit.id, assignedDoctor.id, { reasonForVisit: reason, clinicalNotes: notes }, true)
    }
  }

  const handlePrescriptionClick = () => {
    navigate(`/prescriptions?patientId=${patient.id}&visitId=${visit.id}`)
  }

  // --- COMPLETED VIEW ---
  if (visit.status === 'READY_FOR_RECEPTION' || visit.status === 'COMPLETED') {
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

  // Mock patient history resolution for demo
  const patientHistory = visits
    .filter(v => v.patientId === patient.id && v.id !== visit.id) // Get historical, excluding current
    .map(v => ({
      date: 'Previously', // Fake date mapping for demo
      title: v.status === 'COMPLETED' ? 'Consultation completed' : 'Previous Visit',
      status: v.status
    }))
    .concat([
      { date: 'Today', title: 'Current Visit', status: visit.status }
    ])

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2" onClick={() => navigate('/queue')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
          </Button>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden shrink-0">
          <PatientProfileHeader 
            name={patient.name} 
            patientId={patient.id} 
            phone={patient.phone} 
            statusElement={<Badge variant="statusWithDoctor"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" /> {visit.status}</Badge>}
            modeText={`Doctor Workspace • ${visit.id}`}
          />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Patient Context */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <PatientClinicalSummary 
            patientId={patient.id}
            name={patient.name}
            phone={patient.phone}
            age={patient.age}
            assignedDoctor={assignedDoctor?.name || 'Unassigned'}
          />
          <PatientVisitHistory visits={patientHistory as any} />
        </div>

        {/* RIGHT COLUMN: Clinical Input */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          
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
                <Label className="text-sm font-semibold text-slate-700">Reason for Visit</Label>
                <Input 
                  placeholder="e.g. Toothache, Routine Checkup..." 
                  className="bg-slate-50 border-slate-200 shadow-none text-base py-6"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Clinical Notes</Label>
                <Textarea 
                  placeholder="Enter detailed observation and consultation notes..." 
                  className="min-h-[250px] resize-y bg-slate-50 border-slate-200 shadow-none text-base p-4 leading-relaxed"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Prescription Connect */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-emerald-900">Medicine & Prescriptions</h3>
                  {prescription?.status === 'Draft' && <Badge variant="outline" className="bg-emerald-100/50 text-emerald-700 border-emerald-200">Draft</Badge>}
                  {prescription?.status === 'Finalized' && <Badge variant="outline" className="bg-emerald-600 text-white border-emerald-600">Completed</Badge>}
                </div>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {prescription 
                    ? `${prescription.items.length} items configured.` 
                    : 'Select medicines and generate a prescription for this visit.'}
                </p>
              </div>
            </div>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0 w-full sm:w-auto shadow-sm"
              onClick={handlePrescriptionClick}
            >
              {prescription?.status === 'Finalized' ? 'View Prescription' : prescription?.status === 'Draft' ? 'Edit Prescription' : 'Create Prescription'}
            </Button>
          </div>

          {/* Completion Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button variant="outline" className="w-full sm:w-auto font-medium shadow-sm bg-white hover:bg-slate-50" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button 
              className="w-full sm:w-auto font-medium shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleComplete}
              disabled={!reason || !notes}
            >
              Complete Consultation
            </Button>
          </div>

        </div>

      </div>
    </div>
  )
}
