import { useEffect, useState, useMemo } from 'react'
import { useClinicContext } from '../../context/ClinicContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/button'
import { 
  FileText, 
  Loader2, 
  Check, 
  Eye, 
  Download, 
  Image as ImageIcon, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  Layers, 
  Receipt,
  CreditCard,
  Pill
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { API_BASE_URL, api } from '../../lib/api'
import type { TreatmentPlan, DentalImage } from '../../types/domain'
import { getToothInfo } from '../../lib/toothMetadata'
import { DentalImageViewerModal } from '../consultation/DentalImageViewerModal'

export function HistoricalVisitDetails({ visitId, onViewHistory }: { visitId: string, onViewHistory?: () => void }) {
  const { currentUser } = useAuth()
  const { visits, consultations, prescriptions, dispensings, payments, medicines, staff, appointments } = useClinicContext()

  const visit = visits.find(v => v.id === visitId)
  const isDoctorHandled = visit?.paymentOwner === 'DOCTOR'
  const isReceptionist = currentUser?.role === 'Receptionist'
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)
  const dispensing = dispensings.find(d => d.visitId === visitId)
  const visitPayments = payments.filter(p => p.visitId === visitId)
  const doctor = staff?.find((d: any) => d.id === visit?.doctorId)
  const appointment = appointments?.find(a => a.id === visit?.appointmentId)

  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Dental Imaging State
  const [dentalImages, setDentalImages] = useState<DentalImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [viewerImage, setViewerImage] = useState<DentalImage | null>(null)
  const [imageFilter, setImageFilter] = useState<'ALL' | 'OPG' | 'RVG'>('ALL')
  const [showAllPatientImages, setShowAllPatientImages] = useState(false)

  useEffect(() => {
    if (visit?.patientId) {
      setLoadingPlan(true)
      api.get<TreatmentPlan>(`/api/patients/${visit.patientId}/treatment-plan`)
        .then(res => setTreatmentPlan(res))
        .catch(err => console.error('Failed to load treatment plan:', err))
        .finally(() => setLoadingPlan(false))

      setLoadingImages(true)
      api.get<DentalImage[]>(`/api/patients/${visit.patientId}/dental-images`)
        .then(res => setDentalImages(res || []))
        .catch(err => console.error('Failed to load dental images:', err))
        .finally(() => setLoadingImages(false))
    }
  }, [visit?.patientId])

  // Split images into this visit vs other visits
  const thisVisitImages = useMemo(() => {
    return dentalImages.filter(img => {
      if (img.visitId === visitId) return true
      if (!img.visitId && visit?.createdAt && img.createdAt) {
        return new Date(img.createdAt).toDateString() === new Date(visit.createdAt).toDateString()
      }
      return false
    })
  }, [dentalImages, visitId, visit?.createdAt])

  const otherImages = useMemo(() => {
    return dentalImages.filter(img => !thisVisitImages.some(vImg => vImg.id === img.id))
  }, [dentalImages, thisVisitImages])

  const effectiveImages = useMemo(() => {
    if (showAllPatientImages) return dentalImages
    return thisVisitImages.length > 0 ? thisVisitImages : dentalImages
  }, [showAllPatientImages, thisVisitImages, dentalImages])

  const displayedImages = useMemo(() => {
    if (imageFilter === 'ALL') return effectiveImages
    return effectiveImages.filter(img => img.type === imageFilter)
  }, [effectiveImages, imageFilter])

  const opgCount = useMemo(() => effectiveImages.filter(i => i.type === 'OPG').length, [effectiveImages])
  const rvgCount = useMemo(() => effectiveImages.filter(i => i.type === 'RVG').length, [effectiveImages])

  if (!visit) {
    return <div className="p-8 text-center text-slate-500">Visit records not found.</div>
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

  const handlePrintDocument = async (type: 'prescription' | 'receipt' | 'invoice') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${type}/${visitId}`, {
        method: 'GET',
        credentials: 'include'
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to print ${type}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      console.error(err)
      alert(err.message || `Failed to load ${type} document. Please ensure you are authorized.`)
    }
  }

  // Treatment items applicable to this visit (completed or had sessions in this visit)
  const visitTreatmentItems = treatmentPlan?.items.filter(item => 
    item.completedVisitId === visitId || 
    (item.sessions && item.sessions.some(s => s.visitId === visitId))
  ) || []

  const totalPaid = visitPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const expectedAmount = visit.amountDue || 0
  const balanceDue = Math.max(0, expectedAmount - totalPaid)

  return (
    <div className="space-y-6 pb-8 bg-slate-50 min-h-full">
      {/* 1. VISIT SUMMARY HEADER */}
      <div className="bg-white p-5 sm:p-6 border-b border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visit Summary</span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              #{visit.id.slice(0, 8)}
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>{doctor?.name || 'Unassigned Doctor'}</span>
            {doctor?.role && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {doctor.role}
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
            {visit.createdAt && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(visit.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
            {visit.createdAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 border-slate-200">
              {appointment ? 'Scheduled Appointment' : 'Walk-in Visit'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge 
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              visit.status === 'COMPLETED' 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                : visit.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {visit.status}
          </Badge>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-6">

        {/* 2. CONSULTATION & CLINICAL ASSESSMENT */}
        {consultation && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex flex-wrap justify-between items-center gap-2">
              <span className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                Consultation Details
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {!(isDoctorHandled && isReceptionist) ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">
                    Consultation Fee: ₹{consultation.consultationFee}
                  </span>
                ) : (
                  <span className="text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-md text-xs border border-indigo-200">
                    Handled by Doctor
                  </span>
                )}
                {consultation.treatmentFee !== undefined && consultation.treatmentFee > 0 && (
                  <span className="text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-md text-xs border border-teal-200">
                    Treatment Fee: ₹{consultation.treatmentFee}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reason for Visit / Chief Complaint
                </label>
                <p className="text-slate-900 font-semibold text-sm">
                  {consultation.reasonForVisit || visit.reasonForVisit || 'Not provided'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Clinical Examination & Notes
                </label>
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                  {consultation.clinicalNotes || 'No notes added'}
                </p>
              </div>

              {/* Fee Waivers and Financial Justifications if any */}
              {(consultation.consultationWaiverReason || consultation.treatmentWaiverReason || (visit.discount && visit.discount > 0)) && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Financial Adjustments & Waivers
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {consultation.consultationWaiverReason && (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900">
                        <span className="font-bold block text-amber-950">Consultation Waiver:</span>
                        {consultation.consultationWaiverReason}
                      </div>
                    )}
                    {consultation.treatmentWaiverReason && (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900">
                        <span className="font-bold block text-amber-950">Treatment Waiver:</span>
                        {consultation.treatmentWaiverReason}
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
        )}

        {/* 3. DENTAL IMAGING (OPG & RVG RADIOGRAPHS) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <span>Dental Imaging (OPG / RVG Radiographs)</span>
              <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                {displayedImages.length} {displayedImages.length === 1 ? 'Scan' : 'Scans'}
              </Badge>
            </div>

            {/* Toggle Switch & Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {dentalImages.length > thisVisitImages.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllPatientImages(!showAllPatientImages)}
                  className={`h-7 text-xs px-2.5 transition-colors ${
                    showAllPatientImages 
                      ? 'bg-purple-100 border-purple-300 text-purple-900 font-semibold' 
                      : 'bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {showAllPatientImages ? `Showing All Scans (${dentalImages.length})` : `Show All Patient Scans (${dentalImages.length})`}
                </Button>
              )}

              {/* Type Filter */}
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setImageFilter('ALL')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                    imageFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({effectiveImages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setImageFilter('OPG')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                    imageFilter === 'OPG'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-purple-700'
                  }`}
                >
                  OPG ({opgCount})
                </button>
                <button
                  type="button"
                  onClick={() => setImageFilter('RVG')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${
                    imageFilter === 'RVG'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-teal-700'
                  }`}
                >
                  RVG ({rvgCount})
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loadingImages ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span>Loading dental radiographs...</span>
              </div>
            ) : displayedImages.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {imageFilter === 'ALL' ? 'No dental radiographs found' : `No ${imageFilter} radiographs found`}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {!showAllPatientImages && otherImages.length > 0 ? (
                    <span>
                      No radiographs were directly linked to this specific visit, but <strong>{otherImages.length} radiograph(s)</strong> are recorded in the patient&apos;s history.{' '}
                      <button 
                        type="button" 
                        onClick={() => setShowAllPatientImages(true)} 
                        className="text-purple-600 font-bold hover:underline inline-flex items-center gap-0.5"
                      >
                        View all patient scans
                      </button>
                    </span>
                  ) : (
                    'No OPG tomographs or RVG intraoral scans recorded for this visit.'
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {displayedImages.map(img => {
                  const toothInfo = img.toothNumber ? getToothInfo(img.toothNumber) : undefined
                  const isFromThisVisit = thisVisitImages.some(vImg => vImg.id === img.id)

                  return (
                    <div
                      key={img.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Radiograph Thumbnail with High-Contrast Dark Backdrop */}
                      <div
                        onClick={() => setViewerImage(img)}
                        className="relative h-44 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden group/thumb select-none"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.title || img.fileName}
                          className="max-h-full max-w-full object-contain group-hover/thumb:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />

                        {/* Floating hover overlay */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3 text-xs font-semibold bg-white/95 text-slate-900 hover:bg-white shadow-md"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            Inspect Full Size
                          </Button>
                        </div>

                        {/* Badges in top-left */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap max-w-[85%]">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
                              img.type === 'OPG'
                                ? 'bg-purple-900/90 text-purple-200 border border-purple-700/60'
                                : 'bg-teal-900/90 text-teal-200 border border-teal-700/60'
                            }`}
                          >
                            {img.type}
                          </span>

                          {img.toothNumber && (
                            <span className="text-[10px] font-bold bg-sky-950/90 text-sky-200 border border-sky-700/60 px-2 py-0.5 rounded shadow-xs">
                              Tooth {img.toothNumber}
                            </span>
                          )}

                          {!isFromThisVisit && (
                            <span className="text-[9px] font-semibold bg-amber-950/80 text-amber-200 border border-amber-700/60 px-1.5 py-0.5 rounded shadow-xs">
                              Other Visit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Metadata */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900 truncate" title={img.title || img.fileName}>
                              {img.title || img.fileName}
                            </h5>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {formatFileSize(img.fileSize)}
                            </span>
                          </div>

                          {toothInfo && (
                            <p className="text-[11px] text-sky-700 font-semibold truncate">
                              {toothInfo.name} ({toothInfo.quadrant})
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {img.createdAt ? new Date(img.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            {img.createdAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(img.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {img.notes && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 mt-1">
                              {img.notes}
                            </p>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewerImage(img)}
                            className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 flex-1 justify-center"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            Inspect
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDownloadImage(e, img)}
                            className="h-7 px-2 text-xs font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200"
                            title="Download Radiograph File"
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                            Download
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

        {/* 4. TREATMENTS PERFORMED */}
        {treatmentPlan && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Treatments Performed ({visitTreatmentItems.length})
              </span>
              {visit.treatmentFee !== undefined && visit.treatmentFee > 0 && (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md text-xs border border-emerald-200">
                  Fee: ₹{visit.treatmentFee}
                </span>
              )}
            </div>

            <div className="p-4">
              {loadingPlan ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading treatments...</span>
                </div>
              ) : visitTreatmentItems.length > 0 ? (
                <div className="space-y-3">
                  {visitTreatmentItems.map(item => {
                    const toothInfo = item.toothNumber ? getToothInfo(item.toothNumber) : undefined
                    const visitSessions = item.sessions?.filter(s => s.visitId === visitId) || []

                    return (
                      <div key={item.id} className="flex items-start justify-between text-sm text-slate-700 bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100/70">
                        <div className="flex items-start gap-3 w-full">
                          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="w-full space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.toothNumber && (
                                <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">
                                  Tooth {item.toothNumber}
                                  {toothInfo && ` • ${toothInfo.name}`}
                                </span>
                              )}
                              <span className="font-bold text-slate-900 text-sm">
                                {item.catalogItem?.name} {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                              </span>
                              <Badge 
                                className={`text-[10px] ${
                                  item.status === 'Completed' 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                }`}
                              >
                                {item.status}
                              </Badge>
                            </div>

                            {visitSessions.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {visitSessions.map(s => (
                                  <div key={s.id} className="text-xs bg-white p-2 rounded-lg border border-emerald-200 text-slate-700 space-y-1">
                                    <div className="flex items-center justify-between font-semibold">
                                      <span className="text-indigo-700">Sitting {s.sittingNumber} of {item.totalSittings || 1}</span>
                                      {s.doctor?.name && <span className="text-slate-500 font-normal">Dr. {s.doctor.name}</span>}
                                      {s.fee ? <span className="text-emerald-700 font-bold">₹{s.fee}</span> : null}
                                    </div>
                                    {s.stage && <p className="text-slate-800 font-medium">Stage: {s.stage}</p>}
                                    {s.workPerformed && <p className="text-slate-600">Work Performed: {s.workPerformed}</p>}
                                    {s.materialsUsed && <p className="text-slate-500 text-[11px]">Materials Used: {s.materialsUsed}</p>}
                                    {s.followUpInstructions && (
                                      <p className="text-amber-800 bg-amber-50 p-1.5 rounded text-[11px] mt-1 border border-amber-200/60">
                                        Follow-up: {s.followUpInstructions}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">No treatments were performed during this visit.</p>
              )}
            </div>
          </div>
        )}

        {/* 5. PRESCRIPTION */}
        {prescription && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-sky-600" />
                Prescription
              </span>
              <Button variant="outline" size="sm" onClick={() => handlePrintDocument('prescription')} className="h-7 text-xs bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Print Prescription
              </Button>
            </div>
            
            <div className="p-4">
              {prescription.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Medicine</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Dosage & Frequency</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Duration</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prescription.items.map(item => {
                        const med = medicines.find(m => m.id === item.medicineId)
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5">
                              <p className="text-slate-900 font-semibold">{med?.name || 'Unknown'}</p>
                              {item.instructions && <p className="text-xs text-slate-500 mt-0.5">{item.instructions}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 align-top">
                              {item.dosage || '-'} • {item.frequency || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 align-top">
                              {item.duration || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-900 font-bold align-top text-right">
                              {item.quantity}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-3">No medicines prescribed during this visit.</p>
              )}
              {prescription.notes && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prescription Notes</label>
                  <p className="text-slate-700 text-sm bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">{prescription.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. DISPENSING STATUS */}
        {dispensing && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Pharmacy Dispensing Status
              </span>
              <Badge className={`text-xs ${
                dispensing.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {dispensing.status}
              </Badge>
            </div>
            <div className="p-4">
              {dispensing.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Medicine</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Prescribed</th>
                        <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Dispensed</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dispensing.items.map(item => {
                        const med = medicines.find(m => m.id === item.medicineId)
                        const isFullyDispensed = item.dispensedQuantity >= item.prescribedQuantity
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5 text-slate-900 font-semibold">{med?.name || 'Unknown'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-700">{item.prescribedQuantity}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-emerald-600 bg-emerald-50/50">{item.dispensedQuantity}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Badge className={`text-[10px] ${
                                isFullyDispensed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isFullyDispensed ? 'Fulfilled' : 'Pending'}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-3">No items dispensed.</p>
              )}
            </div>
          </div>
        )}

        {/* 7. FINANCIAL SUMMARY & PAYMENTS */}
        {isDoctorHandled && isReceptionist ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden border-l-4 border-l-indigo-500">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Payment Records
              </span>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Handled by Doctor</Badge>
            </div>
            <div className="p-4 text-sm text-slate-600">
              Payments and fee collection for this visit were marked as directly handled by the attending doctor.
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden border-l-4 border-l-teal-500">
            <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex flex-wrap justify-between items-center gap-2">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                Financial Summary & Payments ({visitPayments.length})
              </span>
              <div className="flex items-center gap-2">
                {visitPayments.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handlePrintDocument('receipt')} className="h-7 text-xs bg-white">
                      <FileText className="w-3 h-3 mr-1.5 text-teal-600" /> Print Receipt
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrintDocument('invoice')} className="h-7 text-xs bg-white">
                      <FileText className="w-3 h-3 mr-1.5 text-blue-600" /> Print Invoice
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="p-4 bg-slate-50/40 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Amount Due</span>
                <span className="text-base font-bold text-slate-900">₹{expectedAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Total Paid</span>
                <span className="text-base font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Balance</span>
                <span className={`text-base font-bold ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                  ₹{balanceDue.toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-0.5">Payment Status</span>
                <Badge className={`mt-0.5 text-xs ${
                  balanceDue === 0 && totalPaid > 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : totalPaid > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-slate-100 text-slate-700'
                }`}>
                  {balanceDue === 0 && totalPaid > 0 ? 'Paid in Full' : totalPaid > 0 ? 'Partial' : 'Unpaid'}
                </Badge>
              </div>
            </div>

            {/* Individual Payments List */}
            {visitPayments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {visitPayments.map((p, idx) => (
                  <div key={p.id || idx} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        {visitPayments.length > 1 ? `Payment #${idx + 1}` : 'Amount Collected'}
                      </label>
                      <p className="text-base font-bold text-slate-900">₹{p.amount}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Payment Method</label>
                      <Badge variant="secondary" className="font-semibold">{p.method}</Badge>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Recorded At</label>
                      <span className="text-slate-600">
                        {p.createdAt ? `${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No formal payment transaction recorded for this visit.
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Full Patient History Navigation Link */}
      {onViewHistory && (
        <div className="px-4 sm:px-6 pt-2">
          <Button 
            variant="outline" 
            className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
            onClick={onViewHistory}
          >
            View Complete Patient History & All Visits
          </Button>
        </div>
      )}

      {/* Full-Screen Radiograph Lightbox Viewer */}
      <DentalImageViewerModal
        image={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />
    </div>
  )
}
