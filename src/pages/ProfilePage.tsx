import { useState } from 'react'
import { User, Edit2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { EntityDrawerHeader, DrawerSection, DrawerFooterActions, ReadOnlyField } from '../components/ui/drawer-patterns'
import { useAuth } from '../context/AuthContext'
import { DEMO_STAFF } from '../lib/mock-data'

export function ProfilePage() {
  const { currentUser } = useAuth()
  
  // Find the matching staff record for the logged in user, or fallback
  const initialProfile = DEMO_STAFF.find(s => s.name === currentUser?.name) || DEMO_STAFF[0]
  
  const [myProfile, setMyProfile] = useState(initialProfile)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeEntity, setActiveEntity] = useState<any>(null)

  const handleOpenDrawer = () => {
    setActiveEntity({ ...myProfile })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    setMyProfile(activeEntity)
    setDrawerOpen(false)
  }

  return (
    <div className="h-full flex flex-col gap-6 max-w-[800px] mx-auto pb-8 pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal account details and credentials.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
            <p className="text-slate-500 text-sm mt-1">Your identity and contact details in the system.</p>
          </div>
          <Button onClick={handleOpenDrawer} variant="outline" className="shadow-sm">
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

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          {activeEntity && (
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
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
