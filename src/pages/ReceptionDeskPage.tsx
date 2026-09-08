import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Clock, Receipt, CheckCircle, Search, Calendar, Package, FileText, CheckCircle2, Pencil, Eye, Trash2, Send, CreditCard, Activity, XCircle, Camera, X, AlertTriangle } from 'lucide-react';
import { useClinicContext } from '../context/ClinicContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { DataTable } from '../components/data-table/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetScrollArea, SheetTitle } from '../components/ui/sheet';
import { DrawerSection, DrawerFooterActions } from '../components/ui/drawer-patterns';
import { CameraCapture } from '../components/ui/camera-capture';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'react-hot-toast';
import type { QueueEntry, Visit } from '../types/domain';

import { DispensingMedicineItem } from '../components/dispensing/dispensing-components';
import { PaymentMethodSelector } from '../components/payment/payment-components';
import type { PaymentMethod } from '../components/payment/payment-components';
import { HistoricalVisitDetails } from '../components/history/HistoricalVisitDetails';
import { PatientClinicalSummary, PatientVisitHistory } from '../components/consultation/consultation-components';
import { API_BASE_URL } from '../lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export function ReceptionDeskPage() {
  const { queue, visits, patients, staff, startVisit, updateVisit, assignDoctor, appointments, addAppointment, confirmAppointmentArrival, addPatient, updatePatient, prescriptions, dispensings, completeDispensing, recordPayment, medicines, payments, cancelVisit, consultations } = useClinicContext();

  const navigate = useNavigate();

  const [search, setSearch] = useState('');

  // Registration Drawer
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editDrawerMode, setEditDrawerMode] = useState<'edit' | 'view'>('edit');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);


  const [regType, setRegType] = useState<'walk-in' | 'appointment'>('walk-in');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [regData, setRegData] = useState({ name: '', phone: '', age: '', gender: 'Male', address: '', reasonForVisit: '', photoUrl: '' });
  const [apptData, setApptData] = useState({ date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Consultation', notes: '' });

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Payment States
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentReason, setPaymentReason] = useState<string>('');
  const [paymentReasonOther, setPaymentReasonOther] = useState<string>('');
  const [processTreatmentPlan, setProcessTreatmentPlan] = useState<any | null>(null);

  // Assignment Modal
  const [assignQueueId, setAssignQueueId] = useState<string | null>(null);

  // Process Visit Drawer
  const [processVisitId, setProcessVisitId] = useState<string | null>(null);

  // Completed View Drawer
  const [viewVisitId, setViewVisitId] = useState<string | null>(null);

  // Patient History Dialog
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);

  // Modals for Phase 9.1
  const [deleteVisitId, setDeleteVisitId] = useState<string | null>(null);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{ patientId: string, name: string } | null>(null);
  const [confirmAssignData, setConfirmAssignData] = useState<{ queueId: string, doctorId: string, doctorName: string } | null>(null);

  // Dispensing State
  const [activeItems, setActiveItems] = useState<any[]>([]);

  // Payment State
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(null);

  // Derive Doctors and their Availability
  const doctors = useMemo(() => {
    return staff.filter(s => ['Head Doctor', 'Duty Doctor'].includes(s.role) && s.status === 'Active');
  }, [staff]);

  const doctorAvailability = useMemo(() => {
    const availability: Record<string, 'Available' | 'With Patient' | 'Leave'> = {};
    doctors.forEach(doc => {
      if (doc.attendance === 'Leave') {
        availability[doc.id] = 'Leave';
      } else {
        // A doctor is with a patient if they have ANY queue entry In Progress
        const hasActive = queue.some(q => q.assignedDoctorId === doc.id && q.status === 'In Progress');
        availability[doc.id] = hasActive ? 'With Patient' : 'Available';
      }
    });
    return availability;
  }, [doctors, queue]);

  // Unified Table Data
  const unifiedData = useMemo(() => {
    let data = queue.map(q => {
      const v = visits.find(v => v.id === q.visitId);
      const p = patients.find(p => p.id === q.patientId);
      const d = doctors.find(doc => doc.id === q.assignedDoctorId);
      const isAppointment = v?.appointmentId != null;

      // Translate queue status to receptionist stage
      let stage = 'Waiting';
      if (q.status === 'Waiting') stage = 'Waiting';
      else if (q.status === 'In Progress' || q.status === 'With Doctor' || q.status === 'Called') stage = 'With Doctor';
      else if (q.status === 'Transferred') stage = 'Transferred';
      else if (q.status === 'Completed' && v?.status !== 'COMPLETED') stage = 'Ready at Reception';
      else if (q.status === 'Dispensing' || q.status === 'Payment' || q.status === 'Ready at Reception') stage = 'Ready at Reception';
      else stage = q.status; // fallback to raw status instead of incorrectly showing Waiting

      const visitPayments = payments.filter(pay => pay.visitId === v?.id);
      const totalPaid = visitPayments.reduce((sum, pay) => sum + pay.amount, 0);
      const amountDue = v?.amountDue || 0;

      let paymentStatus = '—';
      if (stage === 'Ready at Reception' || stage === 'Completed') {
        paymentStatus = 'Unpaid';
        if (amountDue > 0 && totalPaid >= amountDue) paymentStatus = 'Paid';
        else if (totalPaid > 0) paymentStatus = 'Partial';
        else if (amountDue === 0 && v) paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'Partial';
      }

      return {
        id: q.id,
        visitId: q.visitId,
        patientId: p?.id,
        patientName: p?.name || 'Unknown',
        patientPhone: p?.phone || '',
        visitType: isAppointment ? 'Appointment' : 'Walk-in',
        token: q.position || '-',
        doctor: d?.name || '-',
        reasonForVisit: v?.reasonForVisit,
        stage: stage,
        paymentStatus,
        rawStatus: q.status, // keep raw for action logic
        arrivalTime: q.arrivalTime,
        rawVisit: v,
        rawQueue: q,
      };
    });

    // Also add completed and cancelled visits for today that are no longer in active queue
    const activeVisitIds = new Set(queue.map(q => q.visitId));
    const inactiveVisits = visits.filter(v => (v.status === 'COMPLETED' || v.status === 'CANCELLED') && !activeVisitIds.has(v.id));

    inactiveVisits.forEach(v => {
      const p = patients.find(p => p.id === v.patientId);
      const d = doctors.find(doc => doc.id === v.doctorId);
      const isAppointment = v.appointmentId != null;

      const visitPayments = payments.filter(pay => pay.visitId === v.id);
      const totalPaid = visitPayments.reduce((sum, pay) => sum + pay.amount, 0);
      const amountDue = v.amountDue || 0;

      let paymentStatus = '—';
      if (v.status === 'COMPLETED') {
        paymentStatus = 'Unpaid';
        if (amountDue > 0 && totalPaid >= amountDue) paymentStatus = 'Paid';
        else if (totalPaid > 0) paymentStatus = 'Partial';
        else if (amountDue === 0) paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'Partial';
      }

      data.push({
        id: v.id,
        visitId: v.id,
        patientId: p?.id,
        patientName: p?.name || 'Unknown',
        patientPhone: p?.phone || '',
        visitType: isAppointment ? 'Appointment' : 'Walk-in',
        token: '-',
        doctor: d?.name || '-',
        reasonForVisit: v.reasonForVisit,
        stage: v.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        paymentStatus,
        rawStatus: v.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        arrivalTime: '-',
        rawVisit: v,
        rawQueue: null,
      });
    });

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(d =>
        d.patientName.toLowerCase().includes(s) ||
        d.patientPhone.includes(s)
      );
    }

    // Sort by token number descending (latest first)
    data.sort((a, b) => {
      const tokenA = typeof a.token === 'number' ? a.token : 0;
      const tokenB = typeof b.token === 'number' ? b.token : 0;
      return tokenB - tokenA;
    });

    return data;
  }, [queue, visits, patients, doctors, search]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'token',
      header: () => <div className="text-center font-semibold text-slate-600">Token No.</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
            #{row.original.token}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'patientName',
      header: () => <div className="text-center font-semibold text-slate-600">Patient Name</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <div
            className="font-medium text-slate-900 truncate max-w-[150px] text-center"
            title={row.original.patientName}
          >
            {row.original.patientName}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'visitType',
      header: () => <div className="text-center font-semibold text-slate-600">Visit Type</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className={`whitespace-nowrap ${row.original.visitType === 'Appointment' ? 'text-indigo-600' : 'text-slate-600'}`}>
            {row.original.visitType}
          </Badge>
        </div>
      )
    },
    {
      accessorKey: 'doctor',
      header: () => <div className="text-center font-semibold text-slate-600">Doctor Name</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <div
            className="text-slate-600 truncate max-w-[120px] text-center"
            title={row.original.doctor === '-' ? '' : row.original.doctor}
          >
            {row.original.doctor === '-' ? '—' : row.original.doctor}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'paymentStatus',
      header: () => <div className="text-center font-semibold text-slate-600">Payment Status</div>,
      cell: ({ row }) => {
        const s = row.original.paymentStatus;
        let badge = <span className="text-slate-400">—</span>;
        if (s === 'Paid') badge = <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>;
        else if (s === 'Partial') badge = <Badge className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>;
        else if (s === 'Unpaid') badge = <Badge className="bg-rose-100 text-rose-800 border-rose-200">Unpaid</Badge>;

        return <div className="text-center">{badge}</div>;
      }
    },
    {
      accessorKey: 'stage',
      header: () => <div className="text-center font-semibold text-slate-600">Status</div>,
      cell: ({ row }) => {
        const s = row.original.stage;
        let badge = <Badge variant="outline" className="whitespace-nowrap">{s}</Badge>;
        if (s === 'Waiting') badge = <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 whitespace-nowrap">🟡 Waiting</Badge>;
        else if (s === 'With Doctor') badge = <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 whitespace-nowrap">🔵 With Doctor</Badge>;
        else if (s === 'Transferred') badge = <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 whitespace-nowrap">🔄 Transferred</Badge>;
        else if (s === 'Ready at Reception') badge = <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 whitespace-nowrap">🟢 Ready at Reception</Badge>;
        else if (s === 'Completed') badge = <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 whitespace-nowrap">✅ Completed</Badge>;
        else if (s === 'Cancelled') badge = <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 whitespace-nowrap">🚫 Cancelled</Badge>;

        return <div className="text-center">{badge}</div>;
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-center font-semibold text-slate-600">Action</div>,
      cell: ({ row }) => {
        const stage = row.original.stage;
        const isCancelledOrCompleted = stage === 'Cancelled' || stage === 'Completed';
        const isWaiting = stage === 'Waiting';
        const isReadyForReception = stage === 'Ready at Reception';

        return (
          <div className="flex items-center justify-center gap-2">
            {/* Edit Patient */}
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-teal-600 hover:bg-teal-50"
              title="Edit Patient"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                const patient = patients.find(p => p.id === row.original.patientId);
                if (patient) {
                  setEditingPatientId(patient.id);
                  setEditingVisitId(row.original.visitId || null);
                  setRegData({
                    name: patient.name,
                    phone: patient.phone,
                    age: patient.age.toString(),
                    gender: patient.gender,
                    address: patient.address || '',
                    reasonForVisit: row.original.reasonForVisit || row.original.rawVisit?.reasonForVisit || 'Routine Checkup',
                    photoUrl: patient.photoUrl || ''
                  });
                  setEditDrawerMode('edit');
                  setIsEditPatientOpen(true);
                }
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>

            {/* View Patient Details */}
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-blue-600 hover:bg-blue-50"
              title="View Patient Details"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                const patient = patients.find(p => p.id === row.original.patientId);
                if (patient) {
                  setEditingPatientId(patient.id);
                  setEditingVisitId(row.original.visitId || null);
                  setRegData({
                    name: patient.name,
                    phone: patient.phone,
                    age: patient.age.toString(),
                    gender: patient.gender,
                    address: patient.address || '',
                    reasonForVisit: row.original.reasonForVisit || row.original.rawVisit?.reasonForVisit || 'Routine Checkup',
                    photoUrl: patient.photoUrl || ''
                  });
                  setEditDrawerMode('view');
                  setIsEditPatientOpen(true);
                }
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* Send to Doctor (Share) */}
            <Button
              size="icon"
              variant="ghost"
              disabled={!isWaiting}
              className={`w-8 h-8 ${isWaiting ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
              title={isWaiting ? "Send to Doctor" : "Cannot send to doctor at this stage"}
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (isWaiting) setAssignQueueId(row.original.id);
              }}
            >
              <Send className="w-4 h-4" />
            </Button>

            {/* Process Visit */}
            <Button
              size="icon"
              variant="ghost"
              disabled={!isReadyForReception}
              className={`w-8 h-8 ${isReadyForReception ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
              title={isReadyForReception ? "Checkout & Billing" : "Not ready for processing"}
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (isReadyForReception) handleOpenProcess(row.original);
              }}
            >
              <CreditCard className="w-4 h-4" />
            </Button>

            {/* Cancel Visit */}
            <Button
              size="icon"
              variant="ghost"
              disabled={isCancelledOrCompleted || row.original.doctor !== '-'}
              className={`w-8 h-8 ${!(isCancelledOrCompleted || row.original.doctor !== '-') ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-300 opacity-50 cursor-not-allowed'}`}
              title={!(isCancelledOrCompleted || row.original.doctor !== '-') ? "Cancel Visit" : "Cannot cancel once doctor is assigned"}
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (!(isCancelledOrCompleted || row.original.doctor !== '-')) handleCancelVisit(row.original.visitId);
              }}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  const handleCancelVisit = async (visitId: string) => {
    const result = await MySwal.fire({
      title: 'Cancel this visit?',
      text: "This will cancel the patient's current visit. Patient history and records will be preserved.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancel Visit',
      cancelButtonText: 'Keep Visit',
      confirmButtonColor: '#e11d48', // rose-600
      cancelButtonColor: '#94a3b8', // slate-400
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg font-semibold px-6 py-2',
        cancelButton: 'rounded-lg font-semibold px-6 py-2'
      }
    });

    if (result.isConfirmed) {
      const res = await cancelVisit(visitId);
      if (res.success) {
        MySwal.fire({
          title: 'Cancelled',
          text: 'The visit has been successfully cancelled.',
          icon: 'success',
          confirmButtonColor: '#0d9488',
          customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg font-semibold px-8 py-2' }
        });
      } else {
        MySwal.fire('Error', res.error || 'Failed to cancel the visit', 'error');
      }
    }
  };

  const handleRegister = async () => {
    let finalPatientId = selectedExistingPatientId;

    if (isNewPatient) {
      if (!regData.name || !regData.phone) {
        toast.error("Name and Phone are required");
        return;
      }

      const normPhone = regData.phone.replace(/\D/g, '').slice(-10);
      const existing = patients.find(p => p.phone.replace(/\D/g, '').slice(-10) === normPhone);
      if (existing) {
        MySwal.fire({
          title: 'Duplicate Phone Number',
          html: `A patient is already registered with this phone number: <br/><br/><b>${existing.name}</b> (${existing.phone})<br/><br/>Please search for this patient instead of registering a new one to avoid duplicate records.`,
          icon: 'warning',
          confirmButtonText: 'Understood',
          confirmButtonColor: '#0d9488',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg font-semibold px-8 py-2'
          }
        });
        return;
      }

      try {
        const newPatient = await addPatient({
          name: regData.name,
          phone: regData.phone,
          age: parseInt(regData.age) || 30,
          gender: regData.gender as any,
          status: 'Active',
          address: (regData as any).address || '',
          photoUrl: (regData as any).photoUrl || ''
        });
        finalPatientId = newPatient.id;
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to register patient");
        return;
      }
    }

    if (!finalPatientId) {
      toast.error("Please select or register a patient.");
      return;
    }

    try {
      let patientDetails = patients.find(p => p.id === finalPatientId);
      if (!patientDetails && isNewPatient) {
        patientDetails = { name: regData.name, phone: regData.phone } as any;
      }

      const showSuccessModal = (title: string, subtext: string) => {
        MySwal.fire({
          title: `<span class="text-2xl font-bold text-slate-800">${title}</span>`,
          html: `
            <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
              <div class="grid grid-cols-3 gap-2 text-sm">
                <div class="text-slate-500 font-medium">Patient</div>
                <div class="col-span-2 font-semibold text-slate-900">${patientDetails?.name || 'N/A'}</div>
                <div class="text-slate-500 font-medium">Phone</div>
                <div class="col-span-2 font-mono text-slate-700">${patientDetails?.phone || 'N/A'}</div>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-200 text-teal-600 font-medium text-center text-sm">
                ${subtext}
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0d9488',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg font-semibold px-8 py-2'
          }
        });
      };

      if (regType === 'walk-in') {
        await startVisit(finalPatientId, undefined, false, regData.reasonForVisit || 'General Consultation');
        showSuccessModal('Registration Complete', isNewPatient ? "Patient registered and added to Waiting list" : "Walk-in added to Waiting list");
        setIsRegisterOpen(false);
        setRegData({ name: '', phone: '', age: '', gender: 'Male', address: '', reasonForVisit: '', photoUrl: '' });
        setSelectedExistingPatientId('');
      } else {
        const appointment = await addAppointment({
          patientId: finalPatientId,
          date: apptData.date,
          time: apptData.time,
          type: apptData.type as any,
          status: 'Scheduled',
          notes: apptData.notes
        });

        const today = new Date().toISOString().split('T')[0];
        if (apptData.date === today) {
          await confirmAppointmentArrival(appointment.id);
          showSuccessModal('Checked In', isNewPatient ? "Patient registered and checked in for today's appointment." : "Checked in for today's appointment.");
        } else {
          showSuccessModal('Appointment Booked', isNewPatient ? "Patient registered and appointment created." : "Appointment created successfully.");
        }

        setIsRegisterOpen(false);
        setRegData({ name: '', phone: '', age: '', gender: 'Male', address: '', reasonForVisit: '', photoUrl: '' });
        setSelectedExistingPatientId('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to start walk-in visit");
    }
  };

  const handleAssignDoctor = async () => {
    if (!confirmAssignData) return;
    const { queueId, doctorId } = confirmAssignData;
    const result = await assignDoctor(queueId, doctorId);
    if (result.success) {
      const targetQ = queue.find(q => q.id === queueId);
      const doc = staff.find(d => d.id === doctorId);
      const patient = patients.find(p => p.id === targetQ?.patientId);

      MySwal.fire({
        title: `<span class="text-2xl font-bold text-slate-800">Doctor Assigned</span>`,
        html: `
          <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
            <div class="grid grid-cols-3 gap-2 text-sm">
              <div class="text-slate-500 font-medium">Patient</div>
              <div class="col-span-2 font-semibold text-slate-900">${patient?.name || 'N/A'}</div>
              <div class="text-slate-500 font-medium">Doctor</div>
              <div class="col-span-2 font-semibold text-slate-900">${doc?.name || 'N/A'}</div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-200 text-teal-600 font-medium text-center text-sm">
              Patient sent to doctor's queue.
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0d9488',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-lg font-semibold px-8 py-2'
        }
      });

      setAssignQueueId(null);
      setConfirmAssignData(null);
    } else {
      toast.error(result.error || 'Failed to assign doctor');
    }
  };

  const handleOpenProcess = (row: any) => {
    const rx = prescriptions.find(r => r.visitId === row.visitId && r.status === 'Finalized');
    const disp = dispensings.find(d => d.visitId === row.visitId);

    if (rx) {
      const items = rx.items.map((ri, idx) => {
        const med = medicines.find(m => m.id === ri.medicineId);
        const dItem = disp?.items.find(di => di.medicineId === ri.medicineId);
        const availableStock = med?.currentStock || 0;
        const initialDispensed = dItem !== undefined ? dItem.dispensedQuantity : ri.quantity;
        const isDispensed = dItem !== undefined ? dItem.dispensedQuantity > 0 : true;

        return {
          id: `i${idx}`,
          medicineId: ri.medicineId,
          name: med?.name || 'Unknown',
          strength: med?.unit || '',
          categoryId: med?.categoryId || 'cat1',
          prescribedQty: ri.quantity,
          isDispensed: isDispensed,
          dispensedQty: isDispensed ? initialDispensed : 0,
          availableStock,
          unitPrice: med?.unitPrice || 0
        };
      });
      setActiveItems(items);
    } else {
      setActiveItems([]);
    }

    setActiveMethod(null);
    setPaymentAmount('');
    setPaymentReason('');
    setPaymentReasonOther('');
    setProcessTreatmentPlan(null);
    setProcessVisitId(row.visitId);

    const v = visits.find(vis => vis.id === row.visitId);
    const pId = row.patientId || v?.patientId;
    if (pId) {
      api.get<any>(`/api/patients/${pId}/treatment-plan`)
        .then(res => setProcessTreatmentPlan(res))
        .catch(() => setProcessTreatmentPlan(null));
    }
  };

  const handleCompleteDispensing = async () => {
    if (!processVisitId) return;
    const rx = prescriptions.find(r => r.visitId === processVisitId && r.status === 'Finalized');
    if (!rx) return;

    // Validate quantities for all items
    for (const item of activeItems) {
      if (item.isDispensed) {
        if (!item.dispensedQty || item.dispensedQty < 1) {
          toast.error(`Please enter a valid quantity (at least 1) for ${item.name} or uncheck Dispense.`);
          return;
        }
        if (item.dispensedQty > item.prescribedQty) {
          toast.error(`Dispense quantity for ${item.name} cannot exceed prescribed quantity (${item.prescribedQty}).`);
          return;
        }
        if (item.dispensedQty > item.availableStock) {
          toast.error(`Insufficient stock for ${item.name}. Available: ${item.availableStock}, Requested: ${item.dispensedQty}.`);
          return;
        }
      }
    }

    const mappedItems = activeItems.map(ai => ({
      medicineId: ai.medicineId,
      prescribedQuantity: ai.prescribedQty,
      dispensedQuantity: ai.isDispensed ? Number(ai.dispensedQty) : 0
    }));

    const result = await completeDispensing(processVisitId, rx.id, mappedItems);
    if (result.success) {
      toast.success('Dispensing completed');
    } else {
      toast.error(result.error || 'Failed to complete dispensing');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!processVisitId || !activeMethod) {
      toast.error('Please select a payment method');
      return;
    }
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const visitPayments = payments.filter(p => p.visitId === processVisitId);
    const totalPaid = visitPayments.reduce((sum, p) => sum + p.amount, 0);
    const calculatedDue = (activeProcessVisit?.consultationFee || 0) + (activeProcessVisit?.treatmentFee || 0) + (activeProcessVisit?.medicineCost || 0);
    const amountDue = calculatedDue > 0 ? calculatedDue : (activeProcessVisit?.amountDue || 0);
    const balance = amountDue - totalPaid;

    if (amt > balance) {
      toast.error(`Payment amount cannot exceed remaining balance (₹${balance})`);
      return;
    }

    const isPartial = amt < balance;
    let finalNotes: string | undefined;

    if (isPartial) {
      if (!paymentReason) {
        toast.error('A reason is required when leaving a balance.');
        return;
      }
      if (paymentReason === 'Other') {
        if (!paymentReasonOther.trim()) {
          toast.error('Please specify the reason.');
          return;
        }
        finalNotes = `Other: ${paymentReasonOther.trim()}`;
      } else {
        finalNotes = paymentReason;
      }
    }

    const result = await recordPayment(processVisitId, amt, activeMethod as 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card', finalNotes);
    if (result.success) {
      toast.success('Payment recorded successfully');
      setPaymentAmount(''); // Reset for next payment if balance remains
      setPaymentReason('');
      setPaymentReasonOther('');
      setActiveMethod(null);
    } else {
      toast.error(result.error || 'Failed to record payment');
    }
  };

  const handlePrintDocument = async (type: 'prescription' | 'receipt') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${type}/${processVisitId}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Failed to print ${type}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${type} document.`);
    }
  };

  const activeProcessVisit = visits.find(v => v.id === processVisitId);
  const activeProcessPatient = patients.find(p => p.id === activeProcessVisit?.patientId);
  const activeProcessDoctor = doctors.find(d => d.id === activeProcessVisit?.doctorId);
  const activeProcessQueue = queue.find(q => q.visitId === processVisitId);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col h-screen overflow-hidden">
      <div className="h-16 shrink-0  px-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reception Desk</h1>
          <p className="text-sm text-slate-500">Register patients, manage today's visits, and complete reception tasks.</p>
        </div>
        <Button
          onClick={() => {
            setRegData({ name: '', phone: '', age: '', gender: 'Male', address: '', reasonForVisit: '', photoUrl: '' });
            setIsNewPatient(false);
            setSelectedExistingPatientId('');
            setPatientSearch('');
            setIsRegisterOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 shadow-sm text-white"
        >
          <Users className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Doctor Availability Section */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              Doctors
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {doctors.map(doc => {
                const avail = doctorAvailability[doc.id];
                const isLeave = avail === 'Leave';
                const isAvailable = avail === 'Available';

                const bgClass = isAvailable ? 'bg-emerald-600 border-emerald-700' : isLeave ? 'bg-slate-200 border-slate-300' : 'bg-rose-600 border-rose-700';
                const textClass = isLeave ? 'text-slate-700' : 'text-white';
                const textSubClass = isLeave ? 'text-slate-600' : 'text-white/90';

                return (
                  <div key={doc.id} className={`rounded-xl p-4 flex flex-col justify-between transition-all border shadow-md hover:shadow-lg ${bgClass} ${isLeave ? 'opacity-80' : ''} ${isAvailable ? 'animate-pulse' : ''}`}>
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div>
                        <h3 className={`font-bold text-lg leading-tight ${textClass}`}>{doc.name}</h3>
                        <p className={`font-bold text-sm ${textSubClass}`}>{doc.role}</p>
                        <p className={`font-bold text-sm ${textSubClass}`}>Room {doc.roomNumber || '—'}</p>
                      </div>
                      <Badge variant="outline"
                        className={`shrink-0 shadow-sm ${isAvailable ? 'bg-white/20 text-white border-white/20' : isLeave ? 'bg-slate-300 text-slate-700 border-slate-400' : 'bg-white/20 text-white border-white/20'}`}>
                        {isAvailable ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Available
                          </span>
                        ) : isLeave ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Leave
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-medium">
                            <Activity className="w-3.5 h-3.5" />
                            With Patient
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Unified Operations Table */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-base font-semibold text-slate-900">Active Queue</h2>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search patients..."
                  className="pl-9 bg-white border-slate-200 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={unifiedData}
            />
          </section>

        </div>
      </div>

      {/* Doctor Assignment Modal */}
      <Dialog open={!!assignQueueId && !confirmAssignData} onOpenChange={open => !open && setAssignQueueId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send to Doctor</DialogTitle>
            <DialogDescription>Select an available doctor for this patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {doctors.map(doc => {
              const avail = doctorAvailability[doc.id];
              const isAvail = avail === 'Available';
              const isLeave = avail === 'Leave';

              return (
                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isAvail ? 'border-emerald-200 bg-emerald-50' : isLeave ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-red-200 bg-red-50 opacity-70'}`}>
                  <div>
                    <h4 className={`font-medium ${isAvail ? 'text-emerald-900' : isLeave ? 'text-slate-600' : 'text-red-900'}`}>
                      {doc.name} {isLeave && <span className="text-xs font-normal ml-2">(On Leave)</span>}
                    </h4>
                    <span className={`text-xs ${isAvail ? 'text-emerald-600' : isLeave ? 'text-slate-500' : 'text-red-600'}`}>Room {doc.roomNumber || '—'}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={isAvail ? "default" : "secondary"}
                    disabled={!isAvail}
                    onClick={() => setConfirmAssignData({ queueId: assignQueueId!, doctorId: doc.id, doctorName: doc.name })}
                    className={isAvail ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  >
                    Send
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignQueueId(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <Dialog open={!!confirmAssignData} onOpenChange={open => !open && setConfirmAssignData(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Assignment</DialogTitle>
            <DialogDescription>Are you sure you want to assign this patient to {confirmAssignData?.doctorName}?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmAssignData(null)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleAssignDoctor}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!registrationSuccessData} onOpenChange={open => {
        if (!open) {
          setRegistrationSuccessData(null);
          setIsRegisterOpen(false);
          setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
          setSelectedExistingPatientId('');
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-5 h-5" /> Registration Successful</DialogTitle>
            <DialogDescription>{registrationSuccessData?.name} has been successfully registered and added to the queue.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              setRegistrationSuccessData(null);
              setIsRegisterOpen(false);
              setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
              setSelectedExistingPatientId('');
            }}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVisitId} onOpenChange={open => !open && setDeleteVisitId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Visit</DialogTitle>
            <DialogDescription>
              Visit deletion is currently disabled to maintain financial and clinical audit trails. Please contact the administrator for corrections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="default" onClick={() => setDeleteVisitId(null)}>Understood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Patient Sheet */}
      <Sheet open={isRegisterOpen} onOpenChange={(open) => {
        setIsRegisterOpen(open);
        if (!open) {
          setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '', address: '' });
          setApptData({ date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Consultation', notes: '' });
          setIsNewPatient(false);
          setSelectedExistingPatientId('');
          setPatientSearch('');
          setRegType('walk-in');
        }
      }}>
        <SheetContent 
          side="right" 
          className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50 h-full"
          onInteractOutside={(e) => {
            if (isCameraOpen) e.preventDefault();
          }}
        >
          <SheetTitle className="sr-only">Register Patient</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Register Patient
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <DrawerSection title="Registration Type">
                <div className="flex gap-4">
                  <Button
                    variant={regType === 'walk-in' ? 'default' : 'outline'}
                    className={regType === 'walk-in' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                    onClick={() => setRegType('walk-in')}
                  >
                    Walk-in
                  </Button>
                  <Button
                    variant={regType === 'appointment' ? 'default' : 'outline'}
                    className={regType === 'appointment' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                    onClick={() => setRegType('appointment')}
                  >
                    Appointment
                  </Button>
                </div>
              </DrawerSection>

              <DrawerSection title="Patient Selection">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      variant={!isNewPatient ? 'default' : 'outline'}
                      className={!isNewPatient ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                      onClick={() => setIsNewPatient(false)}
                    >
                      Existing Patient
                    </Button>
                    <Button
                      variant={isNewPatient ? 'default' : 'outline'}
                      className={isNewPatient ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                      onClick={() => setIsNewPatient(true)}
                    >
                      New Patient
                    </Button>
                  </div>

                  {!isNewPatient ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 block">Search & Select Patient *</label>

                      {selectedExistingPatientId ? (
                        <div className="flex items-center justify-between p-3 border border-teal-200 bg-teal-50/50 rounded-lg shadow-sm">
                          <div>
                            <div className="font-medium text-teal-900">
                              {patients.find(p => p.id === selectedExistingPatientId)?.name}
                            </div>
                            <div className="text-sm text-teal-700">
                              {patients.find(p => p.id === selectedExistingPatientId)?.phone}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-teal-200 text-teal-700 hover:bg-teal-100"
                            onClick={() => {
                              setSelectedExistingPatientId('');
                              setPatientSearch('');
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              placeholder="Search by name or phone..."
                              className="pl-9 bg-white"
                              value={patientSearch}
                              onChange={e => setPatientSearch(e.target.value)}
                            />
                          </div>

                          <div className="border border-slate-200 rounded-md bg-white max-h-48 overflow-y-auto shadow-sm">
                            {patients
                              .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone.includes(patientSearch))
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedExistingPatientId(p.id);
                                    setPatientSearch('');
                                  }}
                                  className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 text-slate-700"
                                >
                                  <div className="font-medium">{p.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{p.phone}</div>
                                </div>
                              ))}
                            {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone.includes(patientSearch)).length === 0 && (
                              <div className="px-3 py-6 text-center text-sm text-slate-500">
                                No patients found.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4 border-t border-slate-100 pt-4">
                      {/* Photo Capture */}
                      <div className="mt-2 mb-4">
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Patient Photo</label>

                        {isCameraOpen ? (
                          <CameraCapture
                            onCapture={(imageSrc) => {
                              setRegData({ ...regData, photoUrl: imageSrc });
                              setIsCameraOpen(false);
                            }}
                            onCancel={() => setIsCameraOpen(false)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            {(regData as any).photoUrl ? (
                              <div className="flex flex-col items-center gap-3 mt-2 mb-2">
                                <img src={(regData as any).photoUrl} alt="Patient" className="w-24 h-24 rounded-md object-cover border-4 border-white shadow-sm" />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsCameraOpen(true)}
                                  className="text-teal-600 border-teal-200 hover:bg-teal-50"
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  Replace Photo
                                </Button>
                              </div>
                            ) : (
                              <div className="cursor-pointer flex flex-col items-center gap-2" onClick={() => setIsCameraOpen(true)}>
                                <div className="w-12 h-12 bg-slate-200 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-300 transition-colors shadow-inner">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-slate-600">Open Camera</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                        <Input placeholder="Enter patient name" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number <span className="text-red-500">*</span></label>
                        <Input placeholder="10-digit mobile number" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Age <span className="text-red-500">*</span></label>
                          <Input placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({ ...regData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} maxLength={3} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                          <Select value={regData.gender} onValueChange={(val) => setRegData({ ...regData, gender: val })}>
                            <SelectTrigger className="w-full bg-white border-slate-200">
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Address (Optional)</label>
                        <textarea
                          placeholder="Patient address"
                          className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          value={(regData as any).address || ''}
                          onChange={e => setRegData({ ...regData, address: e.target.value })}
                        />
                      </div>

                    </div>
                  )}

                  {regType === 'walk-in' && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Reason for Visit</label>
                      <Select value={regData.reasonForVisit} onValueChange={(val) => setRegData({ ...regData, reasonForVisit: val })}>
                        <SelectTrigger className="w-full bg-white border-slate-200">
                          <SelectValue placeholder="Select Reason for Visit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                          <SelectItem value="Toothache">Toothache</SelectItem>
                          <SelectItem value="Cleaning">Cleaning</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                          <SelectItem value="Consultation">Consultation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </DrawerSection>

              {regType === 'appointment' && (
                <DrawerSection title="Appointment Details">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Date <span className="text-red-500">*</span></label>
                        <Input type="date" min={new Date().toISOString().split('T')[0]} value={apptData.date} onChange={e => setApptData({ ...apptData, date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Time</label>
                        <Input type="time" value={apptData.time} onChange={e => setApptData({ ...apptData, time: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Reason for Visit</label>
                      <Select value={apptData.type} onValueChange={(val) => setApptData({ ...apptData, type: val })}>
                        <SelectTrigger className="w-full bg-white border-slate-200">
                          <SelectValue placeholder="Select Reason for Visit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Consultation">Consultation</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                          <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                          <SelectItem value="Surgery">Surgery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Notes (Optional)</label>
                      <Input placeholder="Enter any notes" value={apptData.notes} onChange={e => setApptData({ ...apptData, notes: e.target.value })} />
                    </div>
                  </div>
                </DrawerSection>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <Button variant="outline" onClick={() => {
              setIsRegisterOpen(false);
              setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
              setSelectedExistingPatientId('');
              setPatientSearch('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleRegister} className="bg-teal-600 hover:bg-teal-700">
              {regType === 'appointment' ? 'Create Appointment' : 'Register Patient'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit/View Patient Sheet */}
      <Sheet open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <SheetContent 
          side="right" 
          className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50 h-full"
          onInteractOutside={(e) => {
            if (isCameraOpen) e.preventDefault();
          }}
        >
          <SheetTitle className="sr-only">{editDrawerMode === 'view' ? 'View Patient Details' : 'Edit Patient Details'}</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {editDrawerMode === 'view' ? 'View Patient Details' : 'Edit Patient Details'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <DrawerSection >
                <div className="space-y-4">
                  <div className="flex justify-center mb-6">
                    {editDrawerMode === 'view' ? (
                      (regData as any).photoUrl ? (
                        <img src={(regData as any).photoUrl} alt="Patient" className="w-24 h-24 rounded-md object-cover border-4 border-white shadow-sm" />
                      ) : (
                        <div className="w-24 h-24 rounded-md bg-slate-200 flex items-center justify-center text-slate-400 border-4 border-white shadow-sm">
                          <Users className="w-10 h-10" />
                        </div>
                      )
                    ) : (
                      isCameraOpen ? (
                        <CameraCapture
                          onCapture={(photoUrl) => {
                            setRegData({ ...regData, photoUrl });
                            setIsCameraOpen(false);
                          }}
                          onCancel={() => setIsCameraOpen(false)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                          {(regData as any).photoUrl ? (
                            <div className="flex flex-col items-center gap-3">
                              <img src={(regData as any).photoUrl} alt="Patient" className="w-24 h-24 rounded-md object-cover border-4 border-white shadow-sm" />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCameraOpen(true)}
                                className="text-teal-600 border-teal-200 hover:bg-teal-50"
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                Replace Photo
                              </Button>
                            </div>
                          ) : (
                            <div className="cursor-pointer flex flex-col items-center gap-2" onClick={() => setIsCameraOpen(true)}>
                              <div className="w-16 h-16 bg-slate-200 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-300 transition-colors shadow-inner">
                                <Camera className="w-8 h-8" />
                              </div>
                              <span className="text-sm font-medium text-slate-600">Capture Photo</span>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
                    <Input disabled={editDrawerMode === 'view'} placeholder="e.g. John Doe" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number <span className="text-red-500">*</span></label>
                    <Input disabled={editDrawerMode === 'view'} placeholder="e.g. 9876543210" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Age <span className="text-red-500">*</span></label>
                      <Input disabled={editDrawerMode === 'view'} placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({ ...regData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} maxLength={3} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                      <Select disabled={editDrawerMode === 'view'} value={regData.gender} onValueChange={(val) => setRegData({ ...regData, gender: val })}>
                        <SelectTrigger className="w-full bg-white border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Address (Optional)</label>
                    <textarea
                      disabled={editDrawerMode === 'view'}
                      placeholder="Patient address"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      value={(regData as any).address || ''}
                      onChange={e => setRegData({ ...regData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Reason for Visit</label>
                    <Select disabled={editDrawerMode === 'view'} value={regData.reasonForVisit} onValueChange={(val) => setRegData({ ...regData, reasonForVisit: val })}>
                      <SelectTrigger className="w-full bg-white border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue placeholder="Select Reason for Visit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                        <SelectItem value="Toothache">Toothache</SelectItem>
                        <SelectItem value="Cleaning">Cleaning</SelectItem>
                        <SelectItem value="Follow-up">Follow-up</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                        <SelectItem value="Consultation">Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DrawerSection>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-3">
              <Button variant={editDrawerMode === 'view' ? 'default' : 'outline'} className="flex-1" onClick={() => setIsEditPatientOpen(false)}>{editDrawerMode === 'view' ? 'Close' : 'Cancel'}</Button>
              {editDrawerMode === 'edit' && (
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={async () => {
                    if (editingPatientId && updatePatient) {
                      await updatePatient(editingPatientId, {
                        name: regData.name,
                        phone: regData.phone,
                        age: parseInt(regData.age as string) || 0,
                        gender: regData.gender,
                        photoUrl: (regData as any).photoUrl,
                        address: (regData as any).address
                      });
                      if (editingVisitId && updateVisit) {
                        await updateVisit(editingVisitId, {
                          reasonForVisit: regData.reasonForVisit
                        });
                      }
                      toast.success('Patient details updated successfully!');
                      setIsEditPatientOpen(false);
                    }
                  }}
                  disabled={!regData.name || !regData.phone}
                >
                  Save Details
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Process Visit Drawer */}
      <Sheet open={!!processVisitId} onOpenChange={open => !open && setProcessVisitId(null)}>
        <SheetContent side="right" className="w-[480px] sm:w-[680px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">Checkout & Billing</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex flex-col justify-center shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Checkout & Billing</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Dynamic Step Calculations */}
            {(() => {
              const hasPrescription = prescriptions.some(p => p.visitId === processVisitId && p.status === 'Finalized');
              const hasCompletedDispensing = dispensings.some(d => d.visitId === processVisitId);
              const isDispensingStep = hasPrescription && !hasCompletedDispensing;

              const visitPayments = payments.filter(p => p.visitId === processVisitId);
              const totalPaid = visitPayments.reduce((sum, p) => sum + p.amount, 0);
              const calculatedDue = (activeProcessVisit?.consultationFee || 0) + (activeProcessVisit?.treatmentFee || 0) + (activeProcessVisit?.medicineCost || 0);
              const amountDue = calculatedDue > 0 ? calculatedDue : (activeProcessVisit?.amountDue || 0);
              const balance = amountDue - totalPaid;

              const hasCompletedPayment = activeProcessVisit?.status === 'COMPLETED' && balance <= 0;
              // Only a step if dispensing is done AND balance is still > 0
              const isPaymentStep = (!hasPrescription || hasCompletedDispensing) && balance > 0;
              const isWorkflowCompleted = activeProcessVisit?.status === 'COMPLETED';
              const activeConsultation = consultations.find(c => c.visitId === processVisitId);

              return (
                <>
                  <DrawerSection title="Visit Details">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3.5 shadow-xs">
                      {/* Key Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Reason for Visit */}
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 flex flex-col justify-center">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Visit</span>
                          <span className="text-slate-900 font-semibold text-sm truncate">
                            {activeConsultation?.reasonForVisit || activeProcessVisit?.reasonForVisit || 'Not specified'}
                          </span>
                        </div>

                        {/* Fees Breakdown */}
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 flex flex-col justify-center">
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Fees</span>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">
                              Consulting: <strong className="text-slate-900 font-semibold">₹{activeConsultation?.consultationFee || 0}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">
                              Treatment: <strong className="text-slate-900 font-semibold">₹{activeProcessVisit?.treatmentFee || 0}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Clinical Notes */}
                      {activeConsultation?.clinicalNotes && (
                        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1">Clinical Notes</span>
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                            {activeConsultation.clinicalNotes}
                          </p>
                        </div>
                      )}

                      {/* Treatment Plan Section (if existed) */}
                      {processTreatmentPlan && processTreatmentPlan.items && processTreatmentPlan.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-indigo-500" />
                              Treatment Plan ({processTreatmentPlan.items.length})
                            </span>
                          </div>
                          <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg divide-y divide-slate-100 overflow-hidden">
                            {processTreatmentPlan.items.map((item: any) => (
                              <div key={item.id} className="p-2.5 px-3 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-slate-800 truncate">
                                    {item.catalogItem?.name || item.name || 'Treatment Procedure'}
                                  </div>
                                  {item.catalogItem?.category && (
                                    <span className="text-[10px] text-slate-400">
                                      {item.catalogItem.category}
                                      {item.catalogItem.variant ? ` • ${item.catalogItem.variant}` : ''}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5">{item.notes}</p>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline"
                                  className={
                                    item.status === 'Completed' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium shrink-0'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium shrink-0'
                                  }
                                >
                                  {item.status || 'Planned'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DrawerSection>

                  <DrawerSection title="1. Medicines">
                    {isDispensingStep ? (
                      <div className="space-y-3">
                        {activeItems.length > 0 ? (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <table className="w-full text-left text-xs table-fixed">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-3">Medicine</th>
                                  <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap">Rx</th>
                                  <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap">Disp</th>
                                  <th className="py-2.5 px-2 text-center w-20 whitespace-nowrap">Qty</th>
                                  <th className="py-2.5 px-3 text-right w-20 whitespace-nowrap">Cost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {activeItems.map((item, index) => {
                                  const hasStockShortage = item.isDispensed && item.availableStock < item.prescribedQty;
                                  const exceedsStock = item.isDispensed && item.dispensedQty > item.availableStock;
                                  const exceedsPrescribed = item.isDispensed && item.dispensedQty > item.prescribedQty;
                                  const itemCost = item.isDispensed ? (item.dispensedQty || 0) * (item.unitPrice || 0) : 0;

                                  return (
                                    <tr key={item.id} className={item.isDispensed ? 'bg-white' : 'bg-slate-50/70 text-slate-400'}>
                                      <td className="py-2.5 px-3 align-middle truncate">
                                        <div className={`font-medium truncate ${item.isDispensed ? 'text-slate-900 font-semibold' : 'text-slate-500'}`} title={item.name}>
                                          {item.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                          {item.strength || 'Unit'} • ₹{item.unitPrice || 0}/unit
                                        </div>
                                        {hasStockShortage && (
                                          <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5 w-fit">
                                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                            <span>Stock: {item.availableStock}/{item.prescribedQty}</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap font-medium text-slate-700">
                                        {item.prescribedQty}
                                      </td>
                                      <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={item.isDispensed}
                                            onCheckedChange={(checked) => {
                                              const newItems = [...activeItems];
                                              const isChecked = !!checked;
                                              newItems[index] = {
                                                ...newItems[index],
                                                isDispensed: isChecked,
                                                dispensedQty: isChecked
                                                  ? (item.dispensedQty > 0 ? item.dispensedQty : Math.min(item.prescribedQty, item.availableStock > 0 ? item.prescribedQty : 0))
                                                  : 0
                                              };
                                              setActiveItems(newItems);
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                                        {item.isDispensed ? (
                                          <div className="flex justify-center">
                                            <Input
                                              type="number"
                                              min={1}
                                              max={item.prescribedQty}
                                              value={item.dispensedQty === 0 ? '' : item.dispensedQty}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                const newItems = [...activeItems];
                                                newItems[index] = {
                                                  ...newItems[index],
                                                  dispensedQty: isNaN(val) ? 0 : val
                                                };
                                                setActiveItems(newItems);
                                              }}
                                              className={`h-7 w-14 text-center text-xs font-semibold px-1 py-0 ${
                                                exceedsStock || exceedsPrescribed || item.dispensedQty < 1
                                                  ? 'border-rose-500 focus-visible:ring-rose-500 text-rose-600'
                                                  : 'border-slate-200'
                                              }`}
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 font-mono text-xs">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap font-semibold text-slate-900">
                                        ₹{itemCost}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Medicine Total Summary Row */}
                            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex justify-between items-center text-xs">
                              <span className="font-medium text-slate-600">Medicine Total</span>
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{activeItems.reduce((sum, item) => sum + (item.isDispensed ? (item.dispensedQty || 0) * (item.unitPrice || 0) : 0), 0)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 p-3 text-center bg-white border border-slate-200 rounded-lg">No medicines prescribed.</p>
                        )}

                        {activeItems.some(item => item.isDispensed && (item.dispensedQty < 1 || item.dispensedQty > item.prescribedQty || item.dispensedQty > item.availableStock)) && (
                          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Please resolve quantity or stock errors before completing dispensing.</span>
                          </div>
                        )}

                        <Button 
                          onClick={handleCompleteDispensing} 
                          disabled={activeItems.some(item => item.isDispensed && (item.dispensedQty < 1 || item.dispensedQty > item.prescribedQty || item.dispensedQty > item.availableStock))}
                          className="w-full bg-teal-600 hover:bg-teal-700 h-9 font-medium text-sm"
                        >
                          Complete Dispensing
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800">
                        <span className="text-sm font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Medicines Processed</span>
                      </div>
                    )}
                  </DrawerSection>

                  <DrawerSection title="2. Payment">
                    {visitPayments.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payments</h4>
                        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden shadow-xs">
                          {visitPayments.map((p, idx) => (
                            <div key={p.id || idx} className="p-3 flex justify-between items-start">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 text-sm">{p.method}</span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(p.createdAt || p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {p.notes && (
                                  <p className="text-xs text-slate-600 italic">{p.notes}</p>
                                )}
                              </div>
                              <span className="font-bold text-slate-900 text-sm">₹{p.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isPaymentStep ? (
                      <div className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-slate-600">
                            <span>Consultation Fee</span>
                            <span className="font-medium text-slate-800">₹{activeProcessVisit?.consultationFee || 0}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Treatment Fee</span>
                            <span className="font-medium text-slate-800">₹{activeProcessVisit?.treatmentFee || 0}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Medicine Cost</span>
                            <span className="font-medium text-slate-800">₹{activeProcessVisit?.medicineCost || 0}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-semibold text-slate-900 text-sm">
                            <span>Total Due</span>
                            <span>₹{amountDue}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-600 text-sm">
                            <span>Total Paid</span>
                            <span>₹{totalPaid}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-base">
                            <span>Balance</span>
                            <span>₹{balance}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <h4 className="text-sm font-semibold text-slate-900">Add Payment</h4>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Payment Amount (₹)</label>
                            <Input
                              type="number"
                              min="1"
                              max={balance}
                              placeholder={`Max ₹${balance}`}
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                            />
                          </div>

                          <PaymentMethodSelector value={activeMethod} onChange={setActiveMethod} />

                          {/* Dynamic Partial Payment Reason */}
                          {paymentAmount !== '' && Number(paymentAmount) > 0 && Number(paymentAmount) < balance && (
                            <div className="space-y-3 p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                              <label className="text-xs font-semibold text-amber-900 block">
                                Reason for Partial Payment <span className="text-red-500">*</span>
                              </label>
                              <Select value={paymentReason} onValueChange={setPaymentReason}>
                                <SelectTrigger className="bg-white border-amber-200 text-xs h-9">
                                  <SelectValue placeholder="Select reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Patient requested partial payment">Patient requested partial payment</SelectItem>
                                  <SelectItem value="Will pay remaining amount later">Will pay remaining amount later</SelectItem>
                                  <SelectItem value="Financial difficulty">Financial difficulty</SelectItem>
                                  <SelectItem value="Insurance / reimbursement pending">Insurance / reimbursement pending</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>

                              {paymentReason === 'Other' && (
                                <Input
                                  placeholder="Specify reason..."
                                  value={paymentReasonOther}
                                  onChange={(e) => setPaymentReasonOther(e.target.value)}
                                  className="bg-white border-amber-200 text-xs h-9"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={handleMarkAsPaid}
                          disabled={
                            !activeMethod ||
                            paymentAmount === '' ||
                            Number(paymentAmount) <= 0 ||
                            Number(paymentAmount) > balance ||
                            (Number(paymentAmount) < balance && !paymentReason) ||
                            (Number(paymentAmount) < balance && paymentReason === 'Other' && !paymentReasonOther.trim())
                          }
                          className="w-full bg-teal-600 hover:bg-teal-700 h-10 font-medium text-sm"
                        >
                          Add Payment
                        </Button>
                      </div>
                    ) : hasCompletedPayment ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800">
                        <span className="text-sm font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Payment Completed</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm">
                        Complete dispensing first to unlock payment.
                      </div>
                    )}
                  </DrawerSection>

                  {isWorkflowCompleted && (
                    <DrawerSection title="3. Print">
                      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-4">
                        <div className="flex items-center gap-3 text-emerald-600 mb-4">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">Workflow Completed</span>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" className="w-full" onClick={() => handlePrintDocument('receipt')}>
                            <Receipt className="w-4 h-4 mr-2" />
                            Print Receipt
                          </Button>
                        </div>
                      </div>
                    </DrawerSection>
                  )}
                </>
              );
            })()}

          </div>

          <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <Button onClick={() => setProcessVisitId(null)} className="w-full">
              {activeProcessQueue?.status === 'Completed' || activeProcessVisit?.status === 'COMPLETED' ? 'Done' : 'Close'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Completed View Drawer */}
      <Sheet open={!!viewVisitId} onOpenChange={open => !open && setViewVisitId(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[600px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">View Visit</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex flex-col justify-center shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Visit Details</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {viewVisitId && (
              <HistoricalVisitDetails
                visitId={viewVisitId}
                onViewHistory={() => {
                  const visit = visits.find(v => v.id === viewVisitId);
                  if (visit) setHistoryPatientId(visit.patientId);
                }}
              />
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4 shrink-0">
            <Button variant="outline" onClick={() => setViewVisitId(null)} className="w-full">Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Patient Details Dialog */}
      <Dialog open={!!historyPatientId} onOpenChange={open => !open && setHistoryPatientId(null)}>
        <DialogContent className="sm:max-w-[700px] h-[70vh] p-0 flex flex-col overflow-hidden bg-slate-50">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {historyPatientId && (() => {
              const patient = patients.find(p => p.id === historyPatientId);
              if (!patient) return null;

              return (
                <div className="space-y-6">
                  <PatientClinicalSummary
                    patientId={patient.id}
                    name={patient.name}
                    phone={patient.phone}
                    age={patient.age}
                    status={patient.status}
                    hideDetails={false}
                    photoUrl={patient.photoUrl}
                  />
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
