import PDFDocument from 'pdfkit';
import path from 'path';

export interface PrescriptionData {
  clinicName: string;
  patientName: string;
  patientId: string;
  patientPhone: string;
  visitDate: string;
  visitId: string;
  doctorName: string;
  items: {
    medicineName: string;
    quantity: number;
    dosage?: string;
    duration?: string;
    instructions?: string;
  }[];
}

export interface ReceiptData {
  clinicName: string;
  patientName: string;
  patientId: string;
  patientPhone: string;
  visitId: string;
  visitDate: string;
  consultationFee: number;
  medicineCost: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;
  paymentDate: string;
  paymentStatus: string;
  receiptNo: string;
  receivedBy: string;
}

export const generatePrescriptionPDF = (data: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
    const buffers: Buffer[] = [];

    const tamilRegular = path.join(process.cwd(), 'src/assets/fonts/NotoSansTamil-Regular.ttf');
    const tamilBold    = path.join(process.cwd(), 'src/assets/fonts/NotoSansTamil-Bold.ttf');
    const robotoReg    = path.join(process.cwd(), 'src/assets/fonts/Roboto-Regular.ttf');
    const robotoBold   = path.join(process.cwd(), 'src/assets/fonts/Roboto-Bold.ttf');

    doc.registerFont('Tamil',       tamilRegular);
    doc.registerFont('Tamil-Bold',  tamilBold);
    doc.registerFont('Roboto',      robotoReg);
    doc.registerFont('Roboto-Bold', robotoBold);

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W   = doc.page.width;   // 595
    const H   = doc.page.height;  // 842
    const GRN = '#1A5C1A';        // dark green — matches physical sheet
    const GRN_LIGHT = '#E6F4E6';
    const BDR = 12;               // page margin for border

    // ── Frequency → time slots ──────────────────────────────────────────
    const resolveSlots = (freq: string, dosage: string) => {
      const f = (freq || '').toLowerCase().trim();
      const qty = (dosage || '').match(/^(\d+)/)?.[1] ?? '1';
      const e = (s: string) => s ? qty : '';
      if (/four|qid|4.time|1-1-1-1/i.test(f)) return { m: qty, a: qty, ev: qty, n: qty };
      if (/three|tds|tid|thrice|1-1-1/i.test(f)) return { m: qty, a: qty, ev: '',  n: qty };
      if (/twice|two|bd|bid|1-0-1/i.test(f))     return { m: qty, a: '',   ev: '',  n: qty };
      if (/once|od|morning only|1-0-0/i.test(f)) return { m: qty, a: '',   ev: '',  n: ''  };
      if (/night|bedtime|hs/i.test(f))            return { m: '',   a: '',   ev: '',  n: qty };
      if (/morning/i.test(f))                     return { m: qty, a: '',   ev: '',  n: ''  };
      if (/afternoon/i.test(f))                   return { m: '',   a: qty,  ev: '',  n: ''  };
      if (/evening/i.test(f))                     return { m: '',   a: '',   ev: qty, n: ''  };
      // fallback: show qty in morning
      return { m: e(qty), a: '', ev: '', n: '' };
    };

    const resolveFood = (instructions: string) => {
      const i = (instructions || '').toLowerCase();
      if (/before\s*food|before\s*meal|empty|bf/i.test(i)) return { bf: '\u2714', af: '' };
      if (/after\s*food|after\s*meal|pc|af/i.test(i))      return { bf: '',  af: '\u2714' };
      return { bf: '', af: '' };
    };

    // ── Doctor display ──────────────────────────────────────────────────
    const rawName = data.doctorName || 'Doctor';
    const drEn  = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;

    // ════════════════════════════════════════════════════════
    // PAGE 1 — PRESCRIPTION FRONT
    // ════════════════════════════════════════════════════════

    // Double border
    doc.rect(BDR,     BDR,     W - BDR*2,     H - BDR*2).lineWidth(2.0).strokeColor(GRN).stroke();
    doc.rect(BDR + 3, BDR + 3, W - BDR*2 - 6, H - BDR*2 - 6).lineWidth(0.6).strokeColor(GRN).stroke();

    // ── HEADER ─────────────────────────────────────────────
    const hLeft  = BDR + 6;
    const hRight = W - BDR - 6;
    const hY     = BDR + 8;

    // Left: English
    doc.font('Roboto-Bold').fontSize(12).fillColor(GRN).text(drEn + '  B.D.S.,', hLeft, hY);
    doc.font('Roboto').fontSize(9).fillColor(GRN)
      .text('Dental Surgeon',          hLeft, hY + 16)
      .text('DentalCore Dental Clinic',hLeft, hY + 28)
      .text('Gobichettipalayam',       hLeft, hY + 40)
      .text('Clinic : 04285-XXXXXX',   hLeft, hY + 52)
      .text('Cell   : 9XXXXXXX58',     hLeft, hY + 63);

    // Right: Tamil
    const rW = 200;
    const rX = hRight - rW;
    doc.font('Tamil-Bold').fontSize(12).fillColor(GRN).text(`${drEn}  B.D.S.,`, rX, hY, { width: rW, align: 'right' });
    doc.font('Tamil').fontSize(9).fillColor(GRN)
      .text('பல் மருத்துவர்',                          rX, hY + 16, { width: rW, align: 'right' })
      .text('DentalCore பல் மருத்துவமனை',              rX, hY + 28, { width: rW, align: 'right' })
      .text('கோபிசெட்டிபாளையம்',                      rX, hY + 40, { width: rW, align: 'right' })
      .text('போன் : 04285-XXXXXX',                    rX, hY + 52, { width: rW, align: 'right' })
      .text('செல்  : 9XXXXXXX58',                     rX, hY + 63, { width: rW, align: 'right' });

    // Center: dental cross logo placeholder
    const lcx = W / 2;
    doc.font('Roboto-Bold').fontSize(28).fillColor(GRN).text('+', lcx - 10, hY + 10, { width: 20 });
    doc.circle(lcx, hY + 30, 20).lineWidth(1.5).strokeColor(GRN).stroke();
    doc.font('Roboto-Bold').fontSize(10).fillColor(GRN).text('BDS', lcx - 12, hY + 24, { width: 24 });

    // ── SEPARATOR ──
    const sep1Y = hY + 80;
    doc.moveTo(hLeft, sep1Y).lineTo(hRight, sep1Y).lineWidth(1.2).strokeColor(GRN).stroke();

    // ── DATE ROW ──
    const dateY = sep1Y + 5;
    doc.font('Tamil').fontSize(9).fillColor(GRN).text('ஞாயிறு விடுமுறை', hLeft, dateY);
    doc.font('Roboto-Bold').fontSize(9).fillColor(GRN).text('Date :', W / 2, dateY);
    doc.font('Roboto').fontSize(9).fillColor('#000').text(data.visitDate, W / 2 + 38, dateY);

    const sep2Y = dateY + 16;
    doc.moveTo(hLeft, sep2Y).lineTo(hRight, sep2Y).lineWidth(0.8).strokeColor(GRN).stroke();

    // ── PATIENT ROW ──
    const patY = sep2Y + 5;
    doc.font('Roboto-Bold').fontSize(9).fillColor(GRN).text('PATIENT NAME :', hLeft, patY);
    doc.font('Roboto').fontSize(9).fillColor('#000').text(data.patientName || '', hLeft + 96, patY, { width: 200 });
    doc.font('Roboto-Bold').fontSize(9).fillColor(GRN).text('AGE :', hLeft + 320, patY);
    doc.font('Roboto').fontSize(9).fillColor('#000').text(String(data.patientAge || ''), hLeft + 354, patY, { width: 30 });
    doc.font('Roboto-Bold').fontSize(9).fillColor(GRN).text('M / F', hLeft + 400, patY);

    const sep3Y = patY + 16;
    doc.moveTo(hLeft, sep3Y).lineTo(hRight, sep3Y).lineWidth(0.8).strokeColor(GRN).stroke();

    // ── MEDICINE TABLE ─────────────────────────────────────
    // Column layout  (total usable = hRight - hLeft = ~563)
    // | Medicine (250) | காலை(52) | மதியம்(52) | மாலை(52) | இரவு(52) | முன்(52) | பின்(53) |
    const tblTop  = sep3Y;
    const tblLeft = hLeft;
    const tblRt   = hRight;
    const tblW    = tblRt - tblLeft;

    const cMed = 245;
    const cT   = 50;   // time column width (×4 = 200)
    const cF   = 52;   // food column (×2 = 104)
    // total = 245 + 200 + 104 = 549; tblW ≈ 563 → distribute 14 extra to cMed → 259
    const cMedW = tblW - cT * 4 - cF * 2;  // whatever remains

    const xMed  = tblLeft;
    const xMorn = xMed  + cMedW;
    const xAftn = xMorn + cT;
    const xEvng = xAftn + cT;
    const xNgt  = xEvng + cT;
    const xBf   = xNgt  + cT;
    const xAf   = xBf   + cF;

    // Header row
    const hdrH = 28;
    doc.fillColor(GRN_LIGHT).rect(tblLeft, tblTop, tblW, hdrH).fill();

    // Vertical dividers in header
    [xMorn, xAftn, xEvng, xNgt, xBf, xAf].forEach(x => {
      doc.moveTo(x, tblTop).lineTo(x, tblTop + hdrH).lineWidth(0.6).strokeColor(GRN).stroke();
    });

    // Time column headers (Tamil)
    doc.font('Tamil-Bold').fontSize(8.5).fillColor(GRN);
    doc.text('காலை',  xMorn + 2, tblTop + 3,  { width: cT,  align: 'center' });
    doc.text('மதியம்', xAftn + 2, tblTop + 3,  { width: cT,  align: 'center' });
    doc.text('மாலை',  xEvng + 2, tblTop + 3,  { width: cT,  align: 'center' });
    doc.text('இரவு',  xNgt  + 2, tblTop + 3,  { width: cT,  align: 'center' });

    // Food column header spanning both sub-cols
    doc.font('Tamil-Bold').fontSize(8).fillColor(GRN)
      .text('உணவுக்கு', xBf, tblTop + 2, { width: cF * 2, align: 'center' });
    doc.font('Tamil').fontSize(8).fillColor(GRN)
      .text('முன்', xBf,  tblTop + 15, { width: cF, align: 'center' });
    doc.font('Tamil').fontSize(8).fillColor(GRN)
      .text('பின்', xAf,  tblTop + 15, { width: cF, align: 'center' });
    doc.moveTo(xBf, tblTop + 14).lineTo(xAf + cF, tblTop + 14).lineWidth(0.4).strokeColor(GRN).stroke();

    // Header outer border
    doc.rect(tblLeft, tblTop, tblW, hdrH).lineWidth(0.8).strokeColor(GRN).stroke();

    // ── Rx SYMBOL ──
    let rowY = tblTop + hdrH;
    doc.font('Roboto-Bold').fontSize(18).fillColor(GRN).text('Rx', tblLeft + 3, rowY + 4, { width: 28 });

    // ── MEDICINE ROWS ──
    const rowH     = 30;
    const bodyBase = rowY;
    const maxRows  = Math.floor((H - BDR - 55 - bodyBase) / rowH);
    const filled   = data.items.length;
    const totalRows = Math.max(filled + 3, Math.min(maxRows, 12));

    for (let i = 0; i < totalRows; i++) {
      const ry   = rowY + i * rowH;
      const item = i < filled ? data.items[i] : null;

      // Row bg
      doc.fillColor(i % 2 === 0 ? '#FAFFF8' : '#FFFFFF').rect(tblLeft, ry, tblW, rowH).fill();

      if (item) {
        const slots = resolveSlots(item.frequency || '', item.dosage || '1');
        const food  = resolveFood(item.instructions || '');

        // Medicine name + dosage/duration sub-line
        doc.font('Roboto-Bold').fontSize(9).fillColor('#111')
          .text(`${i + 1}.  ${item.medicineName}`, tblLeft + 32, ry + 5, { width: cMedW - 36 });
        if (item.dosage || item.duration) {
          const sub = [item.dosage, item.duration].filter(Boolean).join('  |  ');
          doc.font('Roboto').fontSize(7.5).fillColor('#555')
            .text(sub, tblLeft + 32, ry + 18, { width: cMedW - 36 });
        }

        // Time slot values
        const slotOpts = { align: 'center' as const };
        doc.font('Roboto-Bold').fontSize(11).fillColor(GRN);
        if (slots.m)  doc.text(slots.m,  xMorn + 2, ry + 9, { width: cT, align: 'center' });
        if (slots.a)  doc.text(slots.a,  xAftn + 2, ry + 9, { width: cT, align: 'center' });
        if (slots.ev) doc.text(slots.ev, xEvng + 2, ry + 9, { width: cT, align: 'center' });
        if (slots.n)  doc.text(slots.n,  xNgt  + 2, ry + 9, { width: cT, align: 'center' });

        // Food
        doc.font('Roboto-Bold').fontSize(12).fillColor(GRN);
        if (food.bf) doc.text(food.bf, xBf, ry + 9, { width: cF, align: 'center' });
        if (food.af) doc.text(food.af, xAf, ry + 9, { width: cF, align: 'center' });
      }

      // Row borders
      doc.rect(tblLeft, ry, tblW, rowH).lineWidth(0.4).strokeColor(i < filled ? '#aacfaa' : '#cccccc').stroke();
      [xMorn, xAftn, xEvng, xNgt, xBf, xAf].forEach(x => {
        doc.moveTo(x, ry).lineTo(x, ry + rowH).lineWidth(0.4).strokeColor(GRN).stroke();
      });
    }

    // ── SIGNATURE (bottom right) ──
    const sigY = H - BDR - 48;
    const sigX = hRight - 170;
    doc.moveTo(sigX, sigY).lineTo(hRight, sigY)
      .lineWidth(0.8).dash(3, { space: 2 }).strokeColor(GRN).stroke();
    doc.undash();
    doc.font('Roboto').fontSize(8).fillColor(GRN)
      .text(drEn, sigX, sigY + 3, { width: 170, align: 'center' });
    doc.font('Roboto').fontSize(7.5).fillColor(GRN)
      .text('Signature & Stamp', sigX, sigY + 15, { width: 170, align: 'center' });

    // ── FOOTER NOTE (Tamil) ──
    doc.moveTo(hLeft, H - BDR - 26).lineTo(hRight, H - BDR - 26).lineWidth(0.8).strokeColor(GRN).stroke();
    doc.font('Tamil').fontSize(9).fillColor(GRN)
      .text(
        'குறிப்பு : மறுமுறை வரும்போது கண்டிப்பாக இந்த சீட்டை கொண்டு வரவும்',
        0, H - BDR - 18, { align: 'center' }
      );

    // ════════════════════════════════════════════════════════
    // PAGE 2 — POST-CARE INSTRUCTIONS (Back of sheet)
    // ════════════════════════════════════════════════════════
    doc.addPage();

    doc.rect(BDR,     BDR,     W - BDR*2,     H - BDR*2).lineWidth(2.0).strokeColor(GRN).stroke();
    doc.rect(BDR + 3, BDR + 3, W - BDR*2 - 6, H - BDR*2 - 6).lineWidth(0.6).strokeColor(GRN).stroke();

    let py = BDR + 16;

    // ── Section 1: Tooth Extraction ──────────────────────
    doc.font('Tamil-Bold').fontSize(13).fillColor(GRN)
      .text('பல் பிடுங்கிய பின்பு பின்பற்ற வேண்டிய வழிமுறைகள்',
            BDR + 12, py, { align: 'center', width: W - BDR * 2 - 24, underline: true });
    py += 26;
    doc.moveTo(BDR + 8, py).lineTo(W - BDR - 8, py).lineWidth(0.8).strokeColor(GRN).stroke();
    py += 10;

    const extractionSteps = [
      'பல் பிடுங்கிய இடத்தில் வைக்கப்படும் பஞ்சை ஒரு மணி நேரம் இறுக்கமாக கடித்திருக்க வேண்டும்.',
      'கண்டிப்பாக எச்சில் துப்பக்கூடாது; வாயிலும் எச்சிலை வைத்திருக்க கூடாது — முழுங்கி கொள்ளவும்.',
      'பல் பிடுங்கிய பிறகு ஒருநாள் சூடாக சாப்பிடக்கூடாது. வாயை பலமாகவும் கொப்பளிக்க கூடாது.',
      'பல் பிடுங்கிய பிறகு ஒரு நாளைக்கு மேல் இரத்தக் கசிவு இருந்தால் மருத்துவரை அணுகவும்.',
    ];

    extractionSteps.forEach((step, i) => {
      doc.font('Roboto-Bold').fontSize(10).fillColor(GRN).text(`${i + 1}.`, BDR + 14, py, { width: 20 });
      doc.font('Tamil').fontSize(10).fillColor('#1A1A1A').text(step, BDR + 36, py, { width: W - BDR * 2 - 50 });
      py += 44;
    });

    py += 10;

    // ── Section 2: Scaling / Pit Filling ─────────────────
    doc.font('Tamil-Bold').fontSize(13).fillColor(GRN)
      .text('பர்சிதைவு (அல்லது) பற்குழியை அடைத்த பிறகு பின்பற்ற வேண்டிய வழிமுறைகள்',
            BDR + 12, py, { align: 'center', width: W - BDR * 2 - 24, underline: true });
    py += 28;
    doc.moveTo(BDR + 8, py).lineTo(W - BDR - 8, py).lineWidth(0.8).strokeColor(GRN).stroke();
    py += 10;

    doc.font('Roboto-Bold').fontSize(10).fillColor(GRN).text('1.', BDR + 14, py, { width: 20 });
    doc.font('Tamil').fontSize(10).fillColor('#1A1A1A')
      .text('1 மணி நேரம் கழிந்து உணவு அருந்தவும்.', BDR + 36, py, { width: W - BDR * 2 - 50 });
    py += 30;

    // Divider box (empty space for handwritten notes)
    const boxY = py + 10;
    doc.rect(BDR + 8, boxY, W - BDR * 2 - 16, 100).lineWidth(0.6).strokeColor('#aaaaaa').stroke();

    // Page 2 bottom credit
    doc.font('Roboto').fontSize(8).fillColor('#777')
      .text('DentalCore Dental Clinic', 0, H - BDR - 18, { align: 'center' });

    doc.end();
  });
};



