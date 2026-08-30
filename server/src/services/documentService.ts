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
    // 0 margin to allow full-bleed header/footer
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

    // Colors
    const primaryBlue = '#0B5B9E';
    
    // --- TOP HEADER ---
    
    // Top right blue rectangle
    doc.fillColor(primaryBlue)
       .rect(300, 30, doc.page.width - 300, 70)
       .fill();
    
    // Logo text (left side)
    doc.font('Roboto-Bold')
       .fontSize(36)
       .fillColor(primaryBlue)
       .text('Dental', 40, 45, { continued: true }).fillColor('#1E88E5').text('Core');
       
    doc.font('Roboto')
       .fontSize(12)
       .fillColor('#555555')
       .text('Dental Clinic', 42, 80);

    // Doctor info (right side in white)
    doc.font('Roboto-Bold')
       .fontSize(12)
       .fillColor('white')
       .text(data.doctorName ? `Dr. ${data.doctorName.replace(/^Dr\.\s*/i, '')}` : 'Doctor', 260, 55, { align: 'right', width: 300 });

    // --- PATIENT ROW ---
    const yPos = 140;
    
    doc.font('Roboto')
       .fontSize(10)
       .fillColor('black');
       
    doc.text(`Patient Name: ${data.patientName}`, 40, yPos);
    doc.text(`Date: ${data.visitDate}`, 420, yPos);

    // Line under patient row
    doc.moveTo(40, yPos + 15)
       .lineTo(doc.page.width - 40, yPos + 15)
       .lineWidth(0.5)
       .strokeColor('#cccccc')
       .stroke();

    // --- PRESCRIPTION TITLE ---
    let currentY = yPos + 40;
    doc.fontSize(16).font('Roboto-Bold').fillColor('#000000').text('PRESCRIPTION', 0, currentY, { align: 'center', characterSpacing: 2 });
    currentY += 40;

    // --- PRESCRIPTION BODY ---
    doc.fontSize(18).font('Roboto-Bold').fillColor(primaryBlue).text('Rx', 40, currentY);
    currentY += 30;

    data.items.forEach((item: any, index: number) => {
      doc.fontSize(12).font('Roboto-Bold').fillColor('black').text(`${index + 1}. ${item.medicineName}`, 50, currentY);
      
      const details = [];
      if (item.quantity) details.push(`Qty: ${item.quantity}`);
      if (item.dosage) details.push(`Dosage: ${item.dosage}`);
      if (item.duration) details.push(`Duration: ${item.duration}`);
      
      currentY += 15;
      doc.fontSize(10).font('Roboto').fillColor('#333333').text(details.join(' | '), 65, currentY);
      
      if (item.instructions) {
        currentY += 12;
        doc.fillColor('gray').text(`Instructions: ${item.instructions}`, 65, currentY).fillColor('black');
      }
      currentY += 25;
    });

    // --- BOTTOM FOOTER ---
    const footerHeight = 60;
    const footerY = doc.page.height - footerHeight;

    // Draw wave and rectangle
    doc.fillColor('#0B5B9E');
    doc.moveTo(0, footerY);
    doc.quadraticCurveTo(doc.page.width / 2, footerY - 20, doc.page.width, footerY);
    doc.lineTo(doc.page.width, doc.page.height);
    doc.lineTo(0, doc.page.height);
    doc.fill();

    doc.fillColor('white');
    doc.font('Roboto-Bold').fontSize(12).text('DentalCore Dental Clinic', 40, footerY + 15);
    doc.font('Roboto').fontSize(10);
    doc.text('Thank you for trusting DentalCore.', 40, footerY + 30);

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
