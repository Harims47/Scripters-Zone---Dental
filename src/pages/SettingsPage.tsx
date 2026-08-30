import { useState } from 'react'
import { Building2, Calendar, Edit2, Plus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { EntityDrawerHeader, DrawerSection, DrawerFooterActions } from '../components/ui/drawer-patterns'
import { 
  DEMO_CLINIC_PROFILE, 
  DEMO_APPOINTMENT_TYPES, 
  type ClinicProfile,
  type AppointmentTypeConfig
} from '../lib/mock-data'

type SettingsTab = 'clinic' | 'appointments'

import { useSearchParams } from 'react-router-dom'

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (searchParams.get('tab') as SettingsTab) || 'clinic'
  )

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }
  
  // Local state for the settings data (mocked)
  const [clinic, setClinic] = useState<ClinicProfile>(DEMO_CLINIC_PROFILE)
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeConfig[]>(DEMO_APPOINTMENT_TYPES)
  
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
              onClick={() => handleTabChange('clinic')}
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
              onClick={() => handleTabChange('appointments')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appointments' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Calendar className="w-4 h-4" /> Appointment Types
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
