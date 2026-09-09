import React, { useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { CheckCircle2, PackageCheck, AlertCircle } from 'lucide-react';
import type { PurchaseOrder } from '../../types/domain';

interface ReceiveGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
  onSuccess?: () => void;
}

export function ReceiveGoodsDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSuccess
}: ReceiveGoodsDialogProps) {
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number | ''>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optional Supplier Bill Capture state (Correction 1)
  const [captureBill, setCaptureBill] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [billAmount, setBillAmount] = useState<number | ''>('');
  const [billNotes, setBillNotes] = useState('');

  // Initialize or reset quantities whenever dialog opens
  React.useEffect(() => {
    if (purchaseOrder && open) {
      const initial: Record<string, number | ''> = {};
      let expectedCost = 0;
      purchaseOrder.items.forEach((item) => {
        const remaining = item.orderedQuantity - item.receivedQuantity;
        // Default to remaining quantity if > 0
        initial[item.id] = remaining > 0 ? remaining : '';
        if (remaining > 0) {
          expectedCost += remaining * (item.unitCost || 0);
        }
      });
      setReceiveQuantities(initial);
      setCaptureBill(false);
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setBillAmount(expectedCost > 0 ? expectedCost : '');
      setBillNotes('');
      setErrorMsg(null);
    }
  }, [purchaseOrder, open]);

  // Recalculate suggested bill amount when receive quantities change
  React.useEffect(() => {
    if (purchaseOrder && captureBill && billAmount === '') {
      let sum = 0;
      purchaseOrder.items.forEach(item => {
        const qty = receiveQuantities[item.id];
        if (typeof qty === 'number' && qty > 0) {
          sum += qty * (item.unitCost || 0);
        }
      });
      if (sum > 0) setBillAmount(sum);
    }
  }, [receiveQuantities, captureBill, purchaseOrder, billAmount]);

  if (!purchaseOrder) return null;

  const handleQtyChange = (itemId: string, value: string, max: number) => {
    setErrorMsg(null);
    if (value === '') {
      setReceiveQuantities((prev) => ({ ...prev, [itemId]: '' }));
      return;
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setReceiveQuantities((prev) => ({ ...prev, [itemId]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Build payload of items where receiveQuantity > 0
    const itemsToSubmit: { itemId: string; receiveQuantity: number }[] = [];

    for (const item of purchaseOrder.items) {
      const remaining = item.orderedQuantity - item.receivedQuantity;
      const qty = receiveQuantities[item.id];

      if (typeof qty === 'number' && qty > 0) {
        if (!Number.isInteger(qty)) {
          setErrorMsg(`Quantity for ${item.medicine?.name || 'Item'} must be a whole number.`);
          return;
        }
        if (qty > remaining) {
          setErrorMsg(
            `Cannot receive ${qty} for ${item.medicine?.name || 'Item'}. Remaining unreceived is only ${remaining}.`
          );
          return;
        }
        itemsToSubmit.push({ itemId: item.id, receiveQuantity: qty });
      }
    }

    if (itemsToSubmit.length === 0) {
      setErrorMsg('Please enter at least one positive quantity to receive.');
      return;
    }

    // Optional Bill Validation (Correction 1 & 4)
    let billPayload: any = undefined;
    if (captureBill) {
      if (!invoiceNumber.trim()) {
        setErrorMsg('Please enter the Supplier Invoice / Bill Number.');
        return;
      }
      const numAmount = typeof billAmount === 'number' ? billAmount : parseFloat(String(billAmount));
      if (isNaN(numAmount) || numAmount <= 0) {
        setErrorMsg('Please enter a valid positive Bill Amount.');
        return;
      }
      billPayload = {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || undefined,
        amount: numAmount,
        notes: billNotes.trim() || undefined
      };
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<any>(`/api/purchase-orders/${purchaseOrder.id}/receive`, {
        items: itemsToSubmit,
        ...(billPayload ? { bill: billPayload } : {})
      });

      if (res.success || res.data) {
        toast.success(
          billPayload 
            ? 'Goods received and Supplier Bill created successfully.' 
            : 'Goods received successfully. Stock updated.'
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        setErrorMsg(res.error || 'Failed to receive goods');
      }
    } catch (err: any) {
      console.error('Goods receive error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Error occurred while receiving goods');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="mb-1">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <DialogTitle className="text-xl font-bold text-slate-900">Receive Goods (Stock In)</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 pt-1">
            Physical stock delivery for Purchase Order <strong className="text-slate-800 font-mono">{purchaseOrder.orderNumber}</strong>.
            Received items will atomically increase medicine stock.
          </DialogDescription>
        </DialogHeader>

        {/* PO Header Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block">Supplier</span>
            <span className="font-bold text-slate-800 truncate block">{purchaseOrder.supplier?.name || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block">Order Date</span>
            <span className="font-medium text-slate-700 block">
              {new Date(purchaseOrder.orderDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider block">Current Status</span>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-medium text-[11px] mt-0.5">
              {purchaseOrder.status}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Medicine / Item</th>
                  <th className="py-2.5 px-3 text-center">Ordered</th>
                  <th className="py-2.5 px-3 text-center">Received</th>
                  <th className="py-2.5 px-3 text-center">Remaining</th>
                  <th className="py-2.5 px-3 text-right">Receive Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrder.items.map((item) => {
                  const remaining = item.orderedQuantity - item.receivedQuantity;
                  const isFullyReceived = remaining <= 0;
                  const currentInput = receiveQuantities[item.id];

                  return (
                    <tr key={item.id} className={isFullyReceived ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/30'}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{item.medicine?.name || 'Medicine'}</div>
                        <div className="text-[11px] text-slate-500">{item.medicine?.unit || ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                        {item.orderedQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-emerald-700">
                        {item.receivedQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                        {remaining}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isFullyReceived ? (
                          <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Received
                          </span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            value={currentInput !== undefined ? currentInput : ''}
                            onChange={(e) => handleQtyChange(item.id, e.target.value, remaining)}
                            className="w-24 h-8 text-right font-bold text-slate-900 ml-auto"
                            placeholder="0"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Optional Supplier Bill Capture Accordion/Toggle (Correction 1) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Capture Supplier Bill / Invoice</span>
                <span className="text-[11px] text-slate-500">Optional. Record physical bill details if delivered with goods.</span>
              </div>
              <Button
                type="button"
                variant={captureBill ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCaptureBill(!captureBill)}
                className="text-xs font-semibold h-7"
              >
                {captureBill ? 'Discard Bill Entry' : '+ Add Supplier Bill'}
              </Button>
            </div>

            {captureBill && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Invoice / Bill Number <span className="text-rose-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-9842"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Actual Bill Amount (₹) <span className="text-rose-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="h-8 text-xs font-mono font-bold bg-white"
                  />
                  <p className="text-[10px] text-slate-400">Can differ from PO amount if supplier discounted or modified delivery.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Invoice Notes</Label>
                  <Input
                    type="text"
                    placeholder="Optional notes or batch details"
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              {isSubmitting ? 'Receiving Stock...' : 'Confirm Goods Receive'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
