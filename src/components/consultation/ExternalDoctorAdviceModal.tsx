import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import {
  Stethoscope,
  Mail,
  FileDown,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building,
  User
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { ExternalDoctorAdvice, Patient } from '../../types/domain'

interface ExternalDoctorAdviceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitId: string
  patient: Patient
  doctorId?: string
  initialReason?: string
  plannedProcedures?: string[]
  onAdviceUpdated?: () => void
}

const COMMON_SPECIALITIES = [
  'Cardiologist',
  'General Physician / Internal Medicine',
  'Diabetologist / Endocrinologist',
  'Nephrologist',
  'Hematologist',
  'Oncologist',
  'Gynecologist / Obstetrician',
  'Neurologist',
  'Pulmonologist',
  'Other Specialist'
]

const QUICK_CONDITIONS = [
  'Cardiac (Blood Thinners / Aspirin / Stent / Hypertension)',
  'Diabetes Mellitus (Uncontrolled Blood Sugar)',
  'Hypertension / Elevated Blood Pressure',
  'Bleeding Disorder / Anticoagulated',
  'Renal / Kidney Disease',
  'Pregnancy (Precautions for Anesthesia / X-ray)'
]

const QUICK_PROCEDURES = [
  'Extraction of Tooth under Local Anesthesia',
  'Surgical Removal / Impaction under Local Anesthesia',
  'Root Canal Treatment under Local Anesthesia',
  'Periodontal Flap Surgery / Deep Scaling',
  'Dental Implant Placement'
]

const DEFAULT_QUERY = `1. Is the patient medically fit to undergo the proposed dental procedure under Local Anesthesia (with/without adrenaline)?
2. Should any ongoing medications (such as blood thinners / Aspirin / Clopidogrel / Antihypertensives) be adjusted, paused, or continued?
3. Are any specific precautions, antibiotic prophylaxis, or post-op monitoring advised?`

