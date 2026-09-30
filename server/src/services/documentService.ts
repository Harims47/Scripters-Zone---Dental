import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { PDF_THEME } from './pdf/pdfTheme';
import {
  ClinicBranding,
  getClinicBranding,
  formatCurrency,
  formatHumanDate,
  resolveLogoPath,
  cleanDoctorName,
  numberToWordsIndian,
  formatStaffRoleOrName
} from './pdf/clinicBranding';
import {
  initPDFDocument,
  renderClinicHeader,
  renderDocumentTitle,
  renderDocumentMetadata,
  renderPatientInformation,
  renderUnifiedInfoCard,
  renderSectionHeader,
  renderFinancialSummary,
  renderSignatureBlock,
  finalizeDocumentWithFooters
} from './pdf/pdfComponents';

export { resolveLogoPath };

export interface PrescriptionData {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  patientName: string;
  patientId?: string; // accepted in data payload, NEVER exposed on PDF
  patientPhone?: string;
  patientAge?: number | string;
  patientGender?: string;
  visitDate: string;
  visitId?: string; // accepted in data payload, NEVER exposed on PDF
  doctorName?: string;
  doctorRegNo?: string;
  diagnosis?: string;
  notes?: string;
  items: {
    medicineName: string;
    form?: string;
    unit?: string;
    quantity: number;
    dosage?: string;
    duration?: string;
    frequency?: string;
    instructions?: string;
  }[];
}

export interface ReceiptData {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  patientId?: string; // NEVER exposed on PDF
  patientPhone?: string;
  visitId?: string;   // NEVER exposed on PDF
  visitDate: string;
  consultationFee: number;
  treatmentFee?: number;
  medicineCost: number;
  totalAmount: number;
  amountPaid: number;
  priorPaid?: number;
  cumulativePaid?: number;
  balanceDue?: number;
  isPartial?: boolean;
  paymentNumber?: number;
  totalPaymentsCount?: number;
  paymentMethod: string;
  paymentDate: string;
  paymentStatus: string;
  receiptNo: string;
  receivedBy: string;
  doctorName?: string;
  paymentNotes?: string;
}

export interface InvoiceData {
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  invoiceNumber: string;
  visitId?: string;   // NEVER exposed on PDF
  visitDate: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  patientId?: string; // NEVER exposed on PDF
  patientPhone?: string;
  doctorName?: string;
  consultationFee: number;
  treatmentFee: number;
  medicineCost: number;
  subtotal?: number;
  roundOff?: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  treatments?: {
    name: string;
    category?: string;
    notes?: string;
    fee?: number;
  }[];
  medicines?: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  payments?: {
    receiptNo: string;
    date: string;
    method: string;
    amount: number;
  }[];
}

