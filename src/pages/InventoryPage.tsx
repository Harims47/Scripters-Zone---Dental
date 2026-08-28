import { useState } from 'react'
import { Package, Search, Filter, Eye, Edit2, Trash2, Plus, Minus } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import { DataTableColumnHeader } from '../components/data-table/data-table-column-header'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/ui/dialog'
import { DrawerSection, DrawerFooterActions, ReadOnlyField } from '../components/ui/drawer-patterns'
import { MEDICINE_CATEGORIES } from '../lib/medicine-categories'
import { MedicineCategoryBadge } from '../components/prescription/prescription-components'
import type { ColumnDef } from "@tanstack/react-table"
import { cn } from '../lib/utils'
import { useClinicContext } from '../context/ClinicContext'
import { type Medicine } from '../lib/mock-data'

type InventoryItem = Medicine

export function InventoryPage() {
  const { medicines, updateMedicine } = useClinicContext()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create' | 'adjust'>('view')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState(5)

  const openDrawer = (item: InventoryItem | null, mode: 'view' | 'edit' | 'create' | 'adjust') => {
    setSelectedItem(item)
    setDrawerMode(mode)
    setDrawerOpen(true)
    setAdjustAmount(5)
  }

  const handleConfirmAdjustment = () => {
    if (selectedItem) {
      const newStock = Math.max(0, selectedItem.currentStock + adjustAmount)
      updateMedicine(selectedItem.id, { currentStock: newStock })
      setSelectedItem({ ...selectedItem, currentStock: newStock })
      setDrawerMode('view')
      setAdjustAmount(5)
    }
  }

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return 'Out of Stock'
    if (current < min) return 'Low Stock'
    return 'In Stock'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Stock': return <Badge variant="statusActive"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> In Stock</Badge>
      case 'Low Stock': return <Badge variant="statusWaiting"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" /> Low Stock</Badge>
      case 'Out of Stock': return <Badge variant="statusCancelled"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" /> Out of Stock</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Medicine / Item" />,
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.name}</span>
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: ({ row }) => <MedicineCategoryBadge categoryId={row.original.categoryId} />
    },
    {
      accessorKey: "unit",
      header: "Strength / Unit",
      cell: ({ row }) => <span className="text-slate-500">{row.original.unit}</span>
    },
    {
      id: "stock",
      header: "Stock Level",
      cell: ({ row }) => {
        const { currentStock, stockWarningLevel } = row.original
        return (
          <div className="flex flex-col">
            <span className={cn("font-medium", currentStock === 0 ? "text-rose-600" : currentStock < stockWarningLevel ? "text-amber-600" : "text-slate-700")}>
              {currentStock} <span className="text-xs text-slate-400 font-normal ml-1">/ Min {stockWarningLevel}</span>
            </span>
          </div>
        )
      }
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(getStockStatus(row.original.currentStock, row.original.stockWarningLevel))
    },
    {
      id: "actions", header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="View item" onClick={() => openDrawer(row.original, 'view')}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label="Edit item" onClick={() => openDrawer(row.original, 'edit')}><Edit2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50" aria-label="Adjust stock" onClick={() => openDrawer(row.original, 'adjust')}><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Adjust Stock</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Delete item" onClick={() => { setSelectedItem(row.original); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
        </div>
      )
    },
  ]

  const filteredData = medicines.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const totalItems = medicines.length
  const lowStockItems = medicines.filter(i => i.currentStock > 0 && i.currentStock < i.stockWarningLevel).length
  const outOfStockItems = medicines.filter(i => i.currentStock === 0).length
  const inStockItems = totalItems - lowStockItems - outOfStockItems

  return (
    <div className="space-y-6">
      
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage clinic medicines and stock levels.</p>
        </div>
        <Button className="shadow-sm font-medium" onClick={() => openDrawer(null, 'create')}>
          <Package className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Items:</span>
          <span className="text-sm font-bold text-slate-700">{totalItems}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
          <span className="text-xs font-semibold text-emerald-700 uppercase">In Stock:</span>
          <span className="text-sm font-bold text-emerald-900">{inStockItems}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100">
          <span className="text-xs font-semibold text-amber-700 uppercase">Low Stock:</span>
          <span className="text-sm font-bold text-amber-900">{lowStockItems}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-md border border-rose-100">
          <span className="text-xs font-semibold text-rose-700 uppercase">Out of Stock:</span>
          <span className="text-sm font-bold text-rose-900">{outOfStockItems}</span>
        </div>
      </div>

      <DataTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search inventory..."
        exportOptions={{ pdf: true, excel: true, csv: true }}
        filterSlot={
          <>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px] h-9 bg-slate-50/50 hover:bg-slate-50 transition-colors"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.values(MEDICINE_CATEGORIES).map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all-status">
              <SelectTrigger className="w-[140px] h-9 bg-slate-50/50 hover:bg-slate-50 transition-colors"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Statuses</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-9 shadow-sm"><Filter className="mr-2 h-4 w-4 text-slate-400" />More Filters</Button>
          </>
        }
      />

      {/* List Surface */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">

        {/* Table */}
        <DataTable 
          columns={columns} 
          data={filteredData} 
          selectable={true}
          emptyState={
            searchQuery !== '' ? (
              <DataTableEmpty 
                icon={Search} 
                title="No items found" 
                description={`There are no inventory items matching "${searchQuery}".`}
              />
            ) : (
              <DataTableEmpty 
                icon={Package}
                title="Inventory is empty" 
                description="Add items to track your clinic's stock." 
                action={<Button onClick={() => openDrawer(null, 'create')} className="shadow-sm">Add Item</Button>}
              />
            )
          } 
        />
      </div>

      {/* DRAWER */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          
          <div className="px-6 sm:px-8 py-6 border-b bg-slate-50/50 flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {drawerMode === 'view' && 'Item Details'}
              {drawerMode === 'edit' && 'Edit Item'}
              {drawerMode === 'create' && 'Add New Item'}
              {drawerMode === 'adjust' && 'Adjust Stock'}
            </h2>
            {selectedItem && drawerMode !== 'create' && (
              <div className="text-sm text-slate-500">{selectedItem.id}</div>
            )}
          </div>

          <SheetScrollArea className="p-0 bg-white flex-1">
            <div className="px-6 sm:px-8 py-8 space-y-10">
              
              {(drawerMode === 'view' || drawerMode === 'edit' || drawerMode === 'create') && (
                <DrawerSection title="Basic Information">
                  {drawerMode === 'view' && selectedItem ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                      <ReadOnlyField label="Item Name" value={selectedItem.name} />
                      <div className="space-y-1">
                        <Label className="text-[13px] text-slate-500 font-medium">Category</Label>
                        <div><MedicineCategoryBadge categoryId={selectedItem.categoryId} /></div>
                      </div>
                      <ReadOnlyField label="Strength / Unit" value={selectedItem.unit} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2 space-y-2.5">
                        <Label className="text-[13px] text-slate-600 font-medium">Item Name</Label>
                        <Input defaultValue={selectedItem?.name} className="shadow-xs bg-white transition-all focus:ring-primary/20" />
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-[13px] text-slate-600 font-medium">Category</Label>
                        <Select defaultValue={selectedItem?.categoryId || "cat1"}>
                          <SelectTrigger className="shadow-xs bg-white transition-all focus:ring-primary/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.values(MEDICINE_CATEGORIES).map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-[13px] text-slate-600 font-medium">Strength / Unit</Label>
                        <Input defaultValue={selectedItem?.unit} className="shadow-xs bg-white transition-all focus:ring-primary/20" />
                      </div>
                    </div>
                  )}
                </DrawerSection>
              )}
              
              {(drawerMode === 'view' || drawerMode === 'edit' || drawerMode === 'create') && (
                <DrawerSection title="Stock Overview">
                  {drawerMode === 'view' && selectedItem ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                      <ReadOnlyField label="Current Stock" value={String(selectedItem.currentStock)} />
                      <ReadOnlyField label="Minimum Level" value={String(selectedItem.stockWarningLevel)} />
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[13px] text-slate-500 font-medium">Status</Label>
                        <div>{getStatusBadge(getStockStatus(selectedItem.currentStock, selectedItem.stockWarningLevel))}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2.5">
                        <Label className="text-[13px] text-slate-600 font-medium">Current Stock</Label>
                        <Input type="number" defaultValue={selectedItem?.currentStock || 0} className="shadow-xs bg-white transition-all focus:ring-primary/20" />
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-[13px] text-slate-600 font-medium">Minimum Stock</Label>
                        <Input type="number" defaultValue={selectedItem?.stockWarningLevel || 10} className="shadow-xs bg-white transition-all focus:ring-primary/20" />
                      </div>
                    </div>
                  )}
                </DrawerSection>
              )}

              {drawerMode === 'adjust' && selectedItem && (
                <DrawerSection title="Adjust Stock Quantity">
                  <div className="space-y-8 max-w-sm">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                      <span className="font-medium text-slate-600">Current Quantity</span>
                      <span className="text-2xl font-bold text-slate-900">{selectedItem.currentStock}</span>
                    </div>
                    
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-slate-700">Adjustment Amount</Label>
                      <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-slate-600 hover:bg-slate-50" aria-label="Decrease stock" onClick={() => setAdjustAmount(a => a - 1)}><Minus className="h-5 w-5" /></Button>
                        <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)} className="h-12 text-center text-lg font-bold shadow-sm" />
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-slate-600 hover:bg-slate-50" aria-label="Increase stock" onClick={() => setAdjustAmount(a => a + 1)}><Plus className="h-5 w-5" /></Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="font-medium text-emerald-800">New Quantity</span>
                      <span className="text-2xl font-bold text-emerald-900">{Math.max(0, selectedItem.currentStock + adjustAmount)}</span>
                    </div>
                  </div>
                </DrawerSection>
              )}

            </div>
          </SheetScrollArea>

          <DrawerFooterActions>
            {drawerMode === 'view' ? (
              <Button onClick={() => setDrawerMode('edit')} className="w-full sm:w-auto shadow-sm font-medium transition-all hover:shadow-md">
                <Edit2 className="mr-2 h-4 w-4" /> Edit Item
              </Button>
            ) : drawerMode === 'adjust' ? (
              <>
                <Button variant="outline" onClick={() => setDrawerMode('view')} className="w-full sm:w-auto font-medium transition-all hover:bg-slate-50">Cancel</Button>
                <Button onClick={handleConfirmAdjustment} className="w-full sm:w-auto shadow-sm font-medium transition-all hover:shadow-md bg-emerald-600 hover:bg-emerald-700">Confirm Adjustment</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => drawerMode === 'create' ? setDrawerOpen(false) : setDrawerMode('view')} className="w-full sm:w-auto font-medium transition-all hover:bg-slate-50">Cancel</Button>
                <Button onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto shadow-sm font-medium transition-all hover:shadow-md">{drawerMode === 'create' ? 'Add Item' : 'Save Changes'}</Button>
              </>
            )}
          </DrawerFooterActions>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">Delete Item</DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-700">{selectedItem?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild><Button variant="outline" className="font-medium">Cancel</Button></DialogClose>
            <Button variant="destructive" className="font-medium shadow-sm" onClick={() => setDeleteDialogOpen(false)}>Yes, delete item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