export const ExternalDoctorAdviceModal: React.FC<ExternalDoctorAdviceModalProps> = ({
  open,
  onOpenChange,
  visitId,
  patient,
  doctorId,
  initialReason = '',
  plannedProcedures = [],
  onAdviceUpdated
}) => {
  const [advices, setAdvices] = useState<ExternalDoctorAdvice[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'create' | 'list'>('create')

  // Form Fields
  const [doctorName, setDoctorName] = useState('')
  const [speciality, setSpeciality] = useState('Cardiologist')
  const [doctorEmail, setDoctorEmail] = useState('')
  const [doctorPhone, setDoctorPhone] = useState('')
  const [hospitalClinic, setHospitalClinic] = useState('')
  const [medicalCondition, setMedicalCondition] = useState('')
  const [plannedProcedure, setPlannedProcedure] = useState('')
  const [clinicalQuery, setClinicalQuery] = useState(DEFAULT_QUERY)

  // Status updating
  const [editingAdviceId, setEditingAdviceId] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>('CLEARED')
  const [doctorResponseText, setDoctorResponseText] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch existing advice requests for this visit
  const fetchAdvices = async () => {
    if (!visitId) return
    try {
      const data = await api.get<ExternalDoctorAdvice[]>(`/api/external-advice/visit/${visitId}`)
      const list = Array.isArray(data) ? data : []
      setAdvices(list)
      if (list.length > 0) {
        setViewMode('list')
      } else {
        setViewMode('create')
      }
    } catch (err: any) {
      console.error('Failed to fetch external advice requests:', err)
    }
  }

  useEffect(() => {
    if (open) {
      fetchAdvices()

      // Pre-fill planned procedure if available
      if (plannedProcedures.length > 0) {
        setPlannedProcedure(plannedProcedures.join(', '))
      } else if (initialReason) {
        setPlannedProcedure(`Dental procedure for ${initialReason}`)
      } else {
        setPlannedProcedure('Extraction / Dental treatment under Local Anesthesia')
      }
    }
  }, [open, visitId])

  const resetForm = () => {
    setDoctorName('')
    setSpeciality('Cardiologist')
    setDoctorEmail('')
    setDoctorPhone('')
    setHospitalClinic('')
    setMedicalCondition('')
    setClinicalQuery(DEFAULT_QUERY)
    if (plannedProcedures.length > 0) {
      setPlannedProcedure(plannedProcedures.join(', '))
    } else {
      setPlannedProcedure('Extraction / Dental treatment under Local Anesthesia')
    }
  }

  const handleCreateAndSend = async (sendEmail: boolean = true) => {
    if (!doctorName.trim()) {
      toast.error('Please enter the external doctor name')
      return
    }
    if (sendEmail && (!doctorEmail.trim() || !doctorEmail.includes('@'))) {
      toast.error('Please enter a valid external doctor email address')
      return
    }
    if (!medicalCondition.trim()) {
      toast.error('Please specify the patient medical condition / comorbidities')
      return
    }
    if (!plannedProcedure.trim()) {
      toast.error('Please specify the planned dental procedure')
      return
    }

    setIsSubmitting(true)
    try {
      const res: any = await api.post('/api/external-advice', {
        visitId,
        patientId: patient.id,
        doctorId,
        doctorName: doctorName.trim(),
        doctorEmail: doctorEmail.trim(),
        doctorPhone: doctorPhone.trim() || undefined,
        speciality,
        hospitalClinic: hospitalClinic.trim() || undefined,
        medicalCondition: medicalCondition.trim(),
        plannedProcedure: plannedProcedure.trim(),
        clinicalQuery: clinicalQuery.trim(),
        sendEmailNow: sendEmail
      })

      if (sendEmail) {
        if (res.emailSent) {
          toast.success(`Advice request sent to Dr. ${doctorName}!`)
        } else {
          toast.success(`Advice request created for Dr. ${doctorName} (email queued)`)
        }
      } else {
        toast.success(`Advice request created for Dr. ${doctorName}`)
      }

      resetForm()
      await fetchAdvices()
      setViewMode('list')
      onAdviceUpdated?.()
    } catch (err: any) {
      toast.error(err.message || err.response?.data?.error || 'Failed to create advice request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadPDF = async (adviceId: string) => {
    try {
      toast.loading('Generating Referral PDF...', { id: 'pdf-gen' })
      await api.download(`/api/external-advice/${adviceId}/pdf`, `Medical_Advice_Request_${adviceId}.pdf`)
      toast.success('Medical Clearance Request PDF downloaded!', { id: 'pdf-gen' })
    } catch (err: any) {
      toast.error('Failed to download Referral PDF', { id: 'pdf-gen' })
    }
  }

  const handleResendEmail = async (adviceId: string, docName: string) => {
    try {
      toast.loading(`Resending email to Dr. ${docName}...`, { id: 'resend-email' })
      const res: any = await api.post(`/api/external-advice/${adviceId}/send-email`, {})
      if (res.success) {
        toast.success(`Email resent to Dr. ${docName}!`, { id: 'resend-email' })
        fetchAdvices()
      } else {
        toast.error('Failed to deliver email. Check doctor email address.', { id: 'resend-email' })
      }
    } catch (err: any) {
      toast.error('Failed to resend email', { id: 'resend-email' })
    }
  }

  const handleSaveDoctorResponse = async () => {
    if (!editingAdviceId) return
    setIsUpdatingStatus(true)
    try {
      await api.patch(`/api/external-advice/${editingAdviceId}`, {
        status: updateStatus,
        doctorResponse: doctorResponseText.trim()
      })
      toast.success('Medical advice status updated successfully!')
      setEditingAdviceId(null)
      fetchAdvices()
      onAdviceUpdated?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update advice status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cleared to Proceed
          </Badge>
        )
      case 'CLEARED_WITH_PRECAUTIONS':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Cleared with Precautions
          </Badge>
        )
      case 'CONTRAINDICATED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Contraindicated / Unfit
          </Badge>
        )
      case 'PENDING':
      default:
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold gap-1">
            <Clock className="w-3 h-3 text-sky-600" /> Pending Physician Response
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl p-0 sm:p-0 gap-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 [&>button]:text-white [&>button]:hover:text-teal-100 [&>button]:top-5 [&>button]:right-5 [&>button]:opacity-90 [&>button]:z-50 [&>button]:focus:ring-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-6 py-5 shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Stethoscope className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  External Doctor Advice & Medical Clearance
                </DialogTitle>
                <p className="text-xs text-teal-100 mt-0.5">
                  Request medical advice, specialist clearance, or precautions for high-risk patients
                </p>
              </div>
            </div>

            {advices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  Requests ({advices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('create')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'create' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  + New Request
                </button>
              </div>
            )}
          </div>

          {/* Patient Quick Strip */}
          <div className="mt-3.5 pt-3 border-t border-teal-600/60 flex items-center justify-between text-xs text-teal-100 flex-wrap gap-2">
            <div>
              Patient: <strong className="text-white font-semibold">{patient.name}</strong>
              {patient.age ? ` (${patient.age} Yrs` : ''}
              {patient.gender ? `, ${patient.gender})` : ')'}
            </div>
            {patient.phone && (
              <div>
                Phone: <strong className="text-white font-mono">{patient.phone}</strong>
              </div>
            )}
            <div>
              Visit Reason: <strong className="text-white">{initialReason || 'Consultation'}</strong>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
          {viewMode === 'list' && advices.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Requested Medical Clearances ({advices.length})
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode('create')}
                  className="h-8 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Advice Request
                </Button>
              </div>

              {advices.map((adv) => (
                <div
                  key={adv.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Dr. {adv.doctorName}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          ({adv.speciality})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {adv.doctorEmail}
                        </span>
                        {adv.hospitalClinic && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" /> {adv.hospitalClinic}
                          </span>
                        )}
                        <span>• Sent: {new Date(adv.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div>{getStatusBadge(adv.status)}</div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
                    <div>
                      <span className="font-semibold text-slate-600">Condition / Reason: </span>
                      <span className="text-slate-800">{adv.medicalCondition}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">Planned Procedure: </span>
                      <span className="text-slate-800">{adv.plannedProcedure}</span>
                    </div>
                    {adv.doctorResponse && (
                      <div className="mt-2 pt-2 border-t border-slate-100 bg-emerald-50/50 p-2 rounded text-emerald-900">
                        <span className="font-bold">Physician Advice / Remarks: </span>
                        <span>{adv.doctorResponse}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for this advice */}
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(adv.id)}
                        className="h-8 text-xs text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                        Download Referral PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendEmail(adv.id, adv.doctorName)}
                        className="h-8 text-xs text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                        Resend Email
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAdviceId(adv.id)
                        setUpdateStatus(adv.status)
                        setDoctorResponseText(adv.doctorResponse || '')
                      }}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      Update Clearance Response
                    </Button>
                  </div>

                  {/* Inline update panel */}
                  {editingAdviceId === adv.id && (
                    <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
                      <div className="font-bold text-xs text-indigo-900">
                        Record External Physician's Clearance / Response:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">Clearance Status</Label>
                          <Select value={updateStatus} onValueChange={setUpdateStatus}>
                            <SelectTrigger className="h-9 bg-white text-xs">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLEARED">✅ Fit / Cleared to Proceed</SelectItem>
                              <SelectItem value="CLEARED_WITH_PRECAUTIONS">⚠️ Cleared with Precautions</SelectItem>
                              <SelectItem value="CONTRAINDICATED">⛔ Unfit / Contraindicated</SelectItem>
                              <SelectItem value="PENDING">⏳ Awaiting Response</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Doctor Remarks / Medication Instructions
                        </Label>
                        <Textarea
                          value={doctorResponseText}
                          onChange={(e) => setDoctorResponseText(e.target.value)}
                          placeholder="e.g. Cleared for extraction. Hold Aspirin 3 days prior. Antibiotic prophylaxis Amoxicillin 2g 1 hr prior."
                          className="bg-white text-xs min-h-[60px]"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingAdviceId(null)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={isUpdatingStatus}
                          onClick={handleSaveDoctorResponse}
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {isUpdatingStatus ? 'Saving...' : 'Save Response'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Create Request Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* External Doctor Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    External Doctor Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="e.g. Dr. Arun Kumar"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Speciality */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Speciality / Department <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={speciality} onValueChange={setSpeciality}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Select speciality" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SPECIALITIES.map((sp) => (
                        <SelectItem key={sp} value={sp} className="text-xs">
                          {sp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Doctor Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Doctor Email Address <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={doctorEmail}
                      onChange={(e) => setDoctorEmail(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Hospital / Clinic */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Hospital / Clinic Name (Optional)
                  </Label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="e.g. Apollo Hospital / Heart Care Clinic"
                      value={hospitalClinic}
                      onChange={(e) => setHospitalClinic(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Patient Comorbidities / Medical Condition */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Patient Medical Condition / Comorbidity <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">Click to quick-insert:</span>
                </div>

                {/* Quick Comorbidity Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CONDITIONS.map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() =>
                        setMedicalCondition((prev) =>
                          prev ? (prev.includes(cond) ? prev : `${prev}; ${cond}`) : cond
                        )
                      }
                      className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 transition-colors"
                    >
                      + {cond}
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Detail the medical history (e.g. Known heart patient, post-PTCA with stent on blood thinners Aspirin 75mg + Clopidogrel 75mg daily. BP: 140/90 mmHg)."
                  value={medicalCondition}
                  onChange={(e) => setMedicalCondition(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>

              {/* Planned Dental Procedure */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 uppercase">
                    Proposed Dental Procedure <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">Click to quick-insert:</span>
                </div>

                {/* Quick Procedure Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROCEDURES.map((proc) => (
                    <button
                      key={proc}
                      type="button"
                      onClick={() =>
                        setPlannedProcedure((prev) =>
                          prev ? (prev.includes(proc) ? prev : `${prev}; ${proc}`) : proc
                        )
                      }
                      className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-full px-2.5 py-0.5 transition-colors"
                    >
                      + {proc}
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="e.g. Surgical Extraction of Tooth #38 (impacted) under Local Anesthesia with 2% Lignocaine"
                  value={plannedProcedure}
                  onChange={(e) => setPlannedProcedure(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Specific Clinical Query / Clearance Questions */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-700 uppercase">
                  Clinical Advice & Clearance Questions
                </Label>
                <Textarea
                  value={clinicalQuery}
                  onChange={(e) => setClinicalQuery(e.target.value)}
                  className="text-xs min-h-[80px] font-mono leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex-col-reverse sm:flex-row sm:items-center sm:justify-between shrink-0 m-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {viewMode === 'create' && (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleCreateAndSend(true)}
              className="w-full sm:w-auto text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm px-4 h-9"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {isSubmitting ? 'Sending Request...' : 'Send Email to Doctor'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
