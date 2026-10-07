import { useEffect, useState, useMemo } from 'react'
import { api, API_BASE_URL } from '../../lib/api'
import type { PatientHistoryData, DentalImage } from '../../types/domain'
import { getToothInfo } from '../../lib/toothMetadata'
import { DentalImageViewerModal } from '../consultation/DentalImageViewerModal'
import { 
  Calendar, 
  Clock, 
  FileText, 
  Pill, 
  CreditCard, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  AlertCircle,
  MapPin,
  Phone,
  Printer,
  Image as ImageIcon,
  Eye,
  Download,
  Layers,
  ShieldCheck,
  Stethoscope
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

interface PatientCompleteHistoryProps {
  patientId: string
  onEditPatient?: () => void
  onClose?: () => void
}

export function PatientCompleteHistory({
  patientId,
  onEditPatient,
  onClose
}: PatientCompleteHistoryProps) {
  const [data, setData] = useState<PatientHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({})

  // Dedicated Dental Images State
  const [allDentalImages, setAllDentalImages] = useState<DentalImage[]>([])
  const [viewerImage, setViewerImage] = useState<DentalImage | null>(null)
  const [showAllScansForVisit, setShowAllScansForVisit] = useState<Record<string, boolean>>({})

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<PatientHistoryData>(`/api/patients/${patientId}/history`)
      setData(res)
      // By default, expand the first visit if available
      if (res.visits && res.visits.length > 0) {
        setExpandedVisits({ [res.visits[0].id]: true })
      } else {
        setExpandedVisits({})
      }
    } catch (err: any) {
      console.error('Failed to load patient history', err)
      setError(err.response?.data?.error || 'Failed to load patient history')
    } finally {
      setLoading(false)
    }
  }

  const loadDentalImages = async () => {
    try {
      const res = await api.get<DentalImage[]>(`/api/patients/${patientId}/dental-images`)
      setAllDentalImages(res || [])
    } catch (err) {
      console.error('Failed to load dental images', err)
    }
  }

  useEffect(() => {
    if (patientId) {
      loadHistory()
      loadDentalImages()
    }
  }, [patientId])

  // Merge direct API images with images from history response to ensure 100% coverage
  const mergedDentalImages = useMemo(() => {
    const map = new Map<string, DentalImage>()
    allDentalImages.forEach(img => map.set(img.id, img))
    if (data?.dentalImages) {
      data.dentalImages.forEach(img => map.set(img.id, img))
    }
    if (data?.visits) {
      data.visits.forEach(v => {
        if (v.dentalImages) {
          v.dentalImages.forEach(img => map.set(img.id, img))
        }
      })
    }
    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  }, [allDentalImages, data])


  const toggleVisit = (id: string) => {
    setExpandedVisits(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const expandAll = () => {
    if (!data?.visits) return
    const allExpanded: Record<string, boolean> = {}
    data.visits.forEach(v => { allExpanded[v.id] = true })
    setExpandedVisits(allExpanded)
  }

  const collapseAll = () => {
    setExpandedVisits({})
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleDownloadImage = (e: React.MouseEvent, img: DentalImage) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = img.imageUrl
    link.download = img.fileName || `dental_${img.type}_${img.toothNumber ? 'tooth_' + img.toothNumber : 'arch'}_${img.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintDocument = async (type: 'prescription' | 'receipt' | 'invoice', visitId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${type}/${visitId}`, {
        method: 'GET',
        credentials: 'include'
      })
      if (!response.ok) throw new Error(`Failed to print ${type}`)
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error(err)
      alert(`Failed to load ${type} document. Please ensure you are authorized.`)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-slate-500">Loading comprehensive clinical records...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="p-3 bg-rose-50 text-rose-700 rounded-xl max-w-md mx-auto text-sm border border-rose-200">
          {error || 'Patient data could not be retrieved.'}
        </div>
        <Button variant="outline" onClick={loadHistory}>Retry</Button>
      </div>
    )
  }

  const { patient, visits } = data
  const isExisting = patient.status === 'Active' && visits.length > 1

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* 1. PATIENT HEADER CARD */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {patient.photoUrl ? (
                <img 
                  src={patient.photoUrl} 
                  alt={patient.name} 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-lg border border-indigo-100 shadow-sm">
                  {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{patient.name}</h2>
                <Badge className={isExisting ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                  {isExisting ? 'Existing Patient' : 'New Patient'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="font-semibold">{patient.age} Yrs • {patient.gender}</span>
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {patient.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {patient.address || 'Address not provided'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {onEditPatient && (
              <Button variant="outline" size="sm" onClick={onEditPatient} className="h-8 text-xs font-medium border-slate-200">
                Edit Profile
              </Button>
            )}
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-medium border-slate-200">
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Total Recorded Visits: <strong className="text-slate-900 font-bold">{visits.length}</strong>
            </span>
          </div>

          {visits.length > 0 && (
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={expandAll} 
                className="text-slate-600 hover:text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Expand All Visits
              </button>
              <span className="text-slate-300">•</span>
              <button 
                type="button"
                onClick={collapseAll} 
                className="text-slate-600 hover:text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">

        {/* VISIT-BY-VISIT CHRONOLOGICAL CLINICAL ACCORDION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Chronological Visit History ({visits.length})
            </h3>
          </div>

          {visits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-800">No visit history available</h4>
              <p className="text-sm text-slate-500 mt-1">This patient has not completed or started any visits yet.</p>
            </div>
          ) : (
            visits.map((visit) => {
              const isExpanded = !!expandedVisits[visit.id]
              const visitDate = (visit as any).visitDate ? new Date((visit as any).visitDate) : new Date(visit.createdAt)
              const formattedDate = visitDate.toLocaleDateString(undefined, { 
                weekday: 'short',
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
              const formattedTime = visitDate.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })

              const isAppointment = !!visit.appointmentId
              const doctorName = visit.doctor?.name || 'Unassigned Doctor'
              const reason = visit.reasonForVisit || visit.consultation?.reasonForVisit || visit.appointment?.notes || 'Follow-up / General Consultation'
              const fin = visit.financialSummary

              // Radiographs for this specific visit
              const thisVisitImages = mergedDentalImages.filter(img => 
                img.visitId === visit.id || 
                (!img.visitId && img.createdAt && new Date(img.createdAt).toDateString() === new Date(visit.createdAt).toDateString())
              )
              const showAllForThis = !!showAllScansForVisit[visit.id]
              const displayedVisitImages = showAllForThis ? mergedDentalImages : thisVisitImages

              // Treatments performed or sessions conducted in this visit
              const completedItems = visit.completedTreatmentItems || []
              const planItemsForVisit = (data.treatmentPlan?.items || []).filter(item => 
                item.completedVisitId === visit.id ||
                (item.sessions && item.sessions.some(s => s.visitId === visit.id))
              )

              return (
                <div 
                  key={visit.id} 
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                    visit.status === 'CANCELLED' 
                      ? 'border-slate-200 opacity-90' 
                      : isExpanded 
                        ? 'border-slate-300 shadow-md ring-1 ring-slate-200' 
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Visit Header Bar (Clickable Accordion) */}
                  <div 
                    onClick={() => toggleVisit(visit.id)}
                    className="p-5 cursor-pointer flex items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors border-b border-transparent"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1 flex-wrap">
                      {/* Date Badge */}
                      <div className="flex flex-col shrink-0 min-w-[140px]">
                        <span className="text-sm font-bold text-slate-900">{formattedDate}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formattedTime}
                        </span>
                      </div>

                      {/* Visit Type */}
                      <div className="shrink-0">
                        <Badge variant="outline" className={`text-xs font-semibold ${isAppointment ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                          {isAppointment ? 'Appointment' : 'Walk-in'}
                        </Badge>
                      </div>

                      {/* Doctor and Reason */}
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs font-medium text-slate-500">
                          Doctor: <span className="text-slate-900 font-bold">{doctorName}</span>
                          {visit.doctor?.role && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded ml-1 font-normal">
                              {visit.doctor.role}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-800 font-semibold truncate mt-0.5">
                          {reason}
                        </div>
                      </div>

                      {/* Scans & Financial Badges */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {thisVisitImages.length > 0 && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-bold">
                            <ImageIcon className="w-3 h-3 mr-1" /> {thisVisitImages.length} Scans
                          </Badge>
                        )}

                        <Badge 
                          className={`text-xs font-bold ${
                            visit.status === 'COMPLETED' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : visit.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {visit.status}
                        </Badge>

                        <Badge 
                          className={`text-xs font-semibold ${
                            fin.status === 'Paid' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : fin.status === 'Partial'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {fin.status} (₹{fin.totalPaid.toLocaleString()} / ₹{fin.amountDue.toLocaleString()})
                        </Badge>
                      </div>
                    </div>

                    {/* Accordion Arrow */}
                    <div className="text-slate-400 hover:text-slate-600 pl-2">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Collapsible Visit Details */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 pt-2 border-t border-slate-100 space-y-6 bg-slate-50/40">
                      
                      {/* Cancellation Notice */}
                      {visit.status === 'CANCELLED' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>This visit was cancelled. Prescriptions, historical payments, and notes are archived below for audit integrity.</span>
                        </div>
                      )}

                      {/* SECTION 1: CONSULTATION & CLINICAL NOTES */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 gap-2">
                          <span className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-indigo-600" />
                            Consultation & Clinical Assessment
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {visit.consultation?.consultationFee !== undefined && (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                Consultation Fee: ₹{visit.consultation.consultationFee.toLocaleString()}
                              </span>
                            )}
                            {(visit.treatmentFee !== undefined && visit.treatmentFee > 0) && (
                              <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                                Treatment Fee: ₹{visit.treatmentFee.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-3.5 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Attending Doctor</span>
                              <span className="font-bold text-slate-900 text-sm">{doctorName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">Reason for Visit</span>
                              <span className="font-semibold text-slate-800">{reason}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px] mb-1">Clinical Notes & Findings</span>
                            {visit.consultation?.clinicalNotes ? (
                              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                                {visit.consultation.clinicalNotes}
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">No clinical consultation notes recorded.</p>
                            )}
                          </div>

                          {/* Fee Waivers and Adjustments if present */}
                          {(visit.consultation?.consultationWaiverReason || visit.consultation?.treatmentWaiverReason || (visit.discount && visit.discount > 0)) && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <span className="text-amber-600 font-bold block uppercase tracking-wider text-[10px]">
                                Financial Adjustments & Waivers
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {visit.consultation?.consultationWaiverReason && (
                                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900">
                                    <span className="font-bold block text-amber-950">Consultation Fee Waiver:</span>
                                    {visit.consultation.consultationWaiverReason}
                                  </div>
                                )}
                                {visit.consultation?.treatmentWaiverReason && (
                                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900">
                                    <span className="font-bold block text-amber-950">Treatment Fee Waiver:</span>
                                    {visit.consultation.treatmentWaiverReason}
                                  </div>
                                )}
                                {visit.discount && visit.discount > 0 && (
                                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900">
                                    <span className="font-bold block text-emerald-950">Discount Applied: ₹{visit.discount}</span>
                                    {visit.discountReason || 'Authorized discount'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 2: DENTAL IMAGING (OPG / RVG RADIOGRAPHS) */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 gap-2">
                          <span className="flex items-center gap-2 text-purple-900 font-bold">
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                            Dental Imaging (OPG / RVG Radiographs)
                          </span>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                              {displayedVisitImages.length} {displayedVisitImages.length === 1 ? 'Scan' : 'Scans'}
                            </Badge>

                            {mergedDentalImages.length > thisVisitImages.length && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllScansForVisit(prev => ({ ...prev, [visit.id]: !prev[visit.id] }))}
                                className={`h-6 text-[10px] px-2 ${
                                  showAllForThis 
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold' 
                                    : 'bg-white text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {showAllForThis ? `Showing All Scans (${mergedDentalImages.length})` : `Show All Patient Scans (${mergedDentalImages.length})`}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          {displayedVisitImages.length === 0 ? (
                            <div className="text-center py-6 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold text-slate-700">No radiographs linked directly to this visit</p>
                              {mergedDentalImages.length > 0 && (
                                <p className="text-[11px] text-slate-500">
                                  {mergedDentalImages.length} radiograph(s) exist in the patient record.{' '}
                                  <button
                                    type="button"
                                    onClick={() => setShowAllScansForVisit(prev => ({ ...prev, [visit.id]: true }))}
                                    className="text-purple-600 font-bold hover:underline"
                                  >
                                    View all patient scans
                                  </button>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                              {displayedVisitImages.map(img => {
                                const toothInfo = img.toothNumber ? getToothInfo(img.toothNumber) : undefined
                                const isFromThisVisit = thisVisitImages.some(vImg => vImg.id === img.id)

                                return (
                                  <div
                                    key={img.id}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                                  >
                                    <div
                                      onClick={() => setViewerImage(img)}
                                      className="relative h-36 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden group/thumb select-none"
                                    >
                                      <img
                                        src={img.imageUrl}
                                        alt={img.title || img.fileName}
                                        className="max-h-full max-w-full object-contain group-hover/thumb:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="secondary"
                                          className="h-7 px-2.5 text-xs font-semibold bg-white/95 text-slate-900 shadow-md"
                                        >
                                          <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" />
                                          Full Size
                                        </Button>
                                      </div>
                                      <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap max-w-[85%]">
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${
                                            img.type === 'OPG'
                                              ? 'bg-purple-900/90 text-purple-200 border border-purple-700/60'
                                              : 'bg-teal-900/90 text-teal-200 border border-teal-700/60'
                                          }`}
                                        >
                                          {img.type}
                                        </span>
                                        {img.toothNumber && (
                                          <span className="text-[9px] font-bold bg-sky-950/90 text-sky-200 border border-sky-700/60 px-1.5 py-0.5 rounded shadow-xs">
                                            Tooth {img.toothNumber}
                                          </span>
                                        )}
                                        {!isFromThisVisit && (
                                          <span className="text-[9px] font-semibold bg-amber-950/80 text-amber-200 border border-amber-700/60 px-1 py-0.5 rounded shadow-xs">
                                            Other Visit
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="p-3 space-y-1.5 text-xs flex-1 flex flex-col justify-between">
                                      <div>
                                        <div className="font-bold text-slate-900 truncate" title={img.title || img.fileName}>
                                          {img.title || img.fileName}
                                        </div>
                                        {toothInfo && (
                                          <p className="text-[11px] text-sky-700 font-semibold truncate">
                                            {toothInfo.name} ({toothInfo.quadrant})
                                          </p>
                                        )}
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                          <span>{img.createdAt ? new Date(img.createdAt).toLocaleDateString() : 'N/A'}</span>
                                          <span className="font-mono">{formatFileSize(img.fileSize)}</span>
                                        </div>
                                        {img.notes && (
                                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 mt-1">
                                            {img.notes}
                                          </p>
                                        )}
                                      </div>

                                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setViewerImage(img)}
                                          className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 flex-1 justify-center"
                                        >
                                          <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" /> Inspect
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => handleDownloadImage(e, img)}
                                          className="h-7 px-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200"
                                          title="Download Radiograph"
                                        >
                                          <Download className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Download
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 3: TREATMENTS PERFORMED & SITTINGS */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-600" />
                            Treatments Performed (This Visit)
                          </span>
                          {visit.treatmentFee !== undefined && visit.treatmentFee > 0 && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                              Treatment Fee: ₹{visit.treatmentFee.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="p-4 text-xs">
                          {planItemsForVisit.length > 0 ? (
                            <div className="space-y-3">
                              {planItemsForVisit.map(item => {
                                const toothInfo = item.toothNumber ? getToothInfo(item.toothNumber) : undefined
                                const visitSessions = item.sessions?.filter(s => s.visitId === visit.id) || []

                                return (
                                  <div key={item.id} className="flex items-start justify-between p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100">
                                    <div className="flex items-start gap-3 w-full">
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                      <div className="w-full space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {item.toothNumber && (
                                            <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">
                                              Tooth {item.toothNumber}
                                              {toothInfo && ` • ${toothInfo.name}`}
                                            </span>
                                          )}
                                          <span className="font-bold text-slate-900 text-sm">
                                            {item.catalogItem?.name || 'Procedure'} {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                                          </span>
                                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                                            {item.status}
                                          </Badge>
                                        </div>

                                        {visitSessions.length > 0 && (
                                          <div className="mt-2 space-y-1.5">
                                            {visitSessions.map(s => (
                                              <div key={s.id} className="bg-white p-2.5 rounded-lg border border-emerald-200 text-slate-700 space-y-1">
                                                <div className="flex items-center justify-between font-bold">
                                                  <span className="text-indigo-700">Sitting {s.sittingNumber} of {item.totalSittings || 1}</span>
                                                  {s.doctor?.name && <span className="text-slate-500 font-normal">Dr. {s.doctor.name}</span>}
                                                  {s.fee ? <span className="text-emerald-700 font-bold">₹{s.fee}</span> : null}
                                                </div>
                                                {s.stage && <p className="font-medium text-slate-800">Stage: {s.stage}</p>}
                                                {s.workPerformed && <p className="text-slate-600">Work Performed: {s.workPerformed}</p>}
                                                {s.materialsUsed && <p className="text-slate-500 text-[11px]">Materials: {s.materialsUsed}</p>}
                                                {s.followUpInstructions && (
                                                  <p className="text-amber-800 bg-amber-50 p-1.5 rounded text-[11px] mt-1 border border-amber-200/60">
                                                    Follow-up: {s.followUpInstructions}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {item.notes && <div className="text-slate-600 text-xs mt-1">{item.notes}</div>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : completedItems.length > 0 ? (
                            <div className="space-y-2">
                              {completedItems.map(item => {
                                const toothInfo = item.toothNumber ? getToothInfo(item.toothNumber) : undefined
                                return (
                                  <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-emerald-50/40 border border-emerald-100">
                                    <div className="flex items-start gap-2.5">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-bold text-slate-900">
                                          {item.toothNumber && `Tooth ${item.toothNumber} • `}
                                          {item.catalogItem?.name || 'Procedure'} {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                                          {toothInfo && <span className="text-xs text-sky-700 block font-normal">{toothInfo.name}</span>}
                                        </div>
                                        {item.notes && <div className="text-slate-600 mt-1">{item.notes}</div>}
                                      </div>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                                      Completed
                                    </Badge>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-center py-3">No procedure recorded for this visit.</p>
                          )}
                        </div>
                      </div>

                      {/* SECTION 4: PRESCRIPTION INFORMATION */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-sky-600" />
                            Prescription
                          </span>
                          {visit.prescription && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handlePrintDocument('prescription', visit.id)}
                              className="h-6 text-[11px] px-2.5 bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                            >
                              <Printer className="w-3 h-3 mr-1" /> Print Prescription
                            </Button>
                          )}
                        </div>
                        <div className="p-4 text-xs">
                          {visit.prescription && visit.prescription.items.length > 0 ? (
                            <div className="space-y-3">
                              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                    <tr>
                                      <th className="px-3 py-2">Medicine</th>
                                      <th className="px-3 py-2">Dosage & Frequency</th>
                                      <th className="px-3 py-2">Duration</th>
                                      <th className="px-3 py-2 text-right">Quantity</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {visit.prescription.items.map(item => (
                                      <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2">
                                          <div className="font-bold text-slate-900">{item.medicine?.name || 'Medicine'}</div>
                                          {item.instructions && (
                                            <div className="text-[11px] text-slate-500 mt-0.5">{item.instructions}</div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                          {item.dosage || '—'} • {item.frequency || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                          {item.duration || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                                          {item.quantity}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {visit.prescription.notes && (
                                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  <strong className="text-slate-700">Notes:</strong> {visit.prescription.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-center py-3">No medicines prescribed.</p>
                          )}
                        </div>
                      </div>

                      {/* SECTION 5: PHARMACY DISPENSING */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-teal-600" />
                            Pharmacy Dispensing Status
                          </span>
                          {visit.dispensing && (
                            <Badge className={`text-[10px] ${
                              visit.dispensing.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {visit.dispensing.status}
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 text-xs">
                          {visit.dispensing && visit.dispensing.items.length > 0 ? (
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                  <tr>
                                    <th className="px-3 py-2">Medicine</th>
                                    <th className="px-3 py-2 text-center">Prescribed</th>
                                    <th className="px-3 py-2 text-center">Dispensed</th>
                                    <th className="px-3 py-2 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {visit.dispensing.items.map(item => {
                                    const fullyDispensed = item.dispensedQuantity >= item.prescribedQuantity
                                    return (
                                      <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2 font-bold text-slate-900">
                                          {item.medicine?.name || 'Medicine'}
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-700">
                                          {item.prescribedQuantity}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-teal-700 bg-teal-50/40">
                                          {item.dispensedQuantity}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <Badge 
                                            className={`text-[10px] ${
                                              fullyDispensed 
                                                ? 'bg-emerald-100 text-emerald-800' 
                                                : item.dispensedQuantity > 0 
                                                  ? 'bg-amber-100 text-amber-800' 
                                                  : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {fullyDispensed ? 'Fulfilled' : item.dispensedQuantity > 0 ? 'Partial' : 'Pending'}
                                          </Badge>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-center py-3">No medicine dispensing records.</p>
                          )}
                        </div>
                      </div>

                      {/* SECTION 6: PAYMENT & BILLING LEDGER */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden border-l-4 border-l-teal-600">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 gap-2">
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-teal-700" />
                            Payment & Financial Summary ({visit.payments.length})
                          </span>
                          {visit.payments.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintDocument('receipt', visit.id)}
                                className="h-6 text-[11px] px-2.5 bg-white text-teal-700 border-teal-200 hover:bg-teal-50 font-semibold"
                              >
                                <Printer className="w-3 h-3 mr-1" /> Receipt
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handlePrintDocument('invoice', visit.id)}
                                className="h-6 text-[11px] px-2.5 bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold"
                              >
                                <FileText className="w-3 h-3 mr-1" /> Invoice
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Financial Overview Cards */}
                        <div className="p-4 bg-slate-50/40 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Amount Due</span>
                            <span className="text-base font-bold text-slate-900">₹{fin.amountDue.toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Total Paid</span>
                            <span className="text-base font-bold text-emerald-600">₹{fin.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Balance</span>
                            <span className={`text-base font-bold ${fin.balance > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                              ₹{fin.balance.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-0.5">Status</span>
                            <Badge className={`mt-0.5 text-xs ${
                              fin.status === 'Paid' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : fin.status === 'Partial' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {fin.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-4 text-xs">
                          {visit.payments.length > 0 ? (
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                  <tr>
                                    <th className="px-3 py-2">Date / Time</th>
                                    <th className="px-3 py-2">Payment Method</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {visit.payments.map((p, idx) => {
                                    const pDate = p.createdAt ? new Date(p.createdAt) : null
                                    return (
                                      <tr key={p.id || idx} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2 text-slate-700">
                                          {pDate ? `${pDate.toLocaleDateString()} ${pDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2">
                                          <Badge variant="secondary" className="font-semibold text-[10px]">
                                            {p.method}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className="inline-flex items-center text-emerald-700 font-bold">
                                            {p.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                                          ₹{p.amount.toLocaleString()}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
                              No payment transaction recorded for this visit.
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Full-Screen Lightbox Radiograph Viewer */}
      <DentalImageViewerModal
        image={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />
    </div>
  )
}