export const generateReceiptPDF = (data: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const buffers: Buffer[] = [];
    
    // Register Fonts
    const fontRegular = path.join(process.cwd(), 'src/assets/fonts/Roboto-Regular.ttf');
    const fontBold = path.join(process.cwd(), 'src/assets/fonts/Roboto-Bold.ttf');
    
    doc.registerFont('Roboto', fontRegular);
    doc.registerFont('Roboto-Bold', fontBold);

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primaryBlue = '#0B5B9E';
    const lightBlue = '#EEF6FC';
    const lightGreen = '#E8F5E9';
    const textDark = '#333333';
    
    // Make status strictly 'Paid' for the receipt
    const displayStatus = (data.paymentStatus === 'Completed' || data.paymentStatus === 'Paid') ? 'Paid' : data.paymentStatus;
    
    // HEADER
    doc.font('Roboto-Bold').fontSize(32).fillColor(primaryBlue).text('Dental', 50, 40, { continued: true }).fillColor('#1E88E5').text('Core');
    doc.fontSize(16).fillColor('#666666').text('Dental Clinic', 50, 75);

    doc.moveTo(40, 105).lineTo(doc.page.width - 40, 105).lineWidth(1).strokeColor(primaryBlue).stroke();

    // TITLE BANNER
    doc.fillColor(lightBlue).rect(80, 120, doc.page.width - 160, 60).fill();
    doc.font('Roboto-Bold').fontSize(22).fillColor('#000000').text('PAYMENT RECEIPT', 0, 135, { align: 'center' });
    doc.font('Roboto').fontSize(10).fillColor('#555555').text('THANK YOU FOR YOUR VISIT', 0, 160, { align: 'center', characterSpacing: 2 });

    // INFO PANELS
    // Patient Information Block
    doc.fillColor('#F9FAFB').rect(40, 200, 245, 95).fill();
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(11).text('Patient Information', 50, 210);
    doc.moveTo(40, 230).lineTo(285, 230).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
    
    doc.font('Roboto').fontSize(10).fillColor(textDark);
    doc.text('Name', 50, 245).text(':', 100, 245).text(data.patientName, 110, 245);
    doc.text('Phone', 50, 265).text(':', 100, 265).text(data.patientPhone, 110, 265);

    // Receipt Information Block
    doc.fillColor('#F9FAFB').rect(310, 200, 245, 95).fill();
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(11).text('Visit Information', 320, 210);
    doc.moveTo(310, 230).lineTo(555, 230).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
    
    doc.font('Roboto').fontSize(10).fillColor(textDark);
    let rightInfoY = 245;
    
    doc.text('Visit Date', 320, rightInfoY).text(':', 390, rightInfoY).text(data.visitDate, 400, rightInfoY);
    rightInfoY += 15;
    
    doc.text('Payment Date', 320, rightInfoY).text(':', 390, rightInfoY).text(data.paymentDate, 400, rightInfoY);
    rightInfoY += 15;
    
    if (data.doctorName && data.doctorName !== 'N/A') {
      doc.text('Doctor', 320, rightInfoY).text(':', 390, rightInfoY).text(`Dr. ${data.doctorName.replace(/^Dr\.\s*/i, '')}`, 400, rightInfoY);
      rightInfoY += 15;
    }
    
    doc.text('Status', 320, rightInfoY).text(':', 390, rightInfoY).text(displayStatus, 400, rightInfoY);

    // BILLING TABLE
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(14).text('Billing Details', 40, 330);
    
    const tableTop = 350;
    // Header Row
    doc.fillColor(lightBlue).rect(40, tableTop, doc.page.width - 80, 25).fill();
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(10);
    doc.text('Description', 50, tableTop + 8);
    doc.text('Amount', 400, tableTop + 8, { width: 145, align: 'right' });
    
    // Row 1
    doc.font('Roboto').fontSize(10).fillColor(textDark);
    doc.text('Consultation Fee', 50, tableTop + 33);
    doc.text(`₹${data.consultationFee.toFixed(2)}`, 400, tableTop + 33, { width: 145, align: 'right' });
    doc.moveTo(40, tableTop + 50).lineTo(doc.page.width - 40, tableTop + 50).lineWidth(0.5).strokeColor('#E5E7EB').stroke();

    // Row 2
    doc.text('Medicine Cost', 50, tableTop + 58);
    doc.text(`₹${data.medicineCost.toFixed(2)}`, 400, tableTop + 58, { width: 145, align: 'right' });
    doc.moveTo(40, tableTop + 75).lineTo(doc.page.width - 40, tableTop + 75).lineWidth(0.5).strokeColor('#E5E7EB').stroke();

    // Total Row
    doc.fillColor(lightBlue).rect(40, tableTop + 75, doc.page.width - 80, 30).fill();
    doc.font('Roboto-Bold').fontSize(12).fillColor('#000000');
    doc.text('TOTAL', 50, tableTop + 85);
    doc.text(`₹${data.totalAmount.toFixed(2)}`, 400, tableTop + 85, { width: 145, align: 'right' });
    
    // PAYMENT DETAILS & BADGE
    const payTop = tableTop + 130;
    doc.fillColor('#F9FAFB').rect(40, payTop, doc.page.width - 80, 100).fill();
    
    // Left side details
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(12).text('Payment Details', 50, payTop + 15);
    doc.font('Roboto').fontSize(10).fillColor(textDark);
    doc.text('Amount Paid', 50, payTop + 40).text(':', 140, payTop + 40).font('Roboto-Bold').text(`₹${data.amountPaid.toFixed(2)}`, 150, payTop + 40);
    doc.font('Roboto').text('Payment Method', 50, payTop + 55).text(':', 140, payTop + 55).font('Roboto-Bold').text(data.paymentMethod, 150, payTop + 55);
    doc.font('Roboto').text('Payment Date', 50, payTop + 70).text(':', 140, payTop + 70).text(data.paymentDate, 150, payTop + 70);

    // Right side badge
    if (data.paymentStatus === 'Paid' || data.paymentStatus === 'Completed') {
      doc.fillColor(lightGreen).rect(360, payTop + 20, 170, 60).fill();
      doc.fillColor('#2E7D32').font('Roboto-Bold').fontSize(22).text('PAID', 360, payTop + 35, { align: 'center', width: 170 });
      doc.font('Roboto').fontSize(8).fillColor('#555555').text('PAYMENT SUCCESSFUL', 360, payTop + 60, { align: 'center', characterSpacing: 1, width: 170 });
    }

    // FOOTER
    const footerY = payTop + 150; // Dynamic, positioned closer to the content
    doc.fillColor(primaryBlue).font('Roboto-Bold').fontSize(14).text('Thank you for trusting DentalCore.', 40, footerY);
    
    doc.moveTo(40, footerY + 30).lineTo(doc.page.width - 40, footerY + 30).lineWidth(1).strokeColor(primaryBlue).stroke();
    doc.fillColor(textDark).font('Roboto').fontSize(10).text('DentalCore Dental Clinic', 0, footerY + 40, { align: 'center' });

    doc.end();
  });
};