export interface PurchaseOrderData {
  clinicName?: string;
  orderNumber: string;
  orderDate: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  items: {
    medicineName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  expectedDate?: string;
  notes?: string;
}

export interface ReimbursementPDFData {
  documentNumber: string;
  documentDate: string;
  subject: string;
  content: string;
  treatmentDescription?: string | null;
  amount?: number | null;
  patientName: string;
  patientAge?: number | string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  doctorName?: string | null;
  doctorRegNo?: string | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. PRESCRIPTION PDF GENERATOR
// ══════════════════════════════════════════════════════════════════════════
export const generatePrescriptionPDF = async (data: PrescriptionData): Promise<Buffer> => {
  const branding = getClinicBranding({
    name: data.clinicName,
    address: data.clinicAddress,
    phone: data.clinicPhone
  });

  // Generate Google Maps QR Code for clinic location
  const clinicQuery = `${branding.name}, ${branding.address || 'Gobichettipalayam'}`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(clinicQuery)}`;
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(mapsUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#1E3A8A', // Brand navy color
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Failed to generate clinic QR code for prescription:', err);
  }

  return new Promise((resolve, reject) => {
    const doc = initPDFDocument({ size: 'A4', margin: 0 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const margin = 40;
    let currentY = renderClinicHeader(doc, branding, { margin });

    // Document Title Banner with Rx Accent Badge
    currentY = renderDocumentTitle(
      doc,
      'MEDICAL PRESCRIPTION',
      undefined,
      { text: 'Rx', color: PDF_THEME.colors.primaryTeal, bg: PDF_THEME.colors.headerBg },
      currentY,
      margin
    );
    currentY += 8;

    const docName = data.doctorName && data.doctorName !== 'Doctor' && data.doctorName !== 'N/A'
      ? cleanDoctorName(data.doctorName)
      : 'Dr. N MOHAMED RAFI B D S';

    // Unified Info Card — strictly authentic clinical metadata (no dummy departments or fabricated values)
    const patientItems = [
      { label: 'Patient Name :', value: data.patientName },
      { label: 'Age :', value: data.patientAge ? `${data.patientAge} Yrs` : '—' },
      { label: 'Gender :', value: data.patientGender || '—' },
      { label: 'Phone No :', value: data.patientPhone || '—' }
    ];

    const metaItems: { label: string; value: string }[] = [
      { label: 'Prescription Date :', value: formatHumanDate(data.visitDate) },
      { label: 'Doctor In-Charge :', value: docName }
    ];

    if (data.doctorRegNo) {
      metaItems.push({ label: 'Doctor Reg. No :', value: data.doctorRegNo });
    }

    if (data.diagnosis && data.diagnosis.trim()) {
      metaItems.push({ label: 'Chief Complaint :', value: data.diagnosis.trim() });
    }

    currentY = renderUnifiedInfoCard(doc, {
      leftItems: patientItems,
      rightItems: metaItems,
      y: currentY,
      margin
    });
    currentY += 24;

    // Prescribed Medicines Section Header
    currentY = renderSectionHeader(doc, 'PRESCRIBED MEDICINES (Rx)', currentY, margin);
    currentY += 6;

    const tableTop = currentY;
    const tableWidth = doc.page.width - margin * 2; // 515.28 pt

    // Column widths summing to 515
    const colW = {
      num: 24,
      medicine: 150,
      dosage: 65,
      frequency: 95,
      duration: 55,
      qty: 35,
      directions: 91
    };

    // Table Header Row
    doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, tableTop, tableWidth, 26).fill();
    doc.rect(margin, tableTop, tableWidth, 26).lineWidth(0.6).strokeColor(PDF_THEME.colors.border).stroke();

    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('#', margin + 6, tableTop + 8, { width: colW.num });
    doc.text('MEDICINE / DRUG', margin + colW.num + 6, tableTop + 8, { width: colW.medicine });
    doc.text('DOSAGE', margin + colW.num + colW.medicine + 4, tableTop + 8, { width: colW.dosage });
    doc.text('FREQUENCY / TIMING', margin + colW.num + colW.medicine + colW.dosage + 4, tableTop + 8, { width: colW.frequency });
    doc.text('DURATION', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + 4, tableTop + 8, { width: colW.duration });
    doc.text('QTY', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + colW.duration + 4, tableTop + 8, { width: colW.qty, align: 'center' });
    doc.text('DIRECTIONS / FOOD', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + colW.duration + colW.qty + 4, tableTop + 8, { width: colW.directions });

    let rowY = tableTop + 26;

    if (!data.items || data.items.length === 0) {
      doc.fillColor(PDF_THEME.colors.bgWhite).rect(margin, rowY, tableWidth, 34).fill();
      doc.rect(margin, rowY, tableWidth, 34).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();
      doc.font(PDF_THEME.fonts.regular).fontSize(9).fillColor(PDF_THEME.colors.textMuted)
        .text('No prescribed medicines recorded for this consultation.', margin + 14, rowY + 11, { width: tableWidth - 28, align: 'center' });
      rowY += 34;
    } else {
      data.items.forEach((item, idx) => {
        const rowH = 28;

        // Auto page break if table exceeds printable page area
        if (rowY + rowH > doc.page.height - 180) {
          doc.addPage();
          rowY = margin + 20;

          // Re-render table header on subsequent page
          doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, rowY, tableWidth, 26).fill();
          doc.rect(margin, rowY, tableWidth, 26).lineWidth(0.6).strokeColor(PDF_THEME.colors.border).stroke();
          doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy);
          doc.text('#', margin + 6, rowY + 8, { width: colW.num });
          doc.text('MEDICINE / DRUG', margin + colW.num + 6, rowY + 8, { width: colW.medicine });
          doc.text('DOSAGE', margin + colW.num + colW.medicine + 4, rowY + 8, { width: colW.dosage });
          doc.text('FREQUENCY / TIMING', margin + colW.num + colW.medicine + colW.dosage + 4, rowY + 8, { width: colW.frequency });
          doc.text('DURATION', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + 4, rowY + 8, { width: colW.duration });
          doc.text('QTY', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + colW.duration + 4, rowY + 8, { width: colW.qty, align: 'center' });
          doc.text('DIRECTIONS / FOOD', margin + colW.num + colW.medicine + colW.dosage + colW.frequency + colW.duration + colW.qty + 4, rowY + 8, { width: colW.directions });
          rowY += 26;
        }

        // Row background and outer border
        doc.fillColor(idx % 2 === 0 ? PDF_THEME.colors.bgWhite : PDF_THEME.colors.bgLight).rect(margin, rowY, tableWidth, rowH).fill();
        doc.rect(margin, rowY, tableWidth, rowH).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();

        // 1. Row Index
        doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted)
          .text(String(idx + 1), margin + 6, rowY + 8, { width: colW.num });

        // 2. Medicine Name (Clean, strictly clinical — no inventory units like "20 unit")
        const medX = margin + colW.num + 6;
        doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.textDark)
          .text(item.medicineName, medX, rowY + 8, { width: colW.medicine - 8 });

        // 3. Dosage
        const dosageX = margin + colW.num + colW.medicine + 4;
        doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark)
          .text(item.dosage || '—', dosageX, rowY + 8, { width: colW.dosage - 6 });

        // 4. Frequency / Timing
        const freqX = dosageX + colW.dosage;
        doc.font(PDF_THEME.fonts.bold).fontSize(8).fillColor(PDF_THEME.colors.primaryNavy)
          .text(item.frequency || '—', freqX, rowY + 8, { width: colW.frequency - 6 });

        // 5. Duration
        const durX = freqX + colW.frequency;
        doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark)
          .text(item.duration || '—', durX, rowY + 8, { width: colW.duration - 6 });

        // 6. Quantity
        const qtyX = durX + colW.duration;
        doc.font(PDF_THEME.fonts.bold).fontSize(9).fillColor(PDF_THEME.colors.primaryTeal)
          .text(String(item.quantity || 1), qtyX, rowY + 8, { width: colW.qty, align: 'center' });

        // 7. Directions / Food Instructions
        const dirX = qtyX + colW.qty;
        doc.font(PDF_THEME.fonts.regular).fontSize(7.5).fillColor(PDF_THEME.colors.textMuted)
          .text(item.instructions || 'As advised', dirX, rowY + 8, { width: colW.directions - 6 });

        rowY += rowH;
      });
    }

    currentY = rowY + 20;

    // Measure total needed height for Advice Box so text never overlaps
    const notesW = 260;
    const noteContentW = notesW - 20;
    const standardAdvice = [
      '• Take medications strictly at prescribed timings (Before/After meals as indicated).',
      '• Complete the full course of prescribed medicines. Do not stop early without advice.',
      '• In case of any allergy, rash, or unusual symptom, discontinue and contact clinic.',
      '• Maintain proper oral hygiene: brush twice daily and rinse mouth thoroughly after meals.'
    ];

    let neededH = 24; // title
    if (data.notes && data.notes.trim()) {
      doc.font(PDF_THEME.fonts.bold).fontSize(7.5);
      neededH += doc.heightOfString(`• Clinical Note: "${data.notes.trim()}"`, { width: noteContentW, lineGap: 2 }) + 6;
    }
    doc.font(PDF_THEME.fonts.regular).fontSize(7.5);
    for (const line of standardAdvice) {
      neededH += doc.heightOfString(line, { width: noteContentW, lineGap: 2 }) + 5;
    }
    const notesH = Math.max(115, neededH + 10);

    // Ensure sufficient room for lower Section
    if (currentY + notesH + 20 > doc.page.height - 40) {
      doc.addPage();
      currentY = margin + 20;
    }

    const lowerY = currentY;

    // ── 1. Left Box: Patient Advice & Clinical Instructions ──
    doc.fillColor(PDF_THEME.colors.bgLight).rect(margin, lowerY, notesW, notesH).fill();
    doc.rect(margin, lowerY, notesW, notesH).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();

    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy)
      .text('ADVICE & GENERAL INSTRUCTIONS', margin + 10, lowerY + 9);

    let curNoteY = lowerY + 24;

    if (data.notes && data.notes.trim()) {
      doc.font(PDF_THEME.fonts.bold).fontSize(7.5).fillColor(PDF_THEME.colors.primaryNavy);
      const noteStr = `• Clinical Note: "${data.notes.trim()}"`;
      const h = doc.heightOfString(noteStr, { width: noteContentW, lineGap: 2 });
      doc.text(noteStr, margin + 10, curNoteY, { width: noteContentW, lineGap: 2 });
      curNoteY += h + 5;
    }

    doc.font(PDF_THEME.fonts.regular).fontSize(7.5).fillColor(PDF_THEME.colors.textMuted);
    for (const line of standardAdvice) {
      const h = doc.heightOfString(line, { width: noteContentW, lineGap: 2 });
      doc.text(line, margin + 10, curNoteY, { width: noteContentW, lineGap: 2 });
      curNoteY += h + 4.5;
    }

    // ── 2. Center Box: Google Maps Location QR Code ──
    const qrX = margin + notesW + 10;
    const qrW = 100;

    doc.fillColor(PDF_THEME.colors.bgLight).rect(qrX, lowerY, qrW, notesH).fill();
    doc.rect(qrX, lowerY, qrW, notesH).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();

    doc.font(PDF_THEME.fonts.bold).fontSize(7.5).fillColor(PDF_THEME.colors.primaryNavy)
      .text('CLINIC LOCATION', qrX, lowerY + 8, { width: qrW, align: 'center' });

    if (qrBuffer) {
      const qrSize = 64;
      const imgX = qrX + (qrW - qrSize) / 2;
      const imgY = lowerY + 20;
      doc.image(qrBuffer, imgX, imgY, { width: qrSize, height: qrSize });
    }

    doc.font(PDF_THEME.fonts.bold).fontSize(6.5).fillColor(PDF_THEME.colors.primaryTeal)
      .text('SCAN FOR GOOGLE\nLOCATION', qrX, lowerY + 88, { width: qrW, align: 'center', lineGap: 1 });

    // ── 3. Right Box: Authorized Signatory Block ──
    const sigX = qrX + qrW + 10;
    const sigW = doc.page.width - margin - sigX;

    doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted)
      .text('Authorized Signatory', sigX, lowerY + 9, { width: sigW, align: 'right' });

    const sigLineY = lowerY + 54;
    doc.moveTo(sigX + 10, sigLineY).lineTo(sigX + sigW, sigLineY).lineWidth(0.6).strokeColor(PDF_THEME.colors.border).stroke();

    doc.font(PDF_THEME.fonts.bold).fontSize(9.5).fillColor(PDF_THEME.colors.primaryNavy)
      .text(docName, sigX, sigLineY + 6, { width: sigW, align: 'right' });

    doc.font(PDF_THEME.fonts.regular).fontSize(8).fillColor(PDF_THEME.colors.textMuted)
      .text('Dental Surgeon', sigX, sigLineY + 19, { width: sigW, align: 'right' })
      .text(branding.name, sigX, sigLineY + 30, { width: sigW, align: 'right' });

    if (branding.phone) {
      doc.font(PDF_THEME.fonts.regular).fontSize(7.5).fillColor(PDF_THEME.colors.textLight)
        .text(`Ph: ${branding.phone}`, sigX, sigLineY + 41, { width: sigW, align: 'right' });
    }

    // Finalize with two-pass footers (Clinic info, disclaimer & Page X of Y)
    finalizeDocumentWithFooters(doc, branding, {
      disclaimer: 'This prescription is valid under registered medical/dental supervision. Please adhere strictly to prescribed dosages.',
      margin
    });

    doc.end();
  });
};

// ══════════════════════════════════════════════════════════════════════════
// 2. RECEIPT PDF GENERATOR
// ══════════════════════════════════════════════════════════════════════════
export const generateReceiptPDF = (data: ReceiptData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = initPDFDocument({ size: 'A4', margin: 0 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const branding = getClinicBranding({
      name: data.clinicName,
      address: data.clinicAddress,
      phone: data.clinicPhone
    });

    const margin = 40;
    let currentY = renderClinicHeader(doc, branding, { margin });

    const isPartialPayment = (data.balanceDue !== undefined && data.balanceDue > 0) || data.isPartial;
    const badgeText = isPartialPayment ? 'PARTIAL PAYMENT' : 'PAID (SETTLED)';
    const badgeColor = isPartialPayment ? PDF_THEME.colors.statusPartial : PDF_THEME.colors.statusPaid;
    const badgeBg = isPartialPayment ? PDF_THEME.colors.statusPartialBg : PDF_THEME.colors.statusPaidBg;

    // Document Title Banner with Dynamic Badge
    currentY = renderDocumentTitle(
      doc,
      'OFFICIAL PAYMENT RECEIPT',
      undefined,
      { text: badgeText, color: badgeColor, bg: badgeBg },
      currentY,
      margin
    );
    currentY += 8;

    const docName = data.doctorName && data.doctorName !== 'Doctor' && data.doctorName !== 'N/A'
      ? cleanDoctorName(data.doctorName)
      : 'Dr. N MOHAMED RAFI B D S';

    const receiptType = data.totalPaymentsCount && data.totalPaymentsCount > 1
      ? `Installment ${data.paymentNumber || 1} of ${data.totalPaymentsCount}`
      : (isPartialPayment ? 'Partial Installment' : 'Full Payment');

    // Perfectly balanced 5-item symmetrical columns
    const patientItems = [
      { label: 'Patient Name :', value: data.patientName },
      { label: 'Age :', value: data.patientAge ? `${data.patientAge} Yrs` : '—' },
      { label: 'Gender :', value: data.patientGender || '—' },
      { label: 'Phone No :', value: data.patientPhone || '—' },
      { label: 'Doctor In-Charge :', value: docName }
    ];

    const metaItems = [
      { label: 'Receipt No :', value: data.receiptNo },
      { label: 'Payment Date :', value: formatHumanDate(data.paymentDate) },
      { label: 'Payment Type :', value: receiptType },
      { label: 'Payment Method :', value: data.paymentMethod || 'Cash' },
      { label: 'Received By :', value: formatStaffRoleOrName(data.receivedBy) }
    ];

    currentY = renderUnifiedInfoCard(doc, {
      leftItems: patientItems,
      rightItems: metaItems,
      y: currentY,
      margin
    });
    currentY += 24;

    // Billing Details Table with proper spacing
    currentY = renderSectionHeader(doc, 'BILLING & VISIT CHARGES BREAKDOWN', currentY, margin);
    currentY += 6;

    const tableTop = currentY;
    const tableWidth = doc.page.width - margin * 2;
    const colW = {
      num: 36,
      desc: tableWidth - 36 - 130,
      amount: 130
    };

    // Table Header
    doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, tableTop, tableWidth, 26).fill();
    doc.rect(margin, tableTop, tableWidth, 26).lineWidth(0.6).strokeColor(PDF_THEME.colors.border).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(9).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('#', margin + 10, tableTop + 8, { width: colW.num });
    doc.text('DESCRIPTION / SERVICE', margin + colW.num + 10, tableTop + 8, { width: colW.desc });
    doc.text('AMOUNT (₹)', margin + tableWidth - colW.amount - 10, tableTop + 8, { width: colW.amount, align: 'right' });

    let rowY = tableTop + 26;
    let rowIdx = 1;

    // Row 1: Consultation Fee (if any)
    if (data.consultationFee > 0 || (!data.treatmentFee && !data.medicineCost)) {
      doc.fillColor(PDF_THEME.colors.bgWhite).rect(margin, rowY, tableWidth, 30).fill();
      doc.font(PDF_THEME.fonts.regular).fontSize(9).fillColor(PDF_THEME.colors.textMuted);
      doc.text(String(rowIdx++), margin + 10, rowY + 9, { width: colW.num });
      doc.font(PDF_THEME.fonts.bold).fillColor(PDF_THEME.colors.textDark).text('Doctor Consultation & Examination', margin + colW.num + 10, rowY + 9, { width: colW.desc });
      doc.font(PDF_THEME.fonts.regular).text(formatCurrency(data.consultationFee).replace('₹', ''), margin + tableWidth - colW.amount - 10, rowY + 9, {
        width: colW.amount,
        align: 'right'
      });
      doc.moveTo(margin, rowY + 30).lineTo(margin + tableWidth, rowY + 30).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
      rowY += 30;
    }

    // Row 2: Treatment / Procedure Fee (if any)
    if (data.treatmentFee && data.treatmentFee > 0) {
      doc.fillColor(rowIdx % 2 === 1 ? PDF_THEME.colors.bgWhite : PDF_THEME.colors.bgLight).rect(margin, rowY, tableWidth, 30).fill();
      doc.font(PDF_THEME.fonts.regular).fontSize(9).fillColor(PDF_THEME.colors.textMuted);
      doc.text(String(rowIdx++), margin + 10, rowY + 9, { width: colW.num });
      doc.font(PDF_THEME.fonts.bold).fillColor(PDF_THEME.colors.textDark).text('Dental Procedures & Treatments', margin + colW.num + 10, rowY + 9, { width: colW.desc });
      doc.font(PDF_THEME.fonts.regular).text(formatCurrency(data.treatmentFee).replace('₹', ''), margin + tableWidth - colW.amount - 10, rowY + 9, {
        width: colW.amount,
        align: 'right'
      });
      doc.moveTo(margin, rowY + 30).lineTo(margin + tableWidth, rowY + 30).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
      rowY += 30;
    }

    // Row 3: Medicine Cost (if any)
    if (data.medicineCost > 0) {
      doc.fillColor(rowIdx % 2 === 1 ? PDF_THEME.colors.bgWhite : PDF_THEME.colors.bgLight).rect(margin, rowY, tableWidth, 30).fill();
      doc.font(PDF_THEME.fonts.regular).fontSize(9).fillColor(PDF_THEME.colors.textMuted);
      doc.text(String(rowIdx++), margin + 10, rowY + 9, { width: colW.num });
      doc.font(PDF_THEME.fonts.bold).fillColor(PDF_THEME.colors.textDark).text('Pharmacy & Prescribed Medicines', margin + colW.num + 10, rowY + 9, { width: colW.desc });
      doc.font(PDF_THEME.fonts.regular).text(formatCurrency(data.medicineCost).replace('₹', ''), margin + tableWidth - colW.amount - 10, rowY + 9, {
        width: colW.amount,
        align: 'right'
      });
      doc.moveTo(margin, rowY + 30).lineTo(margin + tableWidth, rowY + 30).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
      rowY += 30;
    }

    // Total Highlight Row
    doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, rowY, tableWidth, 34).fill();
    doc.rect(margin, rowY, tableWidth, 34).lineWidth(0.8).strokeColor(PDF_THEME.colors.border).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(10).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('TOTAL VISIT CHARGES', margin + colW.num + 10, rowY + 10);
    doc.fontSize(11).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text(formatCurrency(data.totalAmount), margin + tableWidth - colW.amount - 10, rowY + 10, {
      width: colW.amount,
      align: 'right'
    });

    currentY = rowY + 46;

    // Amount in Words & Payment Settlement Card
    const wordsH = 66;
    doc.fillColor(PDF_THEME.colors.bgLight).rect(margin, currentY, tableWidth, wordsH).fill();
    doc.rect(margin, currentY, tableWidth, wordsH).lineWidth(0.6).strokeColor(PDF_THEME.colors.borderLight).stroke();

    // Top half: Amount in Words of THIS receipt
    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted);
    doc.text('AMOUNT IN WORDS : ', margin + 14, currentY + 11);
    const wordsLabelW = doc.widthOfString('AMOUNT IN WORDS : ');
    doc.font(PDF_THEME.fonts.bold).fontSize(9.5).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text(numberToWordsIndian(data.amountPaid), margin + 14 + wordsLabelW, currentY + 10);

    // Inner divider
    doc.moveTo(margin + 10, currentY + 30).lineTo(margin + tableWidth - 10, currentY + 30).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();

    // Bottom half: Payment Method, Status, Paid Now & Balance Due
    doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted);
    doc.text('Payment Mode : ', margin + 14, currentY + 42);
    doc.font(PDF_THEME.fonts.bold).fillColor(PDF_THEME.colors.textDark).text(data.paymentMethod || 'Cash', margin + 92, currentY + 42);

    doc.font(PDF_THEME.fonts.regular).fillColor(PDF_THEME.colors.textMuted).text('Status : ', margin + 175, currentY + 42);
    doc.font(PDF_THEME.fonts.bold).fillColor(badgeColor).text(isPartialPayment ? 'Partial Payment' : 'Fully Settled', margin + 215, currentY + 42);

    doc.font(PDF_THEME.fonts.regular).fillColor(PDF_THEME.colors.textMuted).text('Paid Now : ', margin + tableWidth - 230, currentY + 42, { width: 65, align: 'right' });
    doc.font(PDF_THEME.fonts.bold).fontSize(10.5).fillColor(PDF_THEME.colors.statusPaid).text(formatCurrency(data.amountPaid), margin + tableWidth - 165, currentY + 41, { width: 55, align: 'right' });

    if (isPartialPayment && data.balanceDue !== undefined) {
      doc.font(PDF_THEME.fonts.regular).fillColor(PDF_THEME.colors.textMuted).text('Balance : ', margin + tableWidth - 105, currentY + 42, { width: 50, align: 'right' });
      doc.font(PDF_THEME.fonts.bold).fontSize(10.5).fillColor(PDF_THEME.colors.statusPartial).text(formatCurrency(data.balanceDue), margin + tableWidth - 55, currentY + 41, { width: 50, align: 'right' });
    } else {
      doc.font(PDF_THEME.fonts.regular).fillColor(PDF_THEME.colors.textMuted).text('Balance : ', margin + tableWidth - 105, currentY + 42, { width: 50, align: 'right' });
      doc.font(PDF_THEME.fonts.bold).fontSize(10.5).fillColor(PDF_THEME.colors.statusPaid).text('₹0', margin + tableWidth - 55, currentY + 41, { width: 50, align: 'right' });
    }

    currentY += wordsH + 30;

    // Lower Section: Side-by-Side Symmetrical Structure (Notes on Left, Signature on Right)
    const lowerY = currentY;
    const notesW = 275;
    const notesH = 96;

    // Left Box: Receipt Acknowledgment & Terms
    doc.fillColor(PDF_THEME.colors.bgLight).rect(margin, lowerY, notesW, notesH).fill();
    doc.rect(margin, lowerY, notesW, notesH).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();

    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy)
      .text('RECEIPT ACKNOWLEDGMENT & TERMS', margin + 12, lowerY + 10);

    doc.font(PDF_THEME.fonts.regular).fontSize(7.5).fillColor(PDF_THEME.colors.textMuted);

    if (data.paymentNotes) {
      doc.font(PDF_THEME.fonts.bold).fillColor(PDF_THEME.colors.primaryNavy).text(`• Note: "${data.paymentNotes}"`, margin + 12, lowerY + 26, { width: notesW - 24 });
      doc.font(PDF_THEME.fonts.regular).fillColor(PDF_THEME.colors.textMuted);
      doc.text(`• Acknowledges payment of ${formatCurrency(data.amountPaid)}. Remaining balance: ${formatCurrency(data.balanceDue || 0)}.`, margin + 12, lowerY + 48, { width: notesW - 24, lineGap: 2 });
      doc.text('• Please preserve this receipt for personal accounts and medical claims.', margin + 12, lowerY + 70, { width: notesW - 24, lineGap: 2 });
    } else {
      doc.text('• This document confirms official receipt of payment for services rendered.', margin + 12, lowerY + 28, { width: notesW - 24, lineGap: 3 });
      doc.text('• Prescribed medicines and oral hygiene supplies are non-returnable.', margin + 12, lowerY + 50, { width: notesW - 24, lineGap: 3 });
      doc.text('• Please preserve this receipt for personal accounts and medical tax claims.', margin + 12, lowerY + 72, { width: notesW - 24, lineGap: 3 });
    }

    // Right Box: Authorized Signatory Block (aligned at the exact same Y position)
    renderSignatureBlock(
      doc,
      {
        name: docName,
        clinicName: branding.name,
        phone: branding.phone,
        email: branding.email
      },
      lowerY,
      margin
    );

    // Finalize with two-pass footers
    finalizeDocumentWithFooters(doc, branding, { margin });

    doc.end();
  });
};

// ══════════════════════════════════════════════════════════════════════════
// 3. TAX INVOICE PDF GENERATOR
// ══════════════════════════════════════════════════════════════════════════
export const generateInvoicePDF = (data: InvoiceData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = initPDFDocument({ size: 'A4', margin: 0 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const branding = getClinicBranding({
      name: data.clinicName,
      address: data.clinicAddress,
      phone: data.clinicPhone
    });

    const margin = 40;
    let currentY = renderClinicHeader(doc, branding, { margin });

    const isFullyPaid = data.amountDue === 0;
    const badgeBg = isFullyPaid ? PDF_THEME.colors.statusPaidBg : PDF_THEME.colors.statusPartialBg;
    const badgeColor = isFullyPaid ? PDF_THEME.colors.statusPaid : PDF_THEME.colors.statusPartial;

    // Document Title Banner
    currentY = renderDocumentTitle(
      doc,
      'TAX INVOICE',
      undefined,
      { text: data.status.toUpperCase(), color: badgeColor, bg: badgeBg },
      currentY,
      margin
    );

    const patientItems = [
      { label: 'Patient Name :', value: data.patientName },
      { label: 'Age :', value: data.patientAge ? `${data.patientAge} Yrs` : '—' },
      { label: 'Gender :', value: data.patientGender || '—' },
      { label: 'Phone No :', value: data.patientPhone || '—' }
    ];

    const metaItems = [
      { label: 'Invoice No :', value: data.invoiceNumber },
      { label: 'Invoice Date :', value: formatHumanDate(data.visitDate) },
      ...(data.doctorName && data.doctorName !== 'Doctor' && data.doctorName !== 'N/A'
        ? [{ label: 'Doctor :', value: cleanDoctorName(data.doctorName) }]
        : []),
      { label: 'Payment Status :', value: data.status }
    ];

    currentY = renderUnifiedInfoCard(doc, {
      leftItems: patientItems,
      rightItems: metaItems,
      y: currentY,
      margin
    });
    currentY += 16;

    // Itemized Services & Pharmacy Section
    currentY = renderSectionHeader(doc, 'ITEMIZED SERVICES & PHARMACY', currentY, margin);

    const tableWidth = doc.page.width - margin * 2;
    const colW = {
      num: 28,
      desc: tableWidth - 28 - 45 - 80 - 85,
      qty: 45,
      rate: 80,
      amount: 85
    };

    // Table Header
    doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, currentY, tableWidth, 22).fill();
    doc.rect(margin, currentY, tableWidth, 22).lineWidth(0.5).strokeColor(PDF_THEME.colors.border).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('#', margin + 4, currentY + 6, { width: colW.num });
    doc.text('DESCRIPTION / PROCEDURE', margin + colW.num + 4, currentY + 6, { width: colW.desc });
    doc.text('QTY', margin + colW.num + colW.desc + 4, currentY + 6, { width: colW.qty, align: 'center' });
    doc.text('RATE (₹)', margin + colW.num + colW.desc + colW.qty + 4, currentY + 6, { width: colW.rate, align: 'right' });
    doc.text('AMOUNT (₹)', margin + colW.num + colW.desc + colW.qty + colW.rate + 4, currentY + 6, { width: colW.amount - 8, align: 'right' });

    currentY += 22;
    let itemIndex = 1;

    // Consultation Line (if applicable)
    if (data.consultationFee > 0) {
      doc.fillColor(PDF_THEME.colors.bgWhite).rect(margin, currentY, tableWidth, 22).fill();
      doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark);
      doc.text(String(itemIndex++), margin + 4, currentY + 6, { width: colW.num });
      doc.font(PDF_THEME.fonts.bold).text('Consultation & Clinical Examination', margin + colW.num + 4, currentY + 6, { width: colW.desc });
      doc.font(PDF_THEME.fonts.regular).text('1', margin + colW.num + colW.desc + 4, currentY + 6, { width: colW.qty, align: 'center' });
      doc.text(formatCurrency(data.consultationFee).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + 4, currentY + 6, { width: colW.rate, align: 'right' });
      doc.font(PDF_THEME.fonts.bold).text(formatCurrency(data.consultationFee).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + colW.rate + 4, currentY + 6, { width: colW.amount - 8, align: 'right' });

      doc.moveTo(margin, currentY + 22).lineTo(margin + tableWidth, currentY + 22).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
      currentY += 22;
    }

    // Treatments Lines
    if (data.treatments && data.treatments.length > 0) {
      for (const t of data.treatments) {
        doc.fillColor(itemIndex % 2 === 0 ? PDF_THEME.colors.bgLight : PDF_THEME.colors.bgWhite).rect(margin, currentY, tableWidth, 22).fill();
        doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark);
        doc.text(String(itemIndex++), margin + 4, currentY + 6, { width: colW.num });
        const desc = t.notes ? `${t.name} (${t.notes})` : t.name;
        doc.font(PDF_THEME.fonts.bold).text(desc, margin + colW.num + 4, currentY + 6, { width: colW.desc });
        doc.font(PDF_THEME.fonts.regular).text('1', margin + colW.num + colW.desc + 4, currentY + 6, { width: colW.qty, align: 'center' });
        const fee = t.fee || (data.treatmentFee / Math.max(data.treatments.length, 1));
        doc.text(formatCurrency(fee).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + 4, currentY + 6, { width: colW.rate, align: 'right' });
        doc.font(PDF_THEME.fonts.bold).text(formatCurrency(fee).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + colW.rate + 4, currentY + 6, { width: colW.amount - 8, align: 'right' });

        doc.moveTo(margin, currentY + 22).lineTo(margin + tableWidth, currentY + 22).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
        currentY += 22;
      }
    }

    // Medicine Lines
    if (data.medicines && data.medicines.length > 0) {
      for (const m of data.medicines) {
        doc.fillColor(itemIndex % 2 === 0 ? PDF_THEME.colors.bgLight : PDF_THEME.colors.bgWhite).rect(margin, currentY, tableWidth, 22).fill();
        doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark);
        doc.text(String(itemIndex++), margin + 4, currentY + 6, { width: colW.num });
        doc.font(PDF_THEME.fonts.bold).text(m.name, margin + colW.num + 4, currentY + 6, { width: colW.desc });
        doc.font(PDF_THEME.fonts.regular).text(String(m.quantity), margin + colW.num + colW.desc + 4, currentY + 6, { width: colW.qty, align: 'center' });
        doc.text(formatCurrency(m.unitPrice).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + 4, currentY + 6, { width: colW.rate, align: 'right' });
        doc.font(PDF_THEME.fonts.bold).text(formatCurrency(m.total).replace('₹', ''), margin + colW.num + colW.desc + colW.qty + colW.rate + 4, currentY + 6, { width: colW.amount - 8, align: 'right' });

        doc.moveTo(margin, currentY + 22).lineTo(margin + tableWidth, currentY + 22).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
        currentY += 22;
      }
    }

    currentY += 12;

    // Financial Breakdown — Final totals with standard round-off if applicable
    const summaryItems: { label: string; amount: number; isBold?: boolean }[] = [];
    if (data.roundOff !== undefined && Math.abs(data.roundOff) > 0) {
      if (data.subtotal !== undefined) {
        summaryItems.push({ label: 'Subtotal', amount: data.subtotal });
      }
      summaryItems.push({ label: 'Round Off', amount: data.roundOff });
    }

    const financialSummary = {
      items: summaryItems,
      totalAmount: data.totalAmount,
      amountPaid: data.amountPaid,
      amountDue: data.amountDue,
      status: data.status
    };

    currentY = renderFinancialSummary(doc, financialSummary, currentY, margin);
    currentY += 16;

    // Doctor Signature
    if (data.doctorName && data.doctorName !== 'Doctor' && data.doctorName !== 'N/A') {
      renderSignatureBlock(
        doc,
        {
          name: data.doctorName,
          clinicName: branding.name,
          phone: branding.phone,
          email: branding.email
        },
        currentY,
        margin
      );
    }

    // Finalize two-pass footers
    finalizeDocumentWithFooters(doc, branding, { margin });

    doc.end();
  });
};

// ══════════════════════════════════════════════════════════════════════════
// 4. REIMBURSEMENT CLAIM PDF GENERATOR
// ══════════════════════════════════════════════════════════════════════════
export const generateReimbursementPDF = (data: ReimbursementPDFData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = initPDFDocument({ size: 'A4', margin: 0 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const branding = getClinicBranding({
      name: data.clinicName || undefined,
      address: data.clinicAddress || undefined,
      phone: data.clinicPhone || undefined
    });

    const margin = 40;
    let currentY = renderClinicHeader(doc, branding, { margin });

    // Document Title Banner
    currentY = renderDocumentTitle(
      doc,
      'MEDICAL REIMBURSEMENT CERTIFICATE',
      'Issued for patient medical insurance and employer claim purposes',
      undefined,
      currentY,
      margin
    );

    // Patient Info & Claim Metadata Unified Card (Bold labels, regular values, no 'PATIENT INFORMATION' banner)
    const patientItems = [
      { label: 'Patient Name :', value: data.patientName || '—' },
      { label: 'Age :', value: data.patientAge ? `${data.patientAge} Yrs` : '—' },
      { label: 'Gender :', value: data.patientGender || '—' },
      { label: 'Phone No :', value: data.patientPhone || '—' }
    ];

    const metaItems = [
      { label: 'Doc Number :', value: data.documentNumber || '—' },
      { label: 'Claim Date :', value: formatHumanDate(data.documentDate) },
      ...(data.doctorName && data.doctorName !== 'Doctor'
        ? [{ label: 'Treating Doctor :', value: cleanDoctorName(data.doctorName) }]
        : [{ label: 'Treating Doctor :', value: '—' }]),
      ...(data.doctorRegNo ? [{ label: 'Reg Number :', value: data.doctorRegNo }] : [])
    ];

    currentY = renderUnifiedInfoCard(doc, {
      leftItems: patientItems,
      rightItems: metaItems,
      y: currentY,
      margin
    });
    currentY += 18;

    // Treatment & Amount Summary Box
    if (data.treatmentDescription || (data.amount !== null && data.amount !== undefined)) {
      const boxW = doc.page.width - margin * 2;
      const boxH = 48;
      doc.fillColor(PDF_THEME.colors.bgLight).rect(margin, currentY, boxW, boxH).fill();
      doc.rect(margin, currentY, boxW, boxH).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();

      if (data.treatmentDescription) {
        doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy)
          .text('PROCEDURES / TREATMENT UNDERTAKEN:', margin + 12, currentY + 8);
        doc.font(PDF_THEME.fonts.regular).fontSize(9).fillColor(PDF_THEME.colors.textDark)
          .text(data.treatmentDescription, margin + 12, currentY + 22, { width: boxW - 160 });
      }

      if (data.amount !== null && data.amount !== undefined) {
        doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy)
          .text('TOTAL CLAIM AMOUNT', margin + boxW - 130, currentY + 8, { width: 120, align: 'right' });
        doc.font(PDF_THEME.fonts.bold).fontSize(13.5).fillColor(PDF_THEME.colors.statusPaid)
          .text(formatCurrency(data.amount), margin + boxW - 130, currentY + 22, { width: 120, align: 'right' });
      }

      currentY += boxH + 18;
    }

    // Salutation (under the procedure/treatment card)
    doc.font(PDF_THEME.fonts.bold).fontSize(10.5).fillColor(PDF_THEME.colors.primaryNavy)
      .text('TO WHOMSOEVER IT MAY CONCERN', margin, currentY);
    currentY += 16;

    // Letter Content Paragraphs
    doc.font(PDF_THEME.fonts.regular).fontSize(9.5).fillColor(PDF_THEME.colors.textDark);
    const paragraphs = data.content.split('\n').map(p => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      doc.text(p, margin, currentY, { width: doc.page.width - margin * 2, lineGap: 4.5 });
      currentY = doc.y + 8;
    }

    // Signature Block anchored nicely towards the bottom
    if (data.doctorName && data.doctorName !== 'Doctor') {
      renderSignatureBlock(
        doc,
        {
          name: data.doctorName,
          title: 'Dental Surgeon',
          clinicName: branding.name,
          phone: branding.phone,
          email: branding.email,
          regNo: data.doctorRegNo || undefined
        },
        currentY + 20,
        margin,
        { alignBottom: true }
      );
    }

    finalizeDocumentWithFooters(doc, branding, {
      margin,
      disclaimer: 'This certificate is officially issued for the purpose of medical reimbursement claims.'
    });

    doc.end();
  });
};

// ══════════════════════════════════════════════════════════════════════════
// 5. PURCHASE ORDER PDF GENERATOR
// ══════════════════════════════════════════════════════════════════════════
export const generatePurchaseOrderPDF = (data: PurchaseOrderData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = initPDFDocument({ size: 'A4', margin: 0 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const branding = getClinicBranding({ name: data.clinicName });
    const margin = 40;
    let currentY = renderClinicHeader(doc, branding, { margin });

    // Title
    currentY = renderDocumentTitle(
      doc,
      'PURCHASE ORDER',
      'Clinic Procurement & Inventory Replenishment',
      undefined,
      currentY,
      margin
    );

    // Vendor & Order Metadata Cards
    const colWidth = (doc.page.width - margin * 2 - 16) / 2;

    const metaItems = [
      { label: 'PO Number :', value: `#${data.orderNumber}` },
      { label: 'Order Date :', value: formatHumanDate(data.orderDate) },
      ...(data.expectedDate ? [{ label: 'Expected By :', value: formatHumanDate(data.expectedDate) }] : []),
      { label: 'Status :', value: 'Sent to Supplier' }
    ];

