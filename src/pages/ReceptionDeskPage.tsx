import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Clock, Receipt, CheckCircle, Search, Calendar, Package, FileText, CheckCircle2, Pencil, Eye, Trash2, Send, CreditCard, Activity, XCircle, Camera, X } from 'lucide-react';
import { useClinicContext } from '../context/ClinicContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  const { queue, visits, patients, staff, startVisit, assignDoctor, appointments, addAppointment, confirmAppointmentArrival, addPatient, updatePatient, prescriptions, dispensings, completeDispensing, recordPayment, medicines, payments, cancelVisit, consultations } = useClinicContext();

  const navigate = useNavigate();

  const [search, setSearch] = useState('');

  // Registration Drawer
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editDrawerMode, setEditDrawerMode] = useState<'edit' | 'view'>('edit');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  const [regType, setRegType] = useState<'walk-in' | 'appointment'>('walk-in');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [regData, setRegData] = useState({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
  const [apptData, setApptData] = useState({ date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Consultation', notes: '' });

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Payment States
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentReason, setPaymentReason] = useState<string>('');
  const [paymentReasonOther, setPaymentReasonOther] = useState<string>('');
  const [isFinalPayment, setIsFinalPayment] = useState<boolean>(false);

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
                  setRegData({
                    name: patient.name,
                    phone: patient.phone,
                    age: patient.age.toString(),
                    gender: patient.gender,
                    reasonForVisit: row.original.reasonForVisit || 'Routine Checkup',
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
                  setRegData({
                    name: patient.name,
                    phone: patient.phone,
                    age: patient.age.toString(),
                    gender: patient.gender,
                    reasonForVisit: row.original.reasonForVisit || 'Routine Checkup',
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

      const existing = patients.find(p => p.phone === regData.phone);
      if (existing) {
        toast.error("A patient with this phone number already exists.");
        return;
      }

      try {
        const newPatient = await addPatient({
          name: regData.name,
          phone: regData.phone,
          age: parseInt(regData.age) || 30,
          gender: regData.gender as any,
          status: 'Active',
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
        setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
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
        setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
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

        return {
          id: `i${idx}`,
          medicineId: ri.medicineId,
          name: med?.name || 'Unknown',
          strength: med?.unit || '',
          categoryId: med?.categoryId || 'cat1',
          prescribedQty: ri.quantity,
          dispensedQty: dItem ? dItem.dispensedQuantity : ri.quantity,
          availableStock: med?.currentStock || 0,
          unitPrice: med?.unitPrice || 0
        };
      });
      setActiveItems(items);
    } else {
      setActiveItems([]);
    }

    setActiveMethod(null);
    setProcessVisitId(row.visitId);
  };

  const handleCompleteDispensing = async () => {
    if (!processVisitId) return;
    const rx = prescriptions.find(r => r.visitId === processVisitId && r.status === 'Finalized');
    if (!rx) return;

    const mappedItems = activeItems.map(ai => ({
      medicineId: ai.medicineId,
      prescribedQuantity: ai.prescribedQty,
      dispensedQuantity: ai.dispensedQty
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
    const amountDue = activeProcessVisit?.amountDue || 0;
    const balance = amountDue - totalPaid;

    if (amt > balance) {
      toast.error(`Payment amount cannot exceed remaining balance (₹${balance})`);
      return;
    }

    const isPartial = amt < balance;
    let finalNotes: string | undefined;

    if (isPartial && isFinalPayment) {
      if (!paymentReason) {
        toast.error('A reason is required when leaving a balance.');
        return;
      }
      if (paymentReason === 'Other') {
        if (!paymentReasonOther.trim()) {
          toast.error('Please specify the reason.');
          return;
        }
        finalNotes = paymentReasonOther.trim();
      } else {
        finalNotes = paymentReason;
      }
    }

    // recordPayment expects 4 arguments initially. Wait, the `recordPayment` is from context. We need to update context too!
    // But for now let's check what recordPayment takes. I will view ClinicContext first if needed.
    // Instead of modifying context, I can just use API directly, or update context next.
    const result = await recordPayment(processVisitId, amt, activeMethod as 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card', finalNotes, isFinalPayment);
    if (result.success) {
      toast.success('Payment completed successfully');
      setPaymentAmount(''); // Reset for next partial payment if needed
      setPaymentReason('');
      setPaymentReasonOther('');
      setActiveMethod(null);
      setIsFinalPayment(false);
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
            setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
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
          setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '', photoUrl: '' });
          setApptData({ date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Consultation', notes: '' });
          setIsNewPatient(false);
          setSelectedExistingPatientId('');
          setPatientSearch('');
          setRegType('walk-in');
        }
      }}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50 h-full">
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
                              setRegData({...regData, photoUrl: imageSrc});
                              setIsCameraOpen(false);
                            }}
                            onCancel={() => setIsCameraOpen(false)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                            {(regData as any).photoUrl ? (
                              <div className="relative flex flex-col items-center">
                                <img src={(regData as any).photoUrl} alt="Patient" className="w-20 h-20 rounded-md object-cover border-4 border-white shadow-sm" />
                                <button 
                                  onClick={() => setRegData({...regData, photoUrl: ''})}
                                  className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-1 shadow-sm hover:bg-rose-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
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
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
                        <Input placeholder="Enter patient name" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number *</label>
                        <Input placeholder="10-digit mobile number" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
                          <Input placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({ ...regData, age: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                          <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={regData.gender}
                            onChange={e => setRegData({ ...regData, gender: e.target.value })}
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
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
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Date</label>
                        <Input type="date" value={apptData.date} onChange={e => setApptData({ ...apptData, date: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Time</label>
                        <Input type="time" value={apptData.time} onChange={e => setApptData({ ...apptData, time: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
                      <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        value={apptData.type}
                        onChange={e => setApptData({ ...apptData, type: e.target.value })}
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Routine Checkup">Routine Checkup</option>
                        <option value="Emergency">Emergency</option>
                        <option value="Surgery">Surgery</option>
                      </select>
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
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">{editDrawerMode === 'view' ? 'View Patient Details' : 'Edit Patient Details'}</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {editDrawerMode === 'view' ? 'View Patient Details' : 'Edit Patient Details'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <DrawerSection title="Basic Details">
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
                            setRegData({...regData, photoUrl});
                            setIsCameraOpen(false);
                          }}
                          onCancel={() => setIsCameraOpen(false)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                          {(regData as any).photoUrl ? (
                            <div className="relative flex flex-col items-center">
                              <img src={(regData as any).photoUrl} alt="Patient" className="w-24 h-24 rounded-md object-cover border-4 border-white shadow-sm" />
                              <button 
                                type="button"
                                onClick={() => setRegData({...regData, photoUrl: undefined})}
                                className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-1 shadow-sm hover:bg-rose-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
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
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
                    <Input disabled={editDrawerMode === 'view'} placeholder="e.g. John Doe" value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number *</label>
                    <Input disabled={editDrawerMode === 'view'} placeholder="e.g. 9876543210" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
                      <Input disabled={editDrawerMode === 'view'} placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({ ...regData, age: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                      <select
                        disabled={editDrawerMode === 'view'}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={regData.gender}
                        onChange={e => setRegData({ ...regData, gender: e.target.value })}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
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
                        photoUrl: (regData as any).photoUrl
                      });
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
        <SheetContent side="right" className="w-[400px] sm:w-[600px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">Checkout & Billing</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex flex-col justify-center shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Checkout & Billing</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Dynamic Step Calculations */}
            {(() => {
              const hasPrescription = prescriptions.some(p => p.visitId === processVisitId && p.status === 'Finalized');
              const hasCompletedDispensing = dispensings.some(d => d.visitId === processVisitId);
              const isDispensingStep = hasPrescription && !hasCompletedDispensing;

              const visitPayments = payments.filter(p => p.visitId === processVisitId);
              const totalPaid = visitPayments.reduce((sum, p) => sum + p.amount, 0);
              const amountDue = activeProcessVisit?.amountDue || 0;
              const balance = amountDue - totalPaid;

              const hasCompletedPayment = activeProcessVisit?.status === 'COMPLETED' && balance <= 0;
              // Only a step if dispensing is done AND balance is still > 0
              const isPaymentStep = (!hasPrescription || hasCompletedDispensing) && balance > 0;
              const isWorkflowCompleted = activeProcessVisit?.status === 'COMPLETED';
              const activeConsultation = consultations.find(c => c.visitId === processVisitId);

              return (
                <>
                  <DrawerSection title="Visit Details">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 text-sm mb-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Reason for Visit</span>
                          <span className="text-slate-900 font-medium">{activeConsultation?.reasonForVisit || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Fees</span>
                          <span className="text-slate-900 font-medium leading-relaxed">
                            Consulting: ₹{activeConsultation?.consultationFee || 0} <br/>
                            Treatment: ₹{activeProcessVisit?.treatmentFee || 0}
                          </span>
                        </div>
                      </div>
                      
                      {activeConsultation?.clinicalNotes && (
                        <div>
                          <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Clinical Notes</span>
                          <span className="text-slate-700 whitespace-pre-wrap">{activeConsultation.clinicalNotes}</span>
                        </div>
                      )}
                      
                      {(() => {
                        const activePrescription = prescriptions.find(p => p.visitId === processVisitId);
                        if (!activePrescription || activePrescription.items.length === 0) return null;
                        return (
                          <div className="pt-3 border-t border-slate-100">
                            <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-2">Prescribed Medicines</span>
                            <ul className="list-disc pl-5 space-y-1">
                              {activePrescription.items.map(item => {
                                const med = medicines.find(m => m.id === item.medicineId);
                                return (
                                  <li key={item.id} className="text-slate-700">
                                    <span className="font-medium">{med?.name || 'Unknown Medicine'}</span> — {item.quantity} units {item.dosage ? `(${item.dosage})` : ''}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  </DrawerSection>

                  <DrawerSection title="1. Medicines">
                    {isDispensingStep ? (
                      <div className="space-y-4">
                        {activeItems.length > 0 ? (
                          activeItems.map((item, index) => (
                            <DispensingMedicineItem
                              key={item.id}
                              item={item}
                              onChange={(id, qty) => {
                                const newItems = [...activeItems];
                                newItems[index].dispensedQty = qty;
                                setActiveItems(newItems);
                              }}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 p-4 text-center bg-white border border-slate-200 rounded-lg">No medicines prescribed.</p>
                        )}
                        <Button onClick={handleCompleteDispensing} className="w-full bg-teal-600 hover:bg-teal-700">
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
                        <h4 className="text-sm font-semibold text-slate-900">Payment History</h4>
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                          {visitPayments.map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0">
                              <div className="text-sm">
                                <span className="font-medium text-slate-800">{p.method}</span>
                                <span className="text-slate-500 text-xs ml-2">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <span className="font-semibold text-slate-900">₹{p.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isPaymentStep ? (
                      <div className="space-y-6 bg-white p-5 rounded-xl border border-slate-200">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Consultation Fee</span>
                            <span>₹{activeProcessVisit?.consultationFee || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Treatment Fee</span>
                            <span>₹{activeProcessVisit?.treatmentFee || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Medicine Cost</span>
                            <span>₹{activeProcessVisit?.medicineCost || 0}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-semibold text-slate-900 text-base">
                            <span>Total Due</span>
                            <span>₹{amountDue}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-600 text-base">
                            <span>Total Paid</span>
                            <span>₹{totalPaid}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-lg">
                            <span>Balance</span>
                            <span>₹{balance}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-sm font-medium text-slate-900 mb-3">Add Payment</h4>
                          <div className="mb-4">
                            <label className="text-sm text-slate-600 block mb-1">Payment Amount (₹)</label>
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
                          
                          {paymentAmount && paymentAmount > 0 && paymentAmount < balance && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                                  checked={isFinalPayment}
                                  onChange={(e) => setIsFinalPayment(e.target.checked)}
                                />
                                Patient is leaving a balance (Final Payment)
                              </label>
                            </div>
                          )}
                          
                          {paymentAmount && paymentAmount > 0 && paymentAmount < balance && isFinalPayment && (
                            <div className="mt-3 space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <label className="text-sm font-medium text-amber-900 block">Reason for Partial Payment <span className="text-red-500">*</span></label>
                              <Select value={paymentReason} onValueChange={setPaymentReason}>
                                <SelectTrigger className="bg-white border-amber-200">
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
                                  className="mt-2 bg-white border-amber-200"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        <Button 
                          onClick={handleMarkAsPaid} 
                          disabled={
                            !activeMethod || 
                            !paymentAmount || 
                            paymentAmount <= 0 || 
                            paymentAmount > balance ||
                            (paymentAmount < balance && isFinalPayment && !paymentReason) ||
                            (paymentAmount < balance && isFinalPayment && paymentReason === 'Other' && !paymentReasonOther.trim())
                          } 
                          className="w-full bg-teal-600 hover:bg-teal-700 mt-4"
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
