import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Receipt, CheckCircle, Search, Calendar, Package, FileText, CheckCircle2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'react-hot-toast';
import type { QueueEntry, Visit } from '../types/domain';

import { DispensingMedicineItem } from '../components/dispensing/dispensing-components';
import { PaymentMethodSelector } from '../components/payment/payment-components';
import type { PaymentMethod } from '../components/payment/payment-components';
import { HistoricalVisitDetails } from '../components/history/HistoricalVisitDetails';
import { PatientClinicalSummary, PatientVisitHistory } from '../components/consultation/consultation-components';
import { API_BASE_URL } from '../lib/api';

export function ReceptionDeskPage() {
  const { queue, visits, patients, staff, startVisit, assignDoctor, appointments, addAppointment, confirmAppointmentArrival, addPatient, prescriptions, dispensings, completeDispensing, recordPayment, medicines, payments } = useClinicContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  
  // Registration Drawer
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [regType, setRegType] = useState<'walk-in' | 'appointment'>('walk-in');
  const [regData, setRegData] = useState({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '' });
  const [apptData, setApptData] = useState({ date: new Date().toISOString().split('T')[0], time: '10:00', type: 'Consultation', notes: '' });

  const [isNewPatient, setIsNewPatient] = useState(false);
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  
  // Assignment Modal
  const [assignQueueId, setAssignQueueId] = useState<string | null>(null);
  
  // Process Visit Drawer
  const [processVisitId, setProcessVisitId] = useState<string | null>(null);

  // Completed View Drawer
  const [viewVisitId, setViewVisitId] = useState<string | null>(null);

  // Patient History Dialog
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);

  // Dispensing State
  const [activeItems, setActiveItems] = useState<any[]>([]);

  // Payment State
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(null);

  // Derive Doctors and their Availability
  const doctors = useMemo(() => {
    return staff.filter(s => ['Head Doctor', 'Duty Doctor'].includes(s.role) && s.status === 'Active');
  }, [staff]);

  const doctorAvailability = useMemo(() => {
    const availability: Record<string, 'Available' | 'With Patient'> = {};
    doctors.forEach(doc => {
      // A doctor is with a patient if they have ANY queue entry In Progress
      const hasActive = queue.some(q => q.assignedDoctorId === doc.id && q.status === 'In Progress');
      availability[doc.id] = hasActive ? 'With Patient' : 'Available';
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
      else if (q.status === 'Completed' && v?.status !== 'COMPLETED') stage = 'Ready at Reception';
      else if (q.status === 'Dispensing' || q.status === 'Payment' || q.status === 'Ready at Reception') stage = 'Ready at Reception';
      else stage = q.status; // fallback to raw status instead of incorrectly showing Waiting

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
        rawStatus: q.status, // keep raw for action logic
        arrivalTime: q.arrivalTime,
        rawVisit: v,
        rawQueue: q,
      };
    });

    // Also add completed visits for today that are no longer in active queue
    const activeVisitIds = new Set(queue.map(q => q.visitId));
    const completedVisits = visits.filter(v => v.status === 'COMPLETED' && !activeVisitIds.has(v.id));
    
    completedVisits.forEach(v => {
      const p = patients.find(p => p.id === v.patientId);
      const d = doctors.find(doc => doc.id === v.doctorId);
      const isAppointment = v.appointmentId != null;

      data.push({
        id: v.id,
        visitId: v.id,
        patientId: p?.id,
        patientName: p?.name || 'Unknown',
        patientPhone: p?.phone || '',
        visitType: isAppointment ? 'Appointment' : 'Walk-in',
        token: '-',
        doctor: d?.name || '-',
        stage: 'Completed',
        rawStatus: 'Completed',
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
      header: 'Token No.',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
          #{row.original.token}
        </span>
      )
    },
    {
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900">{row.original.patientName}</div>
          <div className="text-xs text-slate-500">{row.original.patientPhone}</div>
        </div>
      )
    },
    {
      accessorKey: 'visitType',
      header: 'Visit Type',
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.visitType === 'Appointment' ? 'text-indigo-600' : 'text-slate-600'}>
          {row.original.visitType}
        </Badge>
      )
    },
    {
      accessorKey: 'doctor',
      header: 'Doctor',
      cell: ({ row }) => <span className="text-slate-600">{row.original.doctor === '-' ? 'Unassigned' : row.original.doctor}</span>
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }) => {
        const s = row.original.stage;
        if (s === 'Waiting') return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">🟡 Waiting</Badge>;
        if (s === 'With Doctor') return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">🔵 With Doctor</Badge>;
        if (s === 'Ready at Reception') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">🟢 Ready at Reception</Badge>;
        if (s === 'Completed') return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">✅ Completed</Badge>;
        return <Badge variant="outline">{s}</Badge>;
      }
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => {
        const stage = row.original.stage;
        if (stage === 'Waiting') {
          return <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAssignQueueId(row.original.id); }}>Send to Doc</Button>;
        }
        if (stage === 'Ready at Reception') {
          return <Button size="sm" variant="default" className="bg-teal-600 hover:bg-teal-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenProcess(row.original); }}>Process</Button>;
        }
        if (stage === 'Completed') {
          return <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewVisitId(row.original.visitId); }}>View</Button>;
        }
        return <span className="text-sm text-slate-400">—</span>;
      }
    }
  ];

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
          photoUrl: ''
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
      if (regType === 'walk-in') {
        await startVisit(finalPatientId, undefined, false, regData.reasonForVisit || 'General Consultation');
        toast.success(isNewPatient ? "Patient registered and added to Waiting list" : "Walk-in added to Waiting list");
        setIsRegisterOpen(false);
        setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '' });
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
          toast.success(isNewPatient ? "Patient registered and checked in for today's appointment." : "Checked in for today's appointment.");
        } else {
          toast.success(isNewPatient ? "Patient registered and appointment created." : "Appointment created successfully.");
        }
        
        setIsRegisterOpen(false);
        setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '' });
        setSelectedExistingPatientId('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create visit/appointment");
    }
  };

  const handleAssignDoctor = async (doctorId: string) => {
    if (!assignQueueId) return;
    const res = await assignDoctor(assignQueueId, doctorId);
    if (res.success) {
      toast.success("Patient assigned to Doctor");
      setAssignQueueId(null);
    } else {
      toast.error(res.error || "Failed to assign doctor");
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
    const result = await recordPayment(processVisitId, activeMethod as 'Cash' | 'GPay');
    if (result.success) {
      toast.success('Payment completed successfully');
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
      <div className="h-16 shrink-0 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reception Desk</h1>
          <p className="text-sm text-slate-500">Register patients, manage today's visits, and complete reception tasks.</p>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} className="bg-teal-600 hover:bg-teal-700 shadow-sm text-white">
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
              {doctors.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-medium text-slate-900">{doc.name}</h3>
                    <p className="text-xs text-slate-500">{doc.role}</p>
                  </div>
                  <Badge variant={doctorAvailability[doc.id] === 'Available' ? 'outline' : 'secondary'} 
                    className={doctorAvailability[doc.id] === 'Available' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}>
                    {doctorAvailability[doc.id] === 'Available' ? '🟢 Available' : '🔴 With Patient'}
                  </Badge>
                </div>
              ))}
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
              onRowClick={(row) => {
                const patient = patients.find(p => p.id === row.patientId);
                if (patient) {
                  setRegData({
                    name: patient.name,
                    phone: patient.phone,
                    age: patient.age.toString(),
                    gender: patient.gender,
                    address: '',
                  });
                  setEditingPatientId(patient.id);
                  setIsEditPatientOpen(true);
                }
              }}
            />
          </section>

        </div>
      </div>

      {/* Doctor Assignment Modal */}
      <Dialog open={!!assignQueueId} onOpenChange={open => !open && setAssignQueueId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send to Doctor</DialogTitle>
            <DialogDescription>Select an available doctor for this patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {doctors.map(doc => {
              const isAvail = doctorAvailability[doc.id] === 'Available';
              return (
                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border ${isAvail ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                  <div>
                    <h4 className="font-medium text-slate-900">{doc.name}</h4>
                    <span className="text-xs text-slate-500">{doc.role}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant={isAvail ? "default" : "secondary"}
                    disabled={!isAvail}
                    onClick={() => handleAssignDoctor(doc.id)}
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

      {/* Register Patient Sheet */}
      <Sheet open={isRegisterOpen} onOpenChange={(open) => {
        setIsRegisterOpen(open);
        if (!open) {
          setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '' });
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
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
                        <Input placeholder="Enter patient name" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number *</label>
                        <Input placeholder="10-digit mobile number" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
                          <Input placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({...regData, age: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={regData.gender} 
                            onChange={e => setRegData({...regData, gender: e.target.value})}
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
                      <Input placeholder="e.g. Tooth ache, Cleaning" value={regData.reasonForVisit} onChange={e => setRegData({...regData, reasonForVisit: e.target.value})} />
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
                        <Input type="date" value={apptData.date} onChange={e => setApptData({...apptData, date: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Time</label>
                        <Input type="time" value={apptData.time} onChange={e => setApptData({...apptData, time: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        value={apptData.type} 
                        onChange={e => setApptData({...apptData, type: e.target.value})}
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
                      <Input placeholder="Enter any notes" value={apptData.notes} onChange={e => setApptData({...apptData, notes: e.target.value})} />
                    </div>
                  </div>
                </DrawerSection>
              )}
            </div>
          </div>
          
          <div className="border-t border-slate-200 bg-white p-4 shrink-0 flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <Button variant="outline" onClick={() => {
              setIsRegisterOpen(false);
              setRegData({ name: '', phone: '', age: '', gender: 'Male', reasonForVisit: '' });
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

      {/* Edit Patient Sheet */}
      <Sheet open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">Edit Patient Details</SheetTitle>
          <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Edit Patient Details
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <DrawerSection title="Basic Details">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name *</label>
                    <Input placeholder="e.g. John Doe" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Phone Number *</label>
                    <Input placeholder="e.g. 9876543210" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Age</label>
                      <Input placeholder="e.g. 30" value={regData.age} onChange={e => setRegData({...regData, age: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Gender</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        value={regData.gender} 
                        onChange={e => setRegData({...regData, gender: e.target.value})}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Address</label>
                    <Input placeholder="City, Area" value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} />
                  </div>
                </div>
              </DrawerSection>
            </div>
          </div>
          
          <div className="p-6 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditPatientOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-teal-600 hover:bg-teal-700" 
                onClick={() => {
                  toast.success('Patient details updated temporarily in demo!');
                  setIsEditPatientOpen(false);
                }}
                disabled={!regData.name || !regData.phone}
              >
                Save Details
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Process Visit Drawer */}
      <Sheet open={!!processVisitId} onOpenChange={open => !open && setProcessVisitId(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[600px] p-0 flex flex-col bg-slate-50 h-full">
          <SheetTitle className="sr-only">Process Visit</SheetTitle>
          <div className="h-20 px-6 border-b border-slate-200 bg-white flex flex-col justify-center shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Process Visit</h2>
            <div className="text-sm text-slate-500 flex gap-2">
              <span>{activeProcessPatient?.name}</span>
              <span>•</span>
              <span>{activeProcessDoctor?.name}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Dynamic Step Calculations */}
              {(() => {
                const hasPrescription = prescriptions.some(p => p.visitId === processVisitId && p.status === 'Finalized');
                const hasCompletedDispensing = dispensings.some(d => d.visitId === processVisitId);
                const isDispensingStep = hasPrescription && !hasCompletedDispensing;
                
                const hasCompletedPayment = activeProcessVisit?.status === 'COMPLETED' || payments.some((p: any) => p.visitId === processVisitId);
                const isPaymentStep = (!hasPrescription || hasCompletedDispensing) && !hasCompletedPayment;
                const isWorkflowCompleted = hasCompletedPayment;

                return (
                  <>
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
                      <div className="pt-2 border-t border-slate-100 flex justify-between font-semibold text-slate-900 text-lg">
                        <span>Total Due</span>
                        <span>₹{activeProcessVisit?.amountDue || 0}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-medium text-slate-900 mb-3">Select Payment Method</h4>
                      <PaymentMethodSelector value={activeMethod} onChange={setActiveMethod} />
                    </div>

                    <Button onClick={handleMarkAsPaid} className="w-full bg-teal-600 hover:bg-teal-700">
                          Complete Payment
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
                      <Button variant="outline" className="flex-1" onClick={() => handlePrintDocument('prescription')}>
                        <FileText className="w-4 h-4 mr-2" />
                        Print Prescription
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => handlePrintDocument('receipt')}>
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

      {/* Patient Full History Dialog */}
      <Dialog open={!!historyPatientId} onOpenChange={open => !open && setHistoryPatientId(null)}>
        <DialogContent className="sm:max-w-[900px] h-[85vh] p-0 flex flex-col overflow-hidden bg-slate-50">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
            <DialogTitle>Full Patient Clinical History</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            {historyPatientId && (() => {
              const patient = patients.find(p => p.id === historyPatientId);
              if (!patient) return null;
              
              const patientVisits = visits
                .filter(v => v.patientId === historyPatientId)
                .map(v => ({
                  id: v.id,
                  date: new Date(parseInt(v.id.substring(0, 8), 16) * 1000).toLocaleDateString(), // approximate from mongo ObjectId if date missing
                  title: v.reasonForVisit || 'General Visit',
                  status: v.status
                }));
                
              return (
                <div className="space-y-6">
                  <PatientClinicalSummary 
                    patientId={patient.id} 
                    name={patient.name}
                    phone={patient.phone}
                    age={patient.age}
                    status={patientVisits.some(v => v.status !== 'COMPLETED') ? 'In Progress' : 'Completed'}
                  />
                  <PatientVisitHistory 
                    visits={patientVisits} 
                    onView={(id) => {
                      setHistoryPatientId(null);
                      setViewVisitId(id);
                    }} 
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
