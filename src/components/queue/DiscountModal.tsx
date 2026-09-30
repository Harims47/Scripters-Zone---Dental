import { useState, useEffect } from 'react';
import { Tag, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  visitId: string;
  consultationFee: number;
  treatmentFee: number;
  medicineCost: number;
  currentDiscount: number;
  currentDiscountReason?: string | null;
  onApplyDiscount: (discount: number, reason: string) => Promise<boolean | void>;
}

const PRESET_REASONS = [
  'Patient Request at Reception',
  'Doctor Discretion / Courtesy',
  'Senior Citizen / Child',
  'Family / Staff Referral',
  'Special Consideration'
];

export function DiscountModal({
  isOpen,
  onClose,
  patientName,
  patientId,
  visitId: _visitId,
  consultationFee,
  treatmentFee,
  medicineCost,
  currentDiscount,
  currentDiscountReason,
  onApplyDiscount
}: DiscountModalProps) {
  const subtotal = Math.round((consultationFee || 0) + (treatmentFee || 0) + (medicineCost || 0));

  const [discountAmount, setDiscountAmount] = useState<string>(
    currentDiscount > 0 ? String(currentDiscount) : ''
  );
  const [selectedReason, setSelectedReason] = useState<string>(
    currentDiscountReason || PRESET_REASONS[0]
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDiscountAmount(currentDiscount > 0 ? String(currentDiscount) : '');
      setSelectedReason(currentDiscountReason || PRESET_REASONS[0]);
      setCustomNote('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, currentDiscount, currentDiscountReason]);

  const numericDiscount = Math.max(0, Number(discountAmount) || 0);
  const finalPayable = Math.max(0, subtotal - numericDiscount);

  const handlePresetAmount = (amount: number) => {
    const capped = Math.min(amount, subtotal);
    setDiscountAmount(String(capped));
    setErrorMessage('');
  };

  const handlePercentagePreset = (pct: number) => {
    const val = Math.round((subtotal * pct) / 100);
    setDiscountAmount(String(val));
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (numericDiscount > subtotal) {
      setErrorMessage(`Discount cannot exceed the total bill amount of ₹${subtotal}.`);
      return;
    }

    const finalReason = customNote.trim()
      ? `${selectedReason} - ${customNote.trim()}`
      : selectedReason;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onApplyDiscount(numericDiscount, finalReason);
      onClose();
    } catch (err: any) {
      console.error('Failed to apply discount:', err);
      setErrorMessage(err.message || 'Failed to save discount. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setIsSubmitting(true);
    try {
      await onApplyDiscount(0, '');
      onClose();
    } catch (err: any) {
      console.error('Failed to remove discount:', err);
      setErrorMessage('Failed to remove discount.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-5 gap-4 bg-white rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700">
              <Tag className="w-4 h-4" />
            </span>
            Apply Doctor Discount
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Deduct discount for <strong className="text-slate-800">{patientName}</strong> ({patientId}). The discounted total will update immediately at the Reception Desk.
          </DialogDescription>
        </DialogHeader>

        {/* 1. Clinical Fee Breakdown Card */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Original Bill Breakdown
          </span>
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Consultation Fee:</span>
              <span className="font-semibold text-slate-800">₹{consultationFee || 0}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Treatment Fee:</span>
              <span className="font-semibold text-slate-800">₹{treatmentFee || 0}</span>
            </div>
            {medicineCost > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Medicine Cost:</span>
                <span className="font-semibold text-slate-800">₹{medicineCost}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
              <span>Subtotal:</span>
              <span>₹{subtotal}</span>
            </div>
          </div>
        </div>

        {/* 2. Quick Discount Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Quick Discount Presets</label>
          <div className="flex flex-wrap gap-1.5">
            {[100, 200, 300, 500].filter(amt => amt <= subtotal).map(amt => (
              <button
                type="button"
                key={amt}
                onClick={() => handlePresetAmount(amt)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  numericDiscount === amt
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                ₹{amt}
              </button>
            ))}
            {[10, 20].map(pct => (
              <button
                type="button"
                key={`pct-${pct}`}
                onClick={() => handlePercentagePreset(pct)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-amber-50 hover:border-amber-300 transition-all"
              >
                {pct}% Off
              </button>
            ))}
            {subtotal > 0 && (
              <button
                type="button"
                onClick={() => handlePresetAmount(subtotal)}
                className="text-xs px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 transition-all"
              >
                100% Waive
              </button>
            )}
          </div>
        </div>

        {/* 3. Discount Amount Input & Reason */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="discountInput" className="text-xs font-bold text-slate-700 block mb-1">
              Discount Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <Input
                id="discountInput"
                type="number"
                min="0"
                max={subtotal}
                step="10"
                placeholder="Enter discount amount"
                className="pl-7 h-9 text-sm font-semibold text-slate-900 bg-white"
                value={discountAmount}
                onChange={(e) => {
                  setDiscountAmount(e.target.value);
                  setErrorMessage('');
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Reason / Justification
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map(reason => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    selectedReason === reason
                      ? 'bg-slate-900 text-white border-slate-900 font-medium'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              type="text"
              placeholder="Optional notes or custom detail..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="h-8 text-xs bg-white border-slate-200"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4. Live Net Payable Summary */}
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Updated Bill at Reception
            </span>
            <span className="text-xs text-slate-600">
              Subtotal: ₹{subtotal} • Discount: -₹{numericDiscount}
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-teal-700">
              ₹{finalPayable}
            </span>
            <span className="text-[10px] text-slate-400 block">Net Payable</span>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 flex-row justify-between items-center">
          <div>
            {currentDiscount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={handleRemoveDiscount}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 h-8"
              >
                Remove Discount
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white h-8 px-4"
            >
              {isSubmitting ? 'Saving...' : 'Apply Discount'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
