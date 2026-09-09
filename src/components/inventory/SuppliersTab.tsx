import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, UserX, Search, Phone, Mail, Building2, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Sheet, SheetContent, SheetScrollArea } from '../ui/sheet';
import { DrawerSection, DrawerFooterActions, ReadOnlyField } from '../ui/drawer-patterns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { DataTable } from '../data-table/data-table';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { DataTableEmpty } from '../data-table/data-table';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import type { Supplier } from '../../types/domain';

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Deactivate confirmation modal
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') query.set('status', statusFilter);
      if (search) query.set('search', search);

      const res = await api.get<Supplier[]>(`/api/suppliers?${query.toString()}`);
      setSuppliers(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      toast.error(err.response?.data?.error || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreateDrawer = () => {
    setSelectedSupplier(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEditDrawer = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData({
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || ''
    });
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      if (drawerMode === 'create') {
        await api.post('/api/suppliers', formData);
        toast.success('Supplier created successfully');
      } else if (drawerMode === 'edit' && selectedSupplier) {
        await api.put(`/api/suppliers/${selectedSupplier.id}`, formData);
        toast.success('Supplier updated successfully');
      }
      setDrawerOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save supplier');
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await api.patch(`/api/suppliers/${deactivateTarget.id}/deactivate`);
      toast.success(`${deactivateTarget.name} marked as Inactive`);
      setDeactivateTarget(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to deactivate supplier');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'name',
      header: 'Supplier Name',
      cell: ({ row }) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'contactPerson',
      header: 'Contact Person',
      cell: ({ row }) => (
        <div className="text-slate-700 text-sm flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{row.original.contactPerson || '—'}</span>
        </div>
      )
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="text-slate-600 text-sm font-mono flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{row.original.phone || '—'}</span>
        </div>
      )
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="text-slate-600 text-sm flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{row.original.email || '—'}</span>
        </div>
      )
    },
    {
      id: 'billed',
      header: () => <div className="text-right">Total Billed</div>,
      cell: ({ row }) => {
        const amt = row.original.financials?.totalBilled || 0;
        return <div className="text-right font-mono font-semibold text-slate-800 text-xs">₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      }
    },
    {
      id: 'paid',
      header: () => <div className="text-right">Total Paid</div>,
      cell: ({ row }) => {
        const amt = row.original.financials?.totalPaid || 0;
        return <div className="text-right font-mono font-semibold text-emerald-700 text-xs">₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      }
    },
    {
      id: 'balance',
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => {
        const amt = row.original.financials?.outstandingBalance || 0;
        return (
          <div className={`text-right font-mono font-bold text-xs ${amt > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
            ₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return s === 'Active' ? (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Inactive</Badge>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
              title="Edit Supplier"
              onClick={() => openEditDrawer(s)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {s.status === 'Active' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                title="Deactivate Supplier"
                onClick={() => setDeactivateTarget(s)}
              >
                <UserX className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search suppliers..."
        actionSlot={
          <Button onClick={openCreateDrawer} className="bg-teal-600 hover:bg-teal-700 shadow-sm text-white font-medium text-xs h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
          </Button>
        }
        exportOptions={{
          pdf: true,
          excel: true,
          csv: true,
          onExport: (format) => {
            const query = new URLSearchParams({
              format,
              ...(search ? { search } : {}),
              ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {})
            }).toString();
            api.download(`/api/suppliers/export?${query}`, `suppliers_export.${format === 'xlsx' ? 'xlsx' : format}`);
          }
        }}
        filterSlot={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-slate-50/50 text-xs font-medium">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={suppliers}
          loading={isLoading}
          emptyState={
            <DataTableEmpty
              icon={Building2}
              title="No suppliers found"
              description="Add medicine suppliers to start creating Purchase Orders."
              action={
                <Button onClick={openCreateDrawer} size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
                </Button>
              }
            />
          }
        />
      </div>

      {/* Supplier Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col">
          <div className="px-6 py-5 border-b bg-slate-50/60">
            <h3 className="text-lg font-bold text-slate-900">
              {drawerMode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {drawerMode === 'create' ? 'Register a wholesale vendor for purchase orders.' : 'Update supplier contact information.'}
            </p>
          </div>

          <SheetScrollArea className="p-6 flex-1">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="sup-name" className="text-xs font-semibold text-slate-600 uppercase">
                  Supplier Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="sup-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apollo Pharma Distributors"
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-contact" className="text-xs font-semibold text-slate-600 uppercase">
                  Contact Person
                </Label>
                <Input
                  id="sup-contact"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Mr. Rajesh Kumar"
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sup-phone" className="text-xs font-semibold text-slate-600 uppercase">
                    Phone Number
                  </Label>
                  <Input
                    id="sup-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="h-10 text-sm font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sup-email" className="text-xs font-semibold text-slate-600 uppercase">
                    Email Address
                  </Label>
                  <Input
                    id="sup-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sales@supplier.com"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-addr" className="text-xs font-semibold text-slate-600 uppercase">
                  Physical Address
                </Label>
                <Input
                  id="sup-addr"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, Postal Code"
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </SheetScrollArea>

          <DrawerFooterActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSupplier} className="bg-teal-600 hover:bg-teal-700 text-white font-medium">
              {drawerMode === 'create' ? 'Save Supplier' : 'Update Supplier'}
            </Button>
          </DrawerFooterActions>
        </SheetContent>
      </Sheet>

      {/* Deactivation Confirmation Modal */}
      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Deactivate Supplier?</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-2 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-800">{deactivateTarget?.name}</strong>?
              <br /><br />
              Historical Purchase Orders will remain safely preserved. Inactive suppliers cannot be selected for new orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeactivating}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={isDeactivating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isDeactivating ? 'Deactivating...' : 'Yes, Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
