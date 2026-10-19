import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { openWhatsAppChat } from '../../lib/shareHelper';

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.889-9.885 9.889m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
    </svg>
  );
}

export interface WhatsAppActionButtonProps {
  type: 'APPOINTMENT_CONFIRMATION' | 'APPOINTMENT_REMINDER' | 'PAYMENT_RECEIPT' | 'INVOICE' | 'PRESCRIPTION';
  entityType?: 'APPOINTMENT' | 'PAYMENT' | 'VISIT';
  entityId?: string;
  patientId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  purposeDescription?: string;
  paymentOwner?: string; // "DOCTOR" | "RECEPTION"
  preferredCommunicationChannel?: 'AUTO' | 'WHATSAPP' | 'SMS' | 'EMAIL';
  whatsappAvailable?: boolean | null;
  variables?: Record<string, any>;
  variant?: 'button' | 'icon' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
  disabled?: boolean;
  title?: string;
}

function formatDisplayPhone(rawPhone?: string | null): string {
  if (!rawPhone) return 'Phone not provided';
  const clean = rawPhone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return rawPhone;
}

export function WhatsAppActionButton(props: WhatsAppActionButtonProps) {
  const {
    type,
    entityId,
    recipientName,
    recipientPhone,
    paymentOwner,
    preferredCommunicationChannel = 'AUTO',
    whatsappAvailable,
    variables,
    variant = 'button',
    size,
    className,
    label,
    disabled = false,
  } = props;

  const { currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [shareData, setShareData] = useState<{
    pdfDownloadUrl?: string;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Security Check: Receptionists are strictly forbidden from viewing or sending payment-sensitive
  // notifications for doctor-owned visits.
  const isReceptionist = currentUser?.role === 'Receptionist';
  const isPaymentSensitive = type === 'PAYMENT_RECEIPT' || type === 'INVOICE';
  const isBlocked = isReceptionist && paymentOwner === 'DOCTOR' && isPaymentSensitive;

  const formattedPhone = formatDisplayPhone(recipientPhone);
  const isOverride = preferredCommunicationChannel === 'SMS' || preferredCommunicationChannel === 'EMAIL';
  const isWhatsappUnavailable = whatsappAvailable === false;

  const isDocumentType = type === 'PAYMENT_RECEIPT' || type === 'INVOICE' || type === 'PRESCRIPTION';
  const documentApiType =
    type === 'PAYMENT_RECEIPT' ? 'receipt' : type === 'INVOICE' ? 'invoice' : 'prescription';

  const docBadgeLabel =
    type === 'PAYMENT_RECEIPT'
      ? 'Receipt'
      : type === 'INVOICE'
      ? 'Invoice'
      : type === 'PRESCRIPTION'
      ? 'Prescription'
      : 'Appointment';

  const [loadError, setLoadError] = useState<string | null>(null);

  // Load document share link and draft message when modal opens
  const fetchShareData = React.useCallback(() => {
    if (!isDocumentType || !entityId) {
      const appointmentDate = variables?.date || 'your scheduled date';
      const appointmentTime = variables?.time || '';
      const apptMsg = `*Rafi Dental Clinic*\n\nDear *${recipientName}*,\nThis is to confirm your dental appointment with Dr. Rafi.\n\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n\n37, Dr.Venkatraman St, Gobichettipalayam\nPh: 094430 23648`;
      setShareData({ message: apptMsg });
      setLoadError(null);
      return;
    }

    setIsLoadingDetails(true);
    setLoadError(null);
    const paymentQuery = variables?.paymentId ? `?paymentId=${encodeURIComponent(variables.paymentId)}` : '';
    api.get<{
      pdfDownloadUrl: string;
      message: string;
    }>(`/api/documents/share-link/${documentApiType}/${entityId}${paymentQuery}`)
      .then((res) => {
        setShareData(res);
        setLoadError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch document share link:', err);
        setLoadError(err.message || 'Failed to generate download link. Please click Retry.');
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  }, [isDocumentType, entityId, variables?.paymentId, variables?.date, variables?.time, documentApiType, recipientName]);

  useEffect(() => {
    if (modalOpen) {
      fetchShareData();
    }
  }, [modalOpen, fetchShareData]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setModalOpen(true);
  };

  const handleOpenWhatsApp = () => {
    const textToSend = shareData?.message || `Hello ${recipientName}, this is regarding your visit at Rafi Dental Clinic.`;
    openWhatsAppChat(recipientPhone, textToSend);
    toast.success('Opening WhatsApp...');
    setModalOpen(false);
  };

  const handleCopy = () => {
    const textToCopy = shareData?.pdfDownloadUrl || shareData?.message || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <Button
          type="button"
          size={size || 'icon'}
          disabled={disabled}
          onClick={handleOpenModal}
          title={label || 'Send via WhatsApp'}
          aria-label={label || 'Send via WhatsApp'}
          className={cn(
            'h-8 w-8 rounded-lg shadow-xs transition-colors',
            'bg-emerald-600 hover:bg-emerald-700 text-white',
            'focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <WhatsAppIcon className="w-4 h-4 fill-current text-white" />
        </Button>
      );
    }

    if (variant === 'outline') {
      return (
        <Button
          type="button"
          variant="outline"
          size={size || 'sm'}
          disabled={disabled}
          onClick={handleOpenModal}
          title={props.title || label || 'WhatsApp'}
          className={cn(
            'border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium shadow-xs transition-colors gap-1.5',
            disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent border-slate-300 text-slate-400 hover:text-slate-400 shadow-none',
            className
          )}
        >
          <WhatsAppIcon className={cn("w-4 h-4 fill-current", disabled ? "text-slate-400" : "text-emerald-600")} />
          <span>{label || 'WhatsApp'}</span>
        </Button>
      );
    }

    if (variant === 'ghost') {
      return (
        <Button
          type="button"
          variant="ghost"
          size={size || 'sm'}
          disabled={disabled}
          onClick={handleOpenModal}
          className={cn(
            'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium transition-colors gap-1.5',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <WhatsAppIcon className="w-4 h-4 fill-current text-emerald-600" />
          <span>{label || 'WhatsApp'}</span>
        </Button>
      );
    }

    return (
      <Button
        type="button"
        size={size || 'sm'}
        disabled={disabled}
        onClick={handleOpenModal}
        className={cn(
          'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs rounded-lg transition-colors gap-1.5',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <WhatsAppIcon className="w-4 h-4 fill-current text-white" />
        <span>{label || 'WhatsApp'}</span>
      </Button>
    );
  };

  if (isBlocked) {
    return null;
  }

  return (
    <>
      {renderTrigger()}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] max-w-xl md:max-w-2xl bg-white rounded-2xl p-0 overflow-hidden shadow-2xl border border-slate-200 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 text-left border-b border-slate-100">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                <WhatsAppIcon className="w-4 h-4 fill-current text-emerald-600" />
              </span>
              <span>Share {docBadgeLabel} via WhatsApp</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 pt-1">
              Send the {docBadgeLabel.toLowerCase()} download link directly to the patient's WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-3.5">
            {/* Patient Details Card */}
            <div className="p-3.5 sm:p-4 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 text-sm sm:text-base leading-tight truncate">{recipientName || 'Patient'}</div>
                <div className="text-slate-500 font-mono text-xs sm:text-sm mt-0.5">{formattedPhone}</div>
              </div>
              <span className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-semibold border border-emerald-200/80 shadow-2xs shrink-0 whitespace-nowrap">
                {docBadgeLabel}
              </span>
            </div>

            {/* Message Preview Box - WhatsApp Style Chat Bubble */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 px-0.5">
                <span className="font-semibold text-slate-700">Message Preview</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1.5 transition-colors text-xs sm:text-sm shrink-0 whitespace-nowrap px-2 py-0.5 rounded-md hover:bg-emerald-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Message'}</span>
                </button>
              </div>

              {isLoadingDetails ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                  Generating download link...
                </div>
              ) : loadError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 space-y-2">
                  <p className="font-medium">{loadError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchShareData}
                    className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    Retry Generating Link
                  </Button>
                </div>
              ) : (
                <div className="bg-[#E7FCE8] border border-[#C8EFCB] rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed max-h-60 overflow-y-auto font-sans shadow-2xs whitespace-pre-wrap select-all break-words [overflow-wrap:anywhere] break-all">
                  {shareData?.message}
                </div>
              )}
            </div>

            {/* Subtle Channel Notice if Applicable */}
            {isOverride && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-2xs sm:text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold text-amber-800">Note:</span> Patient preference is set to {preferredCommunicationChannel}.
              </div>
            )}

            {isWhatsappUnavailable && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-2xs sm:text-xs text-rose-800 leading-relaxed">
                <span className="font-semibold text-rose-700">Notice:</span> Patient profile indicates WhatsApp may be unavailable.
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-end gap-3 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 text-slate-700 border-slate-300 hover:bg-slate-100 shrink-0 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={isLoadingDetails || !shareData?.pdfDownloadUrl}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 gap-2 shadow-xs shrink-0 whitespace-nowrap"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current text-white shrink-0" />
              <span>Open in WhatsApp</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
