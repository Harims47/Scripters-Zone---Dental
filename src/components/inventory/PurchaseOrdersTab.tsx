import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Eye, Edit2, Send, PackageCheck, XCircle, AlertCircle, ShoppingCart } from 'lucide-react';
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
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog';
import type { ColumnDef } from '@tanstack/react-table';
import type { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../../types/domain';
import type { Medicine } from '../../lib/mock-data/medicines';

interface CreatePOItemRow {
  medicineId: string;
  orderedQuantity: number;
  unitCost: number;
}

export function PurchaseOrdersTab() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drawers & Dialogs
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Receive modal
  const [receiveTargetOrder, setReceiveTargetOrder] = useState<PurchaseOrder | null>(null);

  // Action confirmation modals
  const [confirmStatusAction, setConfirmStatusAction] = useState<{
    po: PurchaseOrder;
    targetStatus: 'Ordered' | 'Cancelled';
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Create / Edit PO form state
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poOrderDate, setPoOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<CreatePOItemRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') query.set('status', statusFilter);
      if (search) query.set('search', search);

      const res = await api.get<PurchaseOrder[]>(`/api/purchase-orders?${query.toString()}`);
      setOrders(Array.isArray(res) ? res : (res as any).data || []);
    } catch (err: any) {
      console.error('Failed to load POs:', err);
      toast.error(err.response?.data?.error || 'Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  const loadDependencies = async () => {
    try {
      const [supRes, medRes] = await Promise.all([
        api.get<Supplier[]>('/api/suppliers?status=Active'),
        api.get<any>('/api/inventory?limit=200')
      ]);
      setSuppliers(Array.isArray(supRes) ? supRes : (supRes as any).data || []);
      const meds = (medRes as any).data || (Array.isArray(medRes) ? medRes : []);
      setMedicines(meds);
    } catch (err) {
      console.error('Failed to load active suppliers / medicines', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    loadDependencies();
  }, [fetchOrders]);

  const openCreateDrawer = () => {
    loadDependencies();
    setSelectedOrder(null);
    setPoSupplierId('');
    setPoOrderDate(new Date().toISOString().split('T')[0]);
    setPoNotes('');
    setPoItems([{ medicineId: '', orderedQuantity: 50, unitCost: 0 }]);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openViewDrawer = (po: PurchaseOrder) => {
    setSelectedOrder(po);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const openEditDrawer = (po: PurchaseOrder) => {
    loadDependencies();
    setSelectedOrder(po);
    setPoSupplierId(po.supplierId);
    setPoOrderDate(new Date(po.orderDate).toISOString().split('T')[0]);
    setPoNotes(po.notes || '');
    setPoItems(
      po.items.map((i) => ({
        medicineId: i.medicineId,
        orderedQuantity: i.orderedQuantity,
        unitCost: i.unitCost || 0
      }))
    );
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleAddItemRow = () => {
    setPoItems((prev) => [...prev, { medicineId: '', orderedQuantity: 50, unitCost: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof CreatePOItemRow, val: any) => {
    setPoItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      // Auto-populate unitCost from medicine unitPrice if available
      if (field === 'medicineId') {
        const med = medicines.find((m) => m.id === val);
        if (med && med.unitPrice) {
          copy[idx].unitCost = med.unitPrice;
        }
      }
      return copy;
    });
  };

  const handleSavePO = async () => {
    if (!poSupplierId) {
      toast.error('Please select an active supplier');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Please add at least one medicine item');
      return;
    }

    for (const item of poItems) {
      if (!item.medicineId) {
        toast.error('Please select a medicine for all item rows');
        return;
      }
      if (!item.orderedQuantity || item.orderedQuantity <= 0) {
        toast.error('Ordered quantity must be greater than 0');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        supplierId: poSupplierId,
        orderDate: poOrderDate,
        notes: poNotes,
        items: poItems
      };

      if (drawerMode === 'create') {
        await api.post('/api/purchase-orders', payload);
        toast.success('Purchase Order created as Draft');
      } else if (drawerMode === 'edit' && selectedOrder) {
        await api.put(`/api/purchase-orders/${selectedOrder.id}`, payload);
        toast.success('Purchase Order updated successfully');
      }

      setDrawerOpen(false);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmStatusTransition = async () => {
    if (!confirmStatusAction) return;
    setIsUpdatingStatus(true);
    const { po, targetStatus } = confirmStatusAction;

    try {
      await api.patch(`/api/purchase-orders/${po.id}/status`, { status: targetStatus });
      toast.success(
        targetStatus === 'Ordered'
          ? `PO ${po.orderNumber} placed successfully`
          : `PO ${po.orderNumber} has been cancelled`
      );
      setConfirmStatusAction(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to transition PO to ${targetStatus}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Draft</Badge>;
      case 'Ordered':
        return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">Ordered</Badge>;
      case 'Partially Received':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Partially Received</Badge>;
      case 'Received':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Received</Badge>;
      case 'Cancelled':
        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'PO Number',
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 font-mono text-xs">
          {row.original.orderNumber}
        </span>
      )
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-800 text-sm">
          {row.original.supplier?.name || '—'}
        </span>
      )
    },
    {
      accessorKey: 'orderDate',
      header: 'Order Date',
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs font-mono">
          {new Date(row.original.orderDate).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'itemCount',
      header: 'Items',
      cell: ({ row }) => {
        const count = row.original.items?.length || 0;
        return (
          <span className="text-slate-700 text-xs font-medium">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status)
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* View PO */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-600 hover:bg-slate-100"
              title="View PO Details"
              onClick={() => openViewDrawer(po)}
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* Draft Actions: Edit, Place Order, Cancel */}
            {po.status === 'Draft' && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                  title="Edit Draft PO"
                  onClick={() => openEditDrawer(po)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-sky-600 hover:bg-sky-50"
                  title="Place Order (Draft → Ordered)"
                  onClick={() => setConfirmStatusAction({ po, targetStatus: 'Ordered' })}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                  title="Cancel Draft PO"
                  onClick={() => setConfirmStatusAction({ po, targetStatus: 'Cancelled' })}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Ordered Actions: Receive Goods, Cancel */}
            {po.status === 'Ordered' && (
              <>
                <Button
                  size="sm"
                  className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  title="Receive Goods"
                  onClick={() => setReceiveTargetOrder(po)}
                >
                  <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                  title="Cancel Ordered PO"
                  onClick={() => setConfirmStatusAction({ po, targetStatus: 'Cancelled' })}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Partially Received Action: Receive Goods */}
            {po.status === 'Partially Received' && (
              <Button
                size="sm"
                className="h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                title="Receive Remaining Goods"
                onClick={() => setReceiveTargetOrder(po)}
              >
                <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive
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
        searchPlaceholder="Search POs..."
        actionSlot={
          <Button onClick={openCreateDrawer} className="bg-teal-600 hover:bg-teal-700 shadow-sm text-white font-medium text-xs h-9">
            <Plus className="w-4 h-4 mr-1.5" /> Create Purchase Order
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
            api.download(`/api/purchase-orders/export?${query}`, `purchase_orders_export.${format === 'xlsx' ? 'xlsx' : format}`);
          }
        }}
        filterSlot={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 bg-slate-50/50 text-xs font-medium">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Ordered">Ordered</SelectItem>
              <SelectItem value="Partially Received">Partially Received</SelectItem>
              <SelectItem value="Received">Received</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          emptyState={
            <DataTableEmpty
              icon={ShoppingCart}
              title="No purchase orders found"
              description="Create a purchase order to request stock from approved suppliers."
              action={
                <Button onClick={openCreateDrawer} size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Purchase Order
                </Button>
              }
            />
          }
        />
      </div>

      {/* Receive Goods Dialog */}
      <ReceiveGoodsDialog
        open={!!receiveTargetOrder}
        onOpenChange={(open) => !open && setReceiveTargetOrder(null)}
        purchaseOrder={receiveTargetOrder}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Create / Edit / View PO Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-xl bg-white border-l shadow-2xl p-0 flex flex-col">
          <div className="px-6 py-5 border-b bg-slate-50/60">
            <h3 className="text-lg font-bold text-slate-900">
              {drawerMode === 'create'
                ? 'Create Purchase Order'
                : drawerMode === 'edit'
                ? `Edit ${selectedOrder?.orderNumber}`
                : `Purchase Order: ${selectedOrder?.orderNumber}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {drawerMode === 'create' || drawerMode === 'edit'
                ? 'Creating or editing a PO does NOT increase stock. Stock increases upon delivery reception.'
                : `Order Date: ${selectedOrder ? new Date(selectedOrder.orderDate).toLocaleDateString() : ''}`}
            </p>
          </div>

          <SheetScrollArea className="p-6 flex-1">
            <div className="space-y-6">
              {drawerMode === 'view' && selectedOrder ? (
                <>
                  <DrawerSection title="Header Details">
                    <div className="grid grid-cols-2 gap-4">
                      <ReadOnlyField label="PO Number" value={selectedOrder.orderNumber} isMono />
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Status</Label>
                        <div>{getStatusBadge(selectedOrder.status)}</div>
                      </div>
                      <ReadOnlyField label="Supplier" value={selectedOrder.supplier?.name || '—'} />
                      <ReadOnlyField
                        label="Order Date"
                        value={new Date(selectedOrder.orderDate).toLocaleDateString()}
                      />
                      {selectedOrder.notes && (
                        <div className="col-span-2">
                          <ReadOnlyField label="Notes" value={selectedOrder.notes} />
                        </div>
                      )}
                    </div>
                  </DrawerSection>

                  <DrawerSection title="Order Line Items">
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Medicine</th>
                            <th className="py-2.5 px-3 text-center">Ordered</th>
                            <th className="py-2.5 px-3 text-center">Received</th>
                            <th className="py-2.5 px-3 text-center">Remaining</th>
                            <th className="py-2.5 px-3 text-right">Unit Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedOrder.items?.map((item) => {
                            const rem = item.orderedQuantity - item.receivedQuantity;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {item.medicine?.name || 'Medicine'}
                                </td>
                                <td className="py-2 px-3 text-center font-medium text-slate-700">
                                  {item.orderedQuantity}
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-emerald-700">
                                  {item.receivedQuantity}
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-amber-700">
                                  {rem}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600 font-mono">
                                  ₹{item.unitCost.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </DrawerSection>
                </>
              ) : (
                <>
                  {/* Create / Edit Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">
                        Supplier <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select active supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">
                        Order Date <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={poOrderDate}
                        onChange={(e) => setPoOrderDate(e.target.value)}
                        className="h-10 text-sm font-mono"
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">Notes</Label>
                      <Input
                        value={poNotes}
                        onChange={(e) => setPoNotes(e.target.value)}
                        placeholder="Optional remarks or delivery instructions"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>

                  {/* Line items table */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Ordered Medicines ({poItems.length})
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItemRow}
                        className="h-8 px-2.5 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                      </Button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Medicine</th>
                            <th className="py-2 px-3 w-28 text-center">Ordered Qty</th>
                            <th className="py-2 px-3 w-28 text-right">Unit Cost (₹)</th>
                            <th className="py-2 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {poItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-2">
                                <Select
                                  value={item.medicineId}
                                  onValueChange={(val) => handleItemChange(idx, 'medicineId', val)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select medicine" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {medicines.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>
                                        {m.name} ({m.unit})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.orderedQuantity}
                                  onChange={(e) =>
                                    handleItemChange(idx, 'orderedQuantity', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="h-8 text-center text-xs font-bold"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(e) =>
                                    handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                                  }
                                  className="h-8 text-right text-xs font-mono"
                                />
                              </td>
                              <td className="p-2 text-center">
                                {poItems.length > 1 && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                                    onClick={() => handleRemoveItemRow(idx)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetScrollArea>

          <DrawerFooterActions>
            {drawerMode === 'view' ? (
              <div className="flex items-center justify-between w-full">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
                {selectedOrder && (selectedOrder.status === 'Ordered' || selectedOrder.status === 'Partially Received') && (
                  <Button
                    onClick={() => {
                      const po = selectedOrder;
                      setDrawerOpen(false);
                      setReceiveTargetOrder(po);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    <PackageCheck className="w-4 h-4 mr-1.5" /> Receive Goods
                  </Button>
                )}
                {selectedOrder && selectedOrder.status === 'Draft' && (
                  <Button
                    onClick={() => {
                      setDrawerMode('edit');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" /> Edit Draft
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePO}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  {isSaving ? 'Saving...' : drawerMode === 'create' ? 'Save as Draft' : 'Update PO'}
                </Button>
              </>
            )}
          </DrawerFooterActions>
        </SheetContent>
      </Sheet>

      {/* Status Transition Confirmation Modal (Ordered or Cancelled) */}
      <Dialog open={!!confirmStatusAction} onOpenChange={(open) => !open && setConfirmStatusAction(null)}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {confirmStatusAction?.targetStatus === 'Ordered' ? 'Place Purchase Order?' : 'Cancel Purchase Order?'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 pt-2 leading-relaxed">
              {confirmStatusAction?.targetStatus === 'Ordered' ? (
                <>
                  Placing <strong className="text-slate-800">{confirmStatusAction.po.orderNumber}</strong> marks it as ordered from the supplier.
                  <br /><br />
                  Note: Medicine stock will NOT increase until goods are physically received.
                </>
              ) : (
                <>
                  Are you sure you want to cancel <strong className="text-slate-800">{confirmStatusAction?.po.orderNumber}</strong>?
                  <br /><br />
                  This action cannot be undone. Historical records will remain.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={isUpdatingStatus}>
                Back
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmStatusTransition}
              disabled={isUpdatingStatus}
              className={
                confirmStatusAction?.targetStatus === 'Ordered'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white font-semibold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
              }
            >
              {isUpdatingStatus ? 'Updating...' : confirmStatusAction?.targetStatus === 'Ordered' ? 'Yes, Place Order' : 'Yes, Cancel PO'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
