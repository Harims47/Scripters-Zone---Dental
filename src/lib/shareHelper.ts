/**
 * Helper utilities for Zero-Budget WhatsApp and Native Device Sharing.
 * Fully compatible with Desktop PCs (WhatsApp Web), Laptops, and Tablets (WhatsApp App).
 */

/**
 * Normalizes phone numbers for WhatsApp click-to-chat links.
 * Automatically adds India country code '91' if a 10-digit mobile number is passed.
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If 10 digits (standard Indian mobile number without country code), prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If starts with 0 and length 11 (e.g., 09443023648), strip 0 and prepend 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

/**
 * Opens WhatsApp click-to-chat directly.
 * Opens in a new window/tab:
 * - On PC/Laptop: Launches WhatsApp Web or Desktop application.
 * - On Mobile/Tablet: Launches native WhatsApp app.
 */
export function openWhatsAppChat(phone: string, text: string): void {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Checks whether the browser and operating system support native file sharing.
 * Highly supported on Tablets (iPads / Android Tabs) and Mobile phones.
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Triggers native device sharing tray (e.g., WhatsApp, Email, AirDrop).
 */
export async function shareViaDevice(options: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share(options);
    return true;
  } catch (err: any) {
    // User cancelled share sheet
    if (err.name === 'AbortError') {
      return false;
    }
    console.error('Error sharing via device:', err);
    throw err;
  }
}
