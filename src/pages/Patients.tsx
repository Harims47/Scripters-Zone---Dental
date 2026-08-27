import { useState, useMemo } from 'react';
import { Play, UserPlus, AlertCircle, Calendar } from 'lucide-react';
import { DataTable } from '../components/data-table/data-table';
import { DataTableToolbar } from '../components/data-table/data-table-toolbar';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet';
import { PatientIdentity } from '../components/ui/patient-identity';
import { 
  PatientProfileHeader, 
  DrawerFooterActions,
  DrawerSection,
  ReadOnlyField
} from '../components/ui/drawer-patterns';
import type { Patient } from '../types/domain';
import { useClinicContext } from '../context/ClinicContext';
import { DEMO_STAFF } from '../lib/mock-data';

export function PatientsPage() {
  const { patients, visits, addPatient, startVisit, normalizePhone } = useClinicContext();
  const [search, setSearch] = useState('');
  
  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create' | 'startVisit'>('view');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form states
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: 'Male' as 'Male' | 'Female' | 'Other' });
  const [visitDoctor, setVisitDoctor] = useState('');
  const [activeVisitWarning, setActiveVisitWarning] = useState(false);

  const doctors = DEMO_STAFF.filter(s => ['Head Doctor', 'Duty Doctor', 'Surgeon'].includes(s.role));

  const hasActiveVisit = (patientId: string) => {
    return visits.some(v => v.patientId === patientId && !['COMPLETED', 'CANCELLED'].includes(v.status));
  }

  const handleRowClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleNewPatient = () => {
    const rawSearch = search;
    const isNumber = /^\+?[\d\s\-()]+$/.test(rawSearch);
    
    setNewPatient({
      name: !isNumber ? rawSearch : '',
      phone: isNumber ? rawSearch : '',
      age: '',
      gender: 'Male'
    });
    setSelectedPatient(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleSaveNewPatient = () => {
    // Duplicate Protection
    const normPhone = normalizePhone(newPatient.phone);
    const existing = patients.find(p => normalizePhone(p.phone) === normPhone);
    if (existing) {
      // Force them to use the existing patient
      setSelectedPatient(existing);
      setDrawerMode('view');
      return;
    }

    const created = addPatient({
      name: newPatient.name || 'Unknown Patient',
      phone: newPatient.phone,
      age: parseInt(newPatient.age) || 0,
      gender: newPatient.gender,
      status: 'Active'
    });
    
    setSelectedPatient(created);
    setDrawerMode('startVisit'); // Immediately flow into start visit
    setVisitDoctor('');
    setActiveVisitWarning(false);
  };

  const handleOpenStartVisit = (patient: Patient) => {
    setSelectedPatient(patient);
    setVisitDoctor('');
    setActiveVisitWarning(hasActiveVisit(patient.id));
    setDrawerMode('startVisit');
    setDrawerOpen(true);
  };

  const handleConfirmVisit = () => {
    if (!selectedPatient || !visitDoctor) return;
    startVisit(selectedPatient.id, visitDoctor);
    setDrawerOpen(false);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Active') {
      return (
        <Badge variant="statusActive">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="statusInactive">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
        Inactive
      </Badge>
    );
  };

  const columns: ColumnDef<Patient>[] = [
    {
      accessorKey: "name",
      header: "Patient Identity",
      cell: ({ row }) => (
        <PatientIdentity 
          name={row.original.name} 
          patientId={row.original.id} 
          avatarUrl={`https://i.pravatar.cc/150?u=${row.original.id}`}
        />
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-slate-900 font-medium">{row.original.phone}</span>
        </div>
      )
    },
    {
      accessorKey: "age",
      header: "Age / Gender",
      cell: ({ row }) => <span className="text-slate-600">{row.original.age} Yrs • {row.original.gender}</span>
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="shadow-sm font-medium" onClick={(e) => { e.stopPropagation(); handleRowClick(row.original); }}>
            View
          </Button>
        </div>
      )
    }
  ];

  const filteredData = useMemo(() => {
    const term = normalizePhone(search.toLowerCase());
    return patients.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      normalizePhone(d.phone).includes(term)
    );
  }, [patients, search, normalizePhone]);

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-slate-500 mt-1">Reception workflow: search patients, register new arrivals, and begin visits.</p>
        </div>
        <Button className="w-full sm:w-auto shadow-sm" onClick={handleNewPatient}>
          <UserPlus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, ID or phone..."
        actionSlot={
          <>
            <Button variant="outline" className="flex-none shadow-sm">Export PDF</Button>
          </>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1 flex flex-col">
        {filteredData.length === 0 && search !== '' ? (
          <div className="p-12 text-center flex flex-col items-center justify-center flex-1">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No patient found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">There is no patient matching "{search}". Register them to begin their visit.</p>
            <Button onClick={handleNewPatient} className="shadow-sm">
              Register New Patient
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredData} selectable={false} />
        )}
      </div>

      {/* Universal Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          
          {(selectedPatient || drawerMode === 'create') && (
            <>
              {drawerMode === 'create' ? (
                <PatientProfileHeader 
                  name={newPatient.name || 'New Patient'}
                  patientId="Unassigned"
                  phone={newPatient.phone || 'Phone'}
                  modeText="Register Patient"
                />
              ) : (
                <PatientProfileHeader 
                  name={selectedPatient!.name}
                  patientId={selectedPatient!.id}
                  phone={selectedPatient!.phone}
                  statusElement={getStatusBadge(selectedPatient!.status)}
                  modeText={
                    drawerMode === 'view' ? 'Patient Profile' : 
                    drawerMode === 'startVisit' ? 'Start Clinic Visit' : 
                    'Edit Profile'
                  }
                />
              )}

              <SheetScrollArea className="flex-1 p-0 bg-slate-50">
                <div className="px-6 py-8 space-y-8">
                  {drawerMode === 'view' && selectedPatient && (
                    <DrawerSection title="Basic Information">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                        <ReadOnlyField label="Full Name" value={selectedPatient.name} />
                        <ReadOnlyField label="Patient ID" value={selectedPatient.id} isMono />
                        <ReadOnlyField label="Phone" value={selectedPatient.phone} />
                        <ReadOnlyField label="Age" value={`${selectedPatient.age} Yrs`} />
                        <ReadOnlyField label="Gender" value={selectedPatient.gender} />
                      </div>
                    </DrawerSection>
                  )}

                  {(drawerMode === 'edit' || drawerMode === 'create') && (
                    <DrawerSection title="Basic Information">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Full Name</label>
                          <Input 
                            value={drawerMode === 'create' ? newPatient.name : selectedPatient?.name} 
                            onChange={e => drawerMode === 'create' && setNewPatient({...newPatient, name: e.target.value})}
                            className="bg-white" 
                            autoFocus={drawerMode === 'create'}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Phone</label>
                            <Input 
                              value={drawerMode === 'create' ? newPatient.phone : selectedPatient?.phone} 
                              onChange={e => drawerMode === 'create' && setNewPatient({...newPatient, phone: e.target.value})}
                              className="bg-white" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Age</label>
                            <Input 
                              value={drawerMode === 'create' ? newPatient.age : selectedPatient?.age} 
                              onChange={e => drawerMode === 'create' && setNewPatient({...newPatient, age: e.target.value})}
                              type="number" 
                              className="bg-white" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Gender</label>
                          <select 
                            value={drawerMode === 'create' ? newPatient.gender : selectedPatient?.gender}
                            onChange={e => drawerMode === 'create' && setNewPatient({...newPatient, gender: e.target.value as any})}
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </DrawerSection>
                  )}

                  {drawerMode === 'startVisit' && selectedPatient && (
                    <DrawerSection title="Visit Details">
                      {activeVisitWarning && (
                        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-[13px]">Active Visit Warning</div>
                            <div className="text-sm opacity-80 mt-1">This patient already has an active visit in progress. Creating another visit will run concurrently. Proceed with caution.</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Assign Provider</label>
                          <select 
                            value={visitDoctor}
                            onChange={e => setVisitDoctor(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50"
                          >
                            <option value="" disabled>Select a doctor...</option>
                            {doctors.map(d => (
                              <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Appointment Reference (Optional)</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Walk-in (No appointment)" disabled className="bg-slate-50 pl-9" />
                          </div>
                          <p className="text-[11px] text-slate-500">Only walk-ins are supported in this demo phase.</p>
                        </div>
                      </div>
                    </DrawerSection>
                  )}
                </div>
              </SheetScrollArea>

              <DrawerFooterActions>
                {drawerMode === 'view' ? (
                  <>
                    <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-white shadow-sm">
                      Close
                    </Button>
                    <Button variant="outline" onClick={() => setDrawerMode('edit')} className="w-full sm:w-auto bg-white shadow-sm">
                      Edit Patient
                    </Button>
                    <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 shadow-sm" onClick={() => selectedPatient && handleOpenStartVisit(selectedPatient)}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Visit
                    </Button>
                  </>
                ) : drawerMode === 'startVisit' ? (
                  <>
                    <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-white shadow-sm">
                      Cancel
                    </Button>
                    <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 shadow-sm" onClick={handleConfirmVisit} disabled={!visitDoctor}>
                      <Play className="w-4 h-4 mr-2" />
                      Create & Add to Queue
                    </Button>
                  </>
                ) : drawerMode === 'create' ? (
                  <>
                    <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-white shadow-sm">
                      Cancel
                    </Button>
                    <Button className="w-full sm:w-auto shadow-sm" onClick={handleSaveNewPatient} disabled={!newPatient.name || !newPatient.phone}>
                      Register Patient
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setDrawerMode('view')} className="w-full sm:w-auto bg-white shadow-sm">
                      Cancel
                    </Button>
                    <Button className="w-full sm:w-auto shadow-sm" onClick={() => setDrawerMode('view')}>
                      Save Changes
                    </Button>
                  </>
                )}
              </DrawerFooterActions>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
