import { useState } from 'react'
import { Building2, Calendar, List, Pill, CreditCard, User, Edit2, ShieldCheck, Check, Settings2, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { EntityDrawerHeader, DrawerSection, DrawerFooterActions, ReadOnlyField } from '../components/ui/drawer-patterns'
import { 
  DEMO_CLINIC_PROFILE, 
  DEMO_APPOINTMENT_TYPES, 
  DEMO_QUEUE_SETTINGS, 
  DEMO_PAYMENT_METHODS, 
  DEMO_STAFF,
  type ClinicProfile,
  type AppointmentTypeConfig,
  type QueueSettings,
  type PaymentMethodConfig
} from '../lib/mock-data'

import { MEDICINE_CATEGORIES, type MedicineCategory } from '../lib/medicine-categories'

type SettingsTab = 'clinic' | 'appointments' | 'queue' | 'categories' | 'payments' | 'profile'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('clinic')
  
  // Local state for the settings data (mocked)
  const [clinic, setClinic] = useState<ClinicProfile>(DEMO_CLINIC_PROFILE)
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeConfig[]>(DEMO_APPOINTMENT_TYPES)
  const [queueSettings, setQueueSettings] = useState<QueueSettings>(DEMO_QUEUE_SETTINGS)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(DEMO_PAYMENT_METHODS)
  const [myProfile, setMyProfile] = useState(DEMO_STAFF[0]) // Assuming Dr. Arun is first
  const medicineCategories: MedicineCategory[] = Object.values(MEDICINE_CATEGORIES)
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view')
  
  // To handle what is being edited in the drawer
  const [activeEntity, setActiveEntity] = useState<any>(null)

  // Drawer functions
  const handleOpenDrawer = (entity: any, mode: 'view' | 'edit' | 'create') => {
    setActiveEntity(entity ? { ...entity } : null)
    setDrawerMode(mode)
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (activeTab === 'clinic') {
      setClinic(activeEntity)
    } else if (activeTab === 'appointments') {
      if (drawerMode === 'create') {
        const newItem = { ...activeEntity, id: `apt${Date.now()}` }
        setAppointmentTypes([...appointmentTypes, newItem])
      } else {
        setAppointmentTypes(appointmentTypes.map(a => a.id === activeEntity.id ? activeEntity : a))
      }
    } else if (activeTab === 'queue') {
      setQueueSettings(activeEntity)
    } else if (activeTab === 'payments') {
      setPaymentMethods(paymentMethods.map(p => p.id === activeEntity.id ? activeEntity : p))
    } else if (activeTab === 'profile') {
      setMyProfile(activeEntity)
    }
    setDrawerOpen(false)
  }

  const renderSidebar = () => {
    return (
      <div className="w-full md:w-64 flex-shrink-0 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">General</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('clinic')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clinic' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Building2 className="w-4 h-4" /> Clinic Profile
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">Clinic Operations</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appointments' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Calendar className="w-4 h-4" /> Appointment Types
            </button>
            <button 
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'queue' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <List className="w-4 h-4" /> Queue Settings
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Pill className="w-4 h-4" /> Medicine Categories
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">Payments</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'payments' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <CreditCard className="w-4 h-4" /> Payment Methods
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">Account</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <User className="w-4 h-4" /> My Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'clinic':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Clinic Profile</h2>
                <p className="text-slate-500 text-sm mt-1">Manage core clinic details and contact information.</p>
              </div>
              <Button onClick={() => handleOpenDrawer(clinic, 'edit')} variant="outline" className="shadow-sm">
                <Edit2 className="w-4 h-4 mr-2 text-slate-400" /> Edit Profile
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Clinic Name</div>
                <div className="text-[15px] font-medium text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0">
                    {clinic.name.charAt(0)}
                  </div>
                  {clinic.name}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Default Language</div>
                <div className="text-[15px] text-slate-900">{clinic.language}</div>
              </div>
              
              <div className="col-span-full h-px bg-slate-100/60 my-2"></div>
              
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Phone Number</div>
                <div className="text-[15px] text-slate-900">{clinic.phone}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Email Address</div>
                <div className="text-[15px] text-slate-900">{clinic.email}</div>
              </div>
              
              <div className="col-span-full space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Clinic Address</div>
                <div className="text-[15px] text-slate-900 leading-relaxed">
                  {clinic.address}<br />
                  {clinic.city} - {clinic.pin}
                </div>
              </div>
            </div>
          </div>
        )
      case 'appointments':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100/60">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Appointment Types</h2>
                <p className="text-slate-500 text-sm mt-1">Configure available appointment services.</p>
              </div>
              <Button onClick={() => handleOpenDrawer({ status: 'Active', name: '', description: '' }, 'create')} className="bg-teal-600 hover:bg-teal-700 shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Add Type
              </Button>
            </div>
            <div className="divide-y divide-slate-100/60">
              {appointmentTypes.map(apt => (
                <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-900">{apt.name}</span>
                      {apt.status === 'Active' ? (
                        <Badge variant="statusActive" className="px-2 py-0.5 text-[10px]">ACTIVE</Badge>
                      ) : (
                        <Badge variant="statusInactive" className="px-2 py-0.5 text-[10px]">INACTIVE</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{apt.description}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDrawer(apt, 'edit')} className="shadow-sm bg-white">
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      case 'queue':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Queue Settings</h2>
                <p className="text-slate-500 text-sm mt-1">Configure automated queue progression and priorities.</p>
              </div>
              <Button onClick={() => handleOpenDrawer(queueSettings, 'edit')} variant="outline" className="shadow-sm">
                <Edit2 className="w-4 h-4 mr-2 text-slate-400" /> Edit Settings
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Queue System</div>
                <div className="flex items-center gap-2 text-[15px] font-medium text-slate-900">
                  {queueSettings.enabled ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4" />}
                  {queueSettings.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Priority Handling</div>
                <div className="flex items-center gap-2 text-[15px] font-medium text-slate-900">
                  {queueSettings.allowPriority ? 'Allow Priority Bumping' : 'Strict FIFO'}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Default Entry Status</div>
                <div className="text-[15px] text-slate-900">{queueSettings.defaultStatus}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-slate-500">Max Visible Entries</div>
                <div className="text-[15px] text-slate-900">{queueSettings.maxVisible} Patients</div>
              </div>
            </div>
          </div>
        )
      case 'categories':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="p-6 border-b border-slate-100/60">
              <h2 className="text-xl font-bold text-slate-900">Medicine Categories</h2>
              <p className="text-slate-500 text-sm mt-1">Global classification for inventory items.</p>
            </div>
            <div className="divide-y divide-slate-100/60">
              {medicineCategories.map(cat => (
                <div key={cat.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${cat.dotClass}`}></div>
                    <span className="font-semibold text-slate-900">{cat.displayName}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDrawer(cat, 'view')} className="shadow-sm bg-white">
                    View Info
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      case 'payments':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="p-6 border-b border-slate-100/60">
              <h2 className="text-xl font-bold text-slate-900">Payment Methods</h2>
              <p className="text-slate-500 text-sm mt-1">Accepted settlement methods for clinic visits.</p>
            </div>
            <div className="divide-y divide-slate-100/60">
              {paymentMethods.map(pm => (
                <div key={pm.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{pm.name}</span>
                    {pm.status === 'Active' ? (
                      <Badge variant="statusActive" className="px-2 py-0.5 text-[10px]">ACTIVE</Badge>
                    ) : (
                      <Badge variant="statusInactive" className="px-2 py-0.5 text-[10px]">INACTIVE</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDrawer(pm, 'edit')} className="shadow-sm bg-white">
                    Edit Status
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      case 'profile':
        return (
          <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
                <p className="text-slate-500 text-sm mt-1">Your personal account details.</p>
              </div>
              <Button onClick={() => handleOpenDrawer(myProfile, 'edit')} variant="outline" className="shadow-sm">
                <Edit2 className="w-4 h-4 mr-2 text-slate-400" /> Edit Profile
              </Button>
            </div>
            
            <div className="flex items-start gap-8">
              <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-500 text-3xl font-bold flex items-center justify-center shrink-0">
                {myProfile.name.charAt(0)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 flex-1 pt-2">
                <div className="space-y-1.5">
                  <div className="text-[13px] font-semibold text-slate-500">Full Name</div>
                  <div className="text-[15px] font-medium text-slate-900">{myProfile.name}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[13px] font-semibold text-slate-500">Role</div>
                  <div className="text-[15px] text-slate-900">{myProfile.role}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[13px] font-semibold text-slate-500">Phone Number</div>
                  <div className="text-[15px] text-slate-900">{myProfile.phone}</div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderDrawerContent = () => {
    if (!activeEntity) return null

    if (activeTab === 'clinic') {
      return (
        <>
          <EntityDrawerHeader 
            name={activeEntity.name} 
            metadata={activeEntity.city}
            icon={<Building2 className="w-6 h-6" />}
            modeText="Edit Clinic Profile"
          />
          <SheetScrollArea>
            <DrawerSection title="Basic Information">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Clinic Name</label>
                  <Input value={activeEntity.name} onChange={e => setActiveEntity({...activeEntity, name: e.target.value})} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Default Language</label>
                  <Input value={activeEntity.language} onChange={e => setActiveEntity({...activeEntity, language: e.target.value})} className="bg-white" />
                </div>
              </div>
            </DrawerSection>
            <DrawerSection title="Contact Details">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  <Input value={activeEntity.phone} onChange={e => setActiveEntity({...activeEntity, phone: e.target.value})} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <Input value={activeEntity.email} onChange={e => setActiveEntity({...activeEntity, email: e.target.value})} className="bg-white" />
                </div>
              </div>
            </DrawerSection>
            <DrawerSection title="Location">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <Input value={activeEntity.address} onChange={e => setActiveEntity({...activeEntity, address: e.target.value})} className="bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">City</label>
                    <Input value={activeEntity.city} onChange={e => setActiveEntity({...activeEntity, city: e.target.value})} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">PIN / ZIP</label>
                    <Input value={activeEntity.pin} onChange={e => setActiveEntity({...activeEntity, pin: e.target.value})} className="bg-white" />
                  </div>
                </div>
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-white shadow-sm">Save Changes</Button>
          </DrawerFooterActions>
        </>
      )
    }

    if (activeTab === 'appointments') {
      const isCreate = drawerMode === 'create'
      return (
        <>
          <EntityDrawerHeader 
            name={isCreate ? 'New Appointment Type' : activeEntity.name} 
            id={activeEntity.id}
            icon={<Calendar className="w-6 h-6" />}
            statusElement={!isCreate && (
              <Badge variant={activeEntity.status === 'Active' ? 'statusActive' : 'statusInactive'}>
                {activeEntity.status}
              </Badge>
            )}
            modeText={isCreate ? 'Create Type' : 'Edit Appointment Type'}
          />
          <SheetScrollArea>
            <DrawerSection title="Configuration">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Type Name</label>
                  <Input value={activeEntity.name} onChange={e => setActiveEntity({...activeEntity, name: e.target.value})} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea 
                    value={activeEntity.description} 
                    onChange={e => setActiveEntity({...activeEntity, description: e.target.value})} 
                    className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select 
                    value={activeEntity.status} 
                    onChange={e => setActiveEntity({...activeEntity, status: e.target.value})} 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-white shadow-sm">
              {isCreate ? 'Create Type' : 'Save Changes'}
            </Button>
          </DrawerFooterActions>
        </>
      )
    }

    if (activeTab === 'queue') {
      return (
        <>
          <EntityDrawerHeader 
            name="Queue Settings" 
            icon={<Settings2 className="w-6 h-6" />}
            modeText="Configure Operations"
          />
          <SheetScrollArea>
            <DrawerSection title="Queue Rules">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">Enable Queue System</div>
                    <div className="text-sm text-slate-500">Turn the automated queue on or off globally.</div>
                  </div>
                  <Button 
                    variant={activeEntity.enabled ? 'default' : 'outline'}
                    className={activeEntity.enabled ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => setActiveEntity({...activeEntity, enabled: !activeEntity.enabled})}
                  >
                    {activeEntity.enabled ? <Check className="w-4 h-4 mr-2" /> : null}
                    {activeEntity.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">Allow Priority Patients</div>
                    <div className="text-sm text-slate-500">Allow front-desk to mark patients as Urgent.</div>
                  </div>
                  <Button 
                    variant={activeEntity.allowPriority ? 'default' : 'outline'}
                    className={activeEntity.allowPriority ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => setActiveEntity({...activeEntity, allowPriority: !activeEntity.allowPriority})}
                  >
                    {activeEntity.allowPriority ? <Check className="w-4 h-4 mr-2" /> : null}
                    {activeEntity.allowPriority ? 'Yes' : 'No'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Default Entry Status</label>
                  <Input value={activeEntity.defaultStatus} onChange={e => setActiveEntity({...activeEntity, defaultStatus: e.target.value})} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Maximum Visible Entries</label>
                  <Input type="number" value={activeEntity.maxVisible} onChange={e => setActiveEntity({...activeEntity, maxVisible: parseInt(e.target.value) || 10})} className="bg-white" />
                </div>
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-white shadow-sm">Save Changes</Button>
          </DrawerFooterActions>
        </>
      )
    }

    if (activeTab === 'categories') {
      return (
        <>
          <EntityDrawerHeader 
            name={activeEntity.displayName} 
            id={activeEntity.id}
            icon={<Pill className="w-6 h-6" />}
            modeText="Category Information"
          />
          <SheetScrollArea>
            <DrawerSection title="Details">
              <div className="space-y-6">
                <ReadOnlyField label="Category Name" value={activeEntity.displayName} />
                <ReadOnlyField label="System ID" value={activeEntity.id} isMono />
                <div>
                  <div className="text-[13px] font-semibold text-slate-500 mb-1.5">Color Association</div>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-md ${activeEntity.bgClass} ${activeEntity.borderClass} border`}></div>
                    <span className="text-[15px] font-medium text-slate-900">{activeEntity.colorToken}</span>
                  </div>
                </div>
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Close</Button>
          </DrawerFooterActions>
        </>
      )
    }

    if (activeTab === 'payments') {
      return (
        <>
          <EntityDrawerHeader 
            name={activeEntity.name} 
            id={activeEntity.id}
            icon={<CreditCard className="w-6 h-6" />}
            statusElement={
              <Badge variant={activeEntity.status === 'Active' ? 'statusActive' : 'statusInactive'}>
                {activeEntity.status}
              </Badge>
            }
            modeText="Edit Payment Method"
          />
          <SheetScrollArea>
            <DrawerSection title="Configuration">
              <div className="space-y-4">
                <ReadOnlyField label="Method Name" value={activeEntity.name} />
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select 
                    value={activeEntity.status} 
                    onChange={e => setActiveEntity({...activeEntity, status: e.target.value})} 
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-white shadow-sm">Save Changes</Button>
          </DrawerFooterActions>
        </>
      )
    }

    if (activeTab === 'profile') {
      return (
        <>
          <EntityDrawerHeader 
            name={activeEntity.name} 
            metadata={activeEntity.role}
            icon={<User className="w-6 h-6" />}
            modeText="Edit My Profile"
          />
          <SheetScrollArea>
            <DrawerSection title="Personal Information">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <Input value={activeEntity.name} onChange={e => setActiveEntity({...activeEntity, name: e.target.value})} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone</label>
                  <Input value={activeEntity.phone} onChange={e => setActiveEntity({...activeEntity, phone: e.target.value})} className="bg-white" />
                </div>
                <ReadOnlyField label="Role" value={activeEntity.role} />
              </div>
            </DrawerSection>
          </SheetScrollArea>
          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto text-white shadow-sm">Save Changes</Button>
          </DrawerFooterActions>
        </>
      )
    }

    return null
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1200px] mx-auto pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your clinic configuration and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {renderSidebar()}
        <div className="flex-1 w-full min-w-0">
          {renderContent()}
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          {renderDrawerContent()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
