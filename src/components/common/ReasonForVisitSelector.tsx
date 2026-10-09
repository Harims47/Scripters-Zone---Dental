import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  VISIT_REASONS,
  parseReasonForVisit,
  formatReasonForVisit,
  type ReasonCategory,
} from '../../constants/visitReasons';

interface ReasonForVisitSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export const ReasonForVisitSelector: React.FC<ReasonForVisitSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Reason for Visit',
  showLabel = true,
}) => {
  const { primary, sub } = useMemo(() => parseReasonForVisit(value), [value]);

  // Find the selected category definition
  const selectedCategory = useMemo(() => {
    return VISIT_REASONS.find(
      (cat: ReasonCategory) => cat.label.toLowerCase() === primary.toLowerCase()
    );
  }, [primary]);

  const hasSubReasons = Boolean(selectedCategory?.subReasons && selectedCategory.subReasons.length > 0);

  // Check if current primary is a legacy or custom value not in the standard list
  const isCustomOrLegacy = useMemo(() => {
    if (!primary) return false;
    return !VISIT_REASONS.some(
      (cat: ReasonCategory) => cat.label.toLowerCase() === primary.toLowerCase()
    );
  }, [primary]);

  const handlePrimaryChange = (newPrimary: string) => {
    const targetCat = VISIT_REASONS.find(
      (c: ReasonCategory) => c.label.toLowerCase() === newPrimary.toLowerCase()
    );

    if (targetCat?.subReasons && targetCat.subReasons.length > 0) {
      // Retain or reset sub-reason
      const newSub = targetCat.subReasons.includes(sub) ? sub : '';
      onChange(formatReasonForVisit(targetCat.label, newSub));
    } else {
      onChange(newPrimary);
    }
  };

  const handleSubChange = (newSub: string) => {
    onChange(formatReasonForVisit(primary || selectedCategory?.label || '', newSub));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Reason Dropdown */}
      <div>
        {showLabel && (
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            {label}
          </label>
        )}
        <Select
          disabled={disabled}
          value={primary || undefined}
          onValueChange={handlePrimaryChange}
        >
          <SelectTrigger className="w-full bg-white border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
            <SelectValue placeholder="Select Reason for Visit" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {/* If legacy/custom value exists, preserve it at top */}
            {isCustomOrLegacy && (
              <SelectItem value={primary}>{primary} (Existing)</SelectItem>
            )}

            {/* Standalone Reasons Group */}
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              General Complaints
            </div>
            {VISIT_REASONS.filter((r: ReasonCategory) => !r.subReasons).map((reason: ReasonCategory) => (
              <SelectItem key={reason.label} value={reason.label}>
                {reason.label}
              </SelectItem>
            ))}

            {/* Multi-step Procedure Categories */}
            <div className="px-2 py-1.5 text-xs font-semibold text-teal-600 uppercase tracking-wider border-t border-slate-100 mt-1 pt-1.5">
              Procedures & Stages
            </div>
            {VISIT_REASONS.filter((r: ReasonCategory) => Boolean(r.subReasons)).map((reason: ReasonCategory) => (
              <SelectItem key={reason.label} value={reason.label}>
                {reason.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub-Reason Dropdown (Shown conditionally when primary has sub-reasons) */}
      {hasSubReasons && selectedCategory?.subReasons && (
        <div className="pt-1 transition-all duration-200 ease-in-out">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">
              Sub-Reason for Visit
            </label>
            <span className="text-[11px] font-medium px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              {selectedCategory.label} Stage
            </span>
          </div>
          <Select
            disabled={disabled}
            value={sub || undefined}
            onValueChange={handleSubChange}
          >
            <SelectTrigger className="w-full bg-white border-teal-200 focus:border-teal-400 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed">
              <SelectValue placeholder={`Select ${selectedCategory.label} Sub-Reason...`} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {selectedCategory.subReasons.map((subItem: string) => (
                <SelectItem key={subItem} value={subItem}>
                  {subItem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
