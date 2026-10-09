export interface ReasonCategory {
  label: string;
  subReasons?: string[];
}

/**
 * Standard Reason for Visit catalog.
 * Single-level general complaints and multi-stage dental procedures with sub-reasons.
 */
export const VISIT_REASONS: ReasonCategory[] = [
  // 1. Standalone Clinical Reasons
  { label: 'General Checkup' },
  { label: 'Pain' },
  { label: 'Scaling' },
  { label: 'Decay' },
  { label: 'Mobility' },
  { label: 'Extraction' },
  { label: 'Missing Teeth' },
  { label: 'Anterior Filling' },
  { label: 'Dislodged Filling' },
  { label: 'Old Fixing' },
  { label: 'Scan' },
  { label: 'Ortho' },
  { label: 'Implant' },
  { label: 'Trauma' },
  { label: 'Sensitivity' },
  { label: 'Ulcer' },
  { label: 'Flap' },
  { label: 'Swelling' },

  // 2. Procedure Categories with Sub-reasons / Stages
  {
    label: 'RCT',
    subReasons: [
      'Opening',
      'Filling',
      'Post',
      'Cutting',
      'Scaning',
      'Fixing',
    ],
  },
  {
    label: 'CD',
    subReasons: [
      'Impression/Scan',
      'Secondary',
      'Bite',
      'Trial',
      'Delivery',
    ],
  },
  {
    label: 'PD',
    subReasons: [
      'Impression/Scan',
      'Bite',
      'Trial',
      'Delivery',
    ],
  },
  {
    label: 'Pulpectomy',
    subReasons: [
      'Opening',
      'Filling',
      'Permanent Filling',
    ],
  },
];

/**
 * Helper to parse a combined reason string (e.g. "RCT - Opening") into primary and sub-reason.
 */
export function parseReasonForVisit(value: string | undefined | null): {
  primary: string;
  sub: string;
} {
  if (!value || typeof value !== 'string') return { primary: '', sub: '' };

  const trimmed = value.trim();

  // If already formatted as "Primary - Sub"
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    const primary = parts[0].trim();
    const sub = parts.slice(1).join(' - ').trim();
    return { primary, sub };
  }

  // Check if it matches a known category directly
  const matched = VISIT_REASONS.find(r => r.label.toLowerCase() === trimmed.toLowerCase());
  if (matched) {
    return { primary: matched.label, sub: '' };
  }

  return { primary: trimmed, sub: '' };
}

/**
 * Helper to combine primary and optional sub-reason into a clean unified storage string.
 */
export function formatReasonForVisit(primary: string, sub?: string): string {
  if (!primary || !primary.trim()) return '';
  if (!sub || !sub.trim()) return primary.trim();
  return `${primary.trim()} - ${sub.trim()}`;
}