    const sharedCardHeight = Math.max(metaItems.length * 16 + 20, 84);

    // Left: Vendor Card (symmetrical equal height with metadata card)
    doc.fillColor(PDF_THEME.colors.bgLight).rect(margin, currentY, colWidth, sharedCardHeight).fill();
    doc.rect(margin, currentY, colWidth, sharedCardHeight).lineWidth(0.5).strokeColor(PDF_THEME.colors.borderLight).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryTeal).text('SUPPLIER / VENDOR', margin + 8, currentY + 8);
    doc.font(PDF_THEME.fonts.bold).fontSize(11).fillColor(PDF_THEME.colors.textDark).text(data.supplierName, margin + 8, currentY + 22, { width: colWidth - 16 });
    const vendorSub = [data.supplierPhone ? `Ph: ${data.supplierPhone}` : '', data.supplierEmail].filter(Boolean).join('  •  ');
    if (vendorSub) {
      doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted).text(vendorSub, margin + 8, currentY + 40, { width: colWidth - 16 });
    }

    // Right: PO Metadata
    renderDocumentMetadata(doc, metaItems, margin + colWidth + 16, currentY, colWidth, sharedCardHeight);
    currentY += sharedCardHeight + 16;

    // Itemized Order Table
    currentY = renderSectionHeader(doc, 'ORDERED ITEMS & INVENTORY SUPPLIES', currentY, margin);

    const tableWidth = doc.page.width - margin * 2;
    const colW = {
      desc: tableWidth - 50 - 90 - 95,
      qty: 50,
      rate: 90,
      amount: 95
    };

    doc.fillColor(PDF_THEME.colors.headerBg).rect(margin, currentY, tableWidth, 22).fill();
    doc.rect(margin, currentY, tableWidth, 22).lineWidth(0.5).strokeColor(PDF_THEME.colors.border).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(8.5).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('ITEM DESCRIPTION', margin + 8, currentY + 6, { width: colW.desc });
    doc.text('QTY', margin + colW.desc + 8, currentY + 6, { width: colW.qty, align: 'center' });
    doc.text('UNIT PRICE', margin + colW.desc + colW.qty + 8, currentY + 6, { width: colW.rate, align: 'right' });
    doc.text('TOTAL', margin + colW.desc + colW.qty + colW.rate + 8, currentY + 6, { width: colW.amount - 16, align: 'right' });

    currentY += 22;

    data.items.forEach((item, index) => {
      const bg = index % 2 === 0 ? PDF_THEME.colors.bgWhite : PDF_THEME.colors.bgLight;
      doc.fillColor(bg).rect(margin, currentY, tableWidth, 22).fill();
      doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textDark);
      doc.text(item.medicineName, margin + 8, currentY + 6, { width: colW.desc });
      doc.text(String(item.quantity), margin + colW.desc + 8, currentY + 6, { width: colW.qty, align: 'center' });
      doc.text(formatCurrency(item.unitPrice), margin + colW.desc + colW.qty + 8, currentY + 6, { width: colW.rate, align: 'right' });
      doc.font(PDF_THEME.fonts.bold).text(formatCurrency(item.total), margin + colW.desc + colW.qty + colW.rate + 8, currentY + 6, { width: colW.amount - 16, align: 'right' });

      doc.moveTo(margin, currentY + 22).lineTo(margin + tableWidth, currentY + 22).lineWidth(0.4).strokeColor(PDF_THEME.colors.borderLight).stroke();
      currentY += 22;
    });

    currentY += 12;

    // Total box
    const totalBoxW = 220;
    const totalBoxX = doc.page.width - margin - totalBoxW;
    doc.fillColor(PDF_THEME.colors.headerBg).rect(totalBoxX, currentY, totalBoxW, 30).fill();
    doc.rect(totalBoxX, currentY, totalBoxW, 30).lineWidth(0.8).strokeColor(PDF_THEME.colors.border).stroke();
    doc.font(PDF_THEME.fonts.bold).fontSize(11).fillColor(PDF_THEME.colors.primaryNavy);
    doc.text('PURCHASE TOTAL :', totalBoxX + 10, currentY + 8);
    doc.text(formatCurrency(data.totalAmount), totalBoxX + 110, currentY + 8, { width: 100, align: 'right' });

    currentY += 45;

    if (data.notes) {
      doc.font(PDF_THEME.fonts.bold).fontSize(9).fillColor(PDF_THEME.colors.textDark).text('Notes & Delivery Instructions:', margin, currentY);
      doc.font(PDF_THEME.fonts.regular).fontSize(8.5).fillColor(PDF_THEME.colors.textMuted).text(data.notes, margin, currentY + 14, { width: doc.page.width - margin * 2 });
      currentY += 36;
    }

    finalizeDocumentWithFooters(doc, branding, { margin });

    doc.end();
  });
};
