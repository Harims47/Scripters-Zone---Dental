import { useState, useMemo } from 'react'
import { Plus, Search, User, Phone, Edit2, ShieldOff } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog'
import { DrawerFooterActions } from '../components/ui/drawer-patterns'
import { StaffStatusBadge, RoleAccessPreview } from '../components/staff/staff-components'
import { type ClinicRole, ROLE_CONFIG } from '../lib/role-config'
import { DEMO_STAFF, type Staff } from '../lib/mock-data'

type StaffStatus = 'Active' | 'Inactive'

export function StaffPage() {
  const [data, setData] = useState<Staff[]>(DEMO_STAFF)
  const [search, setSearch] = useState('')
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  
  // Edit/Create form state
  const [activeItem, setActiveItem] = useState<Partial<Staff>>({})

  // Deactivate dialog state
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setActiveItem({
      status: 'Active',
      role: 'Duty Doctor' // Default role
    })
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  const handleOpenView = (row: Staff) => {
    setActiveItem(row)
    setDrawerMode('view')
    setDrawerOpen(true)
  }

  const handleOpenEdit = (row: Staff) => {
    setActiveItem(row)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (drawerMode === 'create') {
      const newItem: Staff = {
        id: `STF-${Math.floor(Math.random() * 900) + 200}`,
        name: activeItem.name || '',
        phone: activeItem.phone || '',
        role: activeItem.role as ClinicRole || 'Duty Doctor',
        status: activeItem.status as StaffStatus || 'Active'
      }
      setData(prev => [newItem, ...prev])
    } else if (drawerMode === 'edit') {
      setData(prev => prev.map(r => r.id === activeItem.id ? { ...r, ...activeItem } as Staff : r))
    }
    setDrawerOpen(false)
  }

  const handleConfirmDeactivate = () => {
    if (deactivateId) {
      setData(prev => prev.map(r => r.id === deactivateId ? { ...r, status: 'Inactive' } : r))
      setDeactivateId(null)
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.phone.includes(search)
    )
  }, [data, search])

  const columns: ColumnDef<Staff>[] = [
    {
      header: "Staff Member",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
            {row.original.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.original.name}</div>
            <div className="text-xs font-mono text-slate-500">{row.original.id}</div>
          </div>
        </div>
      )
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.role}</span>
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: ({ row }) => <span className="text-slate-600">{row.original.phone}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <StaffStatusBadge status={row.original.status} />
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {row.original.status === 'Active' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" aria-label="Edit staff" onClick={() => handleOpenEdit(row.original)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Deactivate staff" onClick={() => setDeactivateId(row.original.id)}>
                <ShieldOff className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => handleOpenView(row.original)} className="shadow-sm">
            View
          </Button>
        </div>
      )
    }
  ]

  // Derived for drawer
  const isCreating = drawerMode === 'create'
  
  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Roles</h1>
          <p className="text-slate-500 mt-1">Manage clinic staff and role assignments.</p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or phone..."
        exportOptions={{ pdf: true, excel: true, csv: true }}
        filterSlot={
          <>
            <Button variant="outline" className="h-9 shadow-sm">Role</Button>
            <Button variant="outline" className="h-9 shadow-sm">Status</Button>
          </>
        }
      />

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1">
        <DataTable 
          columns={columns} 
          data={filteredData} 
          emptyState={
            search !== '' ? (
              <DataTableEmpty 
                icon={Search} 
                title="No staff found" 
                description={`There are no staff matching "${search}".`}
              />
            ) : (
              <DataTableEmpty 
                icon={User}
                title="No staff members" 
                description="Add staff members to get started." 
                action={<Button onClick={handleOpenCreate} className="shadow-sm">Add Staff</Button>}
              />
            )
          }
        />
      </div>

      {/* Deactivate Dialog */}
      <Dialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Staff?</DialogTitle>
            <DialogDescription>
              This staff member will no longer be active or have access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeactivate}>Deactivate Staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          
          {/* Drawer Header */}
          <div className="px-6 py-6 bg-slate-900 border-b border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {isCreating ? 'Add Staff Member' : activeItem.name}
                </h2>
                <p className="text-slate-400 mt-1">
                  {isCreating ? 'Configure new clinic personnel.' : `ID: ${activeItem.id}`}
                </p>
              </div>
              {!isCreating && <StaffStatusBadge status={activeItem.status as StaffStatus} />}
            </div>
          </div>

          {/* Drawer Body */}
          <SheetScrollArea className="p-0 bg-white flex-1">
            <div className="px-6 sm:px-8 py-8 space-y-8">
              
              {/* Form Fields */}
              <div className="space-y-6">
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      className="pl-9 bg-slate-50" 
                      placeholder="e.g. Dr. John Doe"
                      value={activeItem.name || ''}
                      onChange={e => setActiveItem(prev => ({ ...prev, name: e.target.value }))}
                      readOnly={drawerMode === 'view'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      className="pl-9 bg-slate-50" 
                      placeholder="+91 XXXXX XXXXX"
                      value={activeItem.phone || ''}
                      onChange={e => setActiveItem(prev => ({ ...prev, phone: e.target.value }))}
                      readOnly={drawerMode === 'view'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Assigned Role</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    value={activeItem.role || ''}
                    onChange={e => setActiveItem(prev => ({ ...prev, role: e.target.value as ClinicRole }))}
                    disabled={drawerMode === 'view'}
                  >
                    {Object.keys(ROLE_CONFIG).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {!isCreating && drawerMode === 'edit' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Account Status</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={activeItem.status || 'Active'}
                      onChange={e => setActiveItem(prev => ({ ...prev, status: e.target.value as StaffStatus }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}

              </div>
              
              {/* Role Access Preview */}
              <div className="pt-4 border-t">
                <RoleAccessPreview role={activeItem.role as ClinicRole || 'Duty Doctor'} />
              </div>

            </div>
          </SheetScrollArea>
          
          {/* Drawer Footer */}
          <div className="bg-slate-50 border-t px-6 py-4">
            {drawerMode === 'view' ? (
              <DrawerFooterActions>
                <Button onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white border-0">Close</Button>
                {activeItem.status === 'Active' && (
                  <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white border-0" onClick={() => setDrawerMode('edit')}>
                    Edit Profile
                  </Button>
                )}
              </DrawerFooterActions>
            ) : (
              <DrawerFooterActions>
                <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-white">Cancel</Button>
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={handleSave}
                  disabled={!activeItem.name}
                >
                  {isCreating ? 'Save Staff Member' : 'Save Changes'}
                </Button>
              </DrawerFooterActions>
            )}
          </div>

        </SheetContent>
      </Sheet>

    </div>
  )
}
