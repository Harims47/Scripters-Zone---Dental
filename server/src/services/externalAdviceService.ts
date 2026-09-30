import PDFDocument from 'pdfkit';
import { prisma } from '../db';
import { BrevoAdapter } from './communication/providers/BrevoAdapter';
import { getClinicBranding, cleanDoctorName, formatHumanDate, ClinicBranding } from './pdf/clinicBranding';
import { PDF_THEME } from './pdf/pdfTheme';
import {
  initPDFDocument,
  renderClinicHeader,
  renderDocumentTitle,
  renderUnifiedInfoCard,
  renderSectionHeader,
  finalizeDocumentWithFooters
} from './pdf/pdfComponents';

export interface ExternalAdvicePayload {
  visitId: string;
  patientId: string;
  doctorId?: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone?: string;
  speciality: string;
  hospitalClinic?: string;
  medicalCondition: string;
  plannedProcedure: string;
  clinicalQuery: string;
}

export class ExternalAdviceService {
  private static emailProvider = new BrevoAdapter();

  /**
   * Send referral / clearance email to the external physician
   */
  public static async sendAdviceEmail(adviceId: string): Promise<boolean> {
    const advice = await prisma.externalDoctorAdvice.findUnique({
      where: { id: adviceId },
      include: {
        patient: true,
        visit: {
          include: {
            consultation: true
          }
        }
      }
    });

    if (!advice || !advice.doctorEmail) {
      throw new Error('Advice record or doctor email not found');
    }

    const branding = getClinicBranding();

    // Fetch doctor name
    let treatingDoctorName = 'Treating Dental Surgeon';
    if (advice.doctorId) {
      const staffDoc = await prisma.staff.findUnique({ where: { id: advice.doctorId } });
      if (staffDoc) {
        treatingDoctorName = cleanDoctorName(staffDoc.name);
      }
    }

    const patientAgeGender = [
      advice.patient.age ? `${advice.patient.age} Yrs` : null,
      advice.patient.gender || null
    ].filter(Boolean).join(', ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f766e; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px; }
    .badge { display: inline-block; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; font-size: 11px; font-weight: 600; padding: 3px 8px; rounded: 4px; text-transform: uppercase; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .card h3 { margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
    .row { display: flex; margin-bottom: 6px; font-size: 13px; }
    .label { width: 140px; color: #64748b; font-weight: 600; }
    .value { flex: 1; color: #0f172a; font-weight: 500; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f766e; border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .highlight-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
    .query-box { background: #f0fdfa; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #115e59; white-space: pre-line; }
    .footer { background: #f1f5f9; padding: 20px 28px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .action-note { margin-top: 20px; font-size: 13px; color: #334155; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${branding.name}</h1>
      <p>${branding.address ? branding.address + ' • ' : ''}Phone: ${branding.phone || '—'}</p>
    </div>
    
    <div class="content">
      <div style="text-align: right; margin-bottom: 12px;">
        <span class="badge">Clinical Advice / Clearance Request</span>
      </div>

      <p style="margin: 0 0 14px 0; font-size: 14px;">
        <strong>Dear Dr. ${advice.doctorName}</strong> ${advice.speciality ? `(${advice.speciality})` : ''},
        ${advice.hospitalClinic ? `<br><span style="color: #64748b; font-size: 12px;">${advice.hospitalClinic}</span>` : ''}
      </p>

      <p style="font-size: 13px; color: #334155; margin-bottom: 16px;">
        Greetings from <strong>${branding.name}</strong>. We have evaluated the patient detailed below for planned dental treatment. Given the patient's underlying medical condition, we kindly request your expert advice and medical clearance before proceeding with the intervention.
      </p>

      <div class="card">
        <h3>Patient Information</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 140px; font-weight: 600;">Patient Name:</td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${advice.patient.name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Age / Gender:</td>
            <td style="padding: 4px 0; color: #0f172a;">${patientAgeGender || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Contact Phone:</td>
            <td style="padding: 4px 0; color: #0f172a;">${advice.patient.phone || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Consultation Date:</td>
            <td style="padding: 4px 0; color: #0f172a;">${new Date(advice.createdAt).toLocaleDateString()}</td>
          </tr>
        </table>
      </div>

      <div class="section-title">1. Patient Medical Condition / History</div>
      <div class="highlight-box">
        <strong>Reported Comorbidities & Medical Status:</strong><br>
        ${advice.medicalCondition}
      </div>

      <div class="section-title">2. Proposed Dental Procedure</div>
      <p style="font-size: 13px; color: #0f172a; background: #ffffff; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 6px;">
        <strong>Planned Treatment:</strong> ${advice.plannedProcedure}
      </p>

      <div class="section-title">3. Specific Clinical Advice & Clearance Sought</div>
      <div class="query-box">
${advice.clinicalQuery}
      </div>

      <div class="action-note">
        <p><strong>Please Reply with Your Clinical Opinion:</strong></p>
        <p>Kindly reply directly to this email (<a href="mailto:${branding.email || 'clinic@rafidental.com'}">${branding.email || 'clinic@rafidental.com'}</a>) or contact Dr. ${treatingDoctorName} at <strong>${branding.phone || 'our clinic'}</strong> with your advice, required precautions, or medication adjustments.</p>
      </div>

      <div style="margin-top: 30px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 13px;">
        <p style="margin: 0; font-weight: 700; color: #0f172a;">${treatingDoctorName}</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Dental Surgeon • ${branding.name}</p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;">This is a confidential medical communication intended solely for the designated specialist.</p>
      <p style="margin: 0;">${branding.name} • ${branding.phone || ''} • ${branding.email || ''}</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const subject = `Medical Advice & Clearance Request: ${advice.patient.name} - ${branding.name}`;

    const sendRes = await this.emailProvider.sendEmail({
      recipientEmail: advice.doctorEmail,
      recipientName: advice.doctorName,
      subject,
      htmlContent,
      providerReference: `advice_${advice.id}`
    });

    if (sendRes.success) {
      await prisma.externalDoctorAdvice.update({
        where: { id: adviceId },
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      });
      return true;
    } else {
      console.error('Failed to send external advice email:', sendRes.error);
      return false;
    }
  }

  /**
   * Generate an official Referral / Medical Clearance Request PDF Letter
   */
  public static async generateAdvicePDF(adviceId: string): Promise<Buffer> {
    const advice = await prisma.externalDoctorAdvice.findUnique({
      where: { id: adviceId },
      include: {
        patient: true,
        visit: true
      }
    });

    if (!advice) {
      throw new Error('Advice record not found');
    }

    const branding = getClinicBranding();

    let treatingDoctorName = 'Dr. N MOHAMED RAFI B D S';
    if (advice.doctorId) {
      const staffDoc = await prisma.staff.findUnique({ where: { id: advice.doctorId } });
      if (staffDoc) {
        treatingDoctorName = cleanDoctorName(staffDoc.name);
      }
    }

    return new Promise((resolve, reject) => {
      const doc = initPDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const margin = 40;
      let currentY = renderClinicHeader(doc, branding, { margin });

      // Title Banner
      currentY = renderDocumentTitle(
        doc,
        'MEDICAL ADVICE & CLEARANCE REQUEST',
        undefined,
        { text: 'REF', color: PDF_THEME.colors.primaryTeal, bg: PDF_THEME.colors.headerBg },
        currentY,
        margin
      );
      currentY += 8;

      // Addressed To (External Specialist Card)
      const leftItems = [
        { label: 'Patient Name :', value: advice.patient.name },
        { label: 'Age / Gender :', value: `${advice.patient.age || '—'} Yrs / ${advice.patient.gender || '—'}` },
        { label: 'Phone No :', value: advice.patient.phone || '—' },
        { label: 'Date :', value: formatHumanDate(new Date(advice.createdAt).toISOString()) }
      ];

      const rightItems = [
        { label: 'Addressed To :', value: `Dr. ${advice.doctorName}` },
        { label: 'Speciality :', value: advice.speciality || 'Specialist Physician' },
        { label: 'Hospital/Clinic :', value: advice.hospitalClinic || '—' },
        { label: 'Doctor Email :', value: advice.doctorEmail || '—' }
      ];

      currentY = renderUnifiedInfoCard(doc, {
        leftItems,
        rightItems,
        y: currentY,
        margin
      });
      currentY += 18;

      // Section 1: Clinical Background & Comorbidities
      currentY = renderSectionHeader(doc, '1. PATIENT MEDICAL CONDITION / COMORBIDITIES', currentY, margin);
      currentY += 6;

      doc.font(PDF_THEME.fonts.bold)
        .fontSize(8.5)
        .fillColor(PDF_THEME.colors.textDark)
        .text('Relevant Medical History:', margin + 6, currentY);
      currentY += 13;

      doc.font(PDF_THEME.fonts.regular)
        .fontSize(9)
        .fillColor(PDF_THEME.colors.textMuted)
        .text(advice.medicalCondition || 'No medical condition recorded', margin + 6, currentY, {
          width: doc.page.width - margin * 2 - 12
        });
      currentY = doc.y + 14;

      // Section 2: Planned Dental Treatment
      currentY = renderSectionHeader(doc, '2. PROPOSED DENTAL PROCEDURE', currentY, margin);
      currentY += 6;

      doc.font(PDF_THEME.fonts.bold)
        .fontSize(8.5)
        .fillColor(PDF_THEME.colors.textDark)
        .text('Planned Intervention:', margin + 6, currentY);
      currentY += 13;

      doc.font(PDF_THEME.fonts.regular)
        .fontSize(9)
        .fillColor(PDF_THEME.colors.textMuted)
        .text(advice.plannedProcedure || 'Routine dental procedure', margin + 6, currentY, {
          width: doc.page.width - margin * 2 - 12
        });
      currentY = doc.y + 14;

      // Section 3: Clinical Advice / Questions
      currentY = renderSectionHeader(doc, '3. CLINICAL ADVICE & CLEARANCE QUESTIONS SOUGHT', currentY, margin);
      currentY += 6;

      doc.font(PDF_THEME.fonts.regular)
        .fontSize(8.5)
        .fillColor(PDF_THEME.colors.textDark)
        .text(advice.clinicalQuery || 'Clinical opinion on patient suitability for dental treatment under local anesthesia.', margin + 6, currentY, {
          width: doc.page.width - margin * 2 - 12,
          lineGap: 3
        });
      currentY = doc.y + 16;

      // Section 4: Physician Clearance Response Slip (Physical Fill-In)
      currentY = renderSectionHeader(doc, '4. PHYSICIAN / SPECIALIST CLEARANCE RESPONSE', currentY, margin);
      currentY += 8;

      const boxX = margin;
      const boxWidth = doc.page.width - margin * 2;
      const boxHeight = 90;

      doc.rect(boxX, currentY, boxWidth, boxHeight)
        .lineWidth(0.8)
        .strokeColor(PDF_THEME.colors.borderLight)
        .fillAndStroke(PDF_THEME.colors.bgLight, PDF_THEME.colors.borderLight);

      doc.font(PDF_THEME.fonts.bold)
        .fontSize(8.5)
        .fillColor(PDF_THEME.colors.textDark)
        .text('Medical Opinion & Advice (To be completed by Specialist Physician):', boxX + 10, currentY + 8);

      const checkY = currentY + 23;
      doc.font(PDF_THEME.fonts.regular).fontSize(8).fillColor(PDF_THEME.colors.textDark);
      doc.text('[   ]  FIT TO PROCEED with planned procedure under Local Anesthesia', boxX + 12, checkY);
      doc.text('[   ]  FIT WITH PRECAUTIONS (Specify medication pause / antibiotic prophylaxis below)', boxX + 12, checkY + 14);
      doc.text('[   ]  UNFIT / CONTRAINDICATED at present (Defer treatment)', boxX + 12, checkY + 28);

      doc.text('Physician Remarks / Instructions: ____________________________________________________________________', boxX + 12, checkY + 46);

      const signLineY = checkY + 70;
      doc.text('Doctor Signature & Stamp: _______________________      Date: _______________', boxX + 12, signLineY);

      currentY += boxHeight + 16;

      // Treating Dental Doctor Signature Block
      const sigX = doc.page.width - margin - 200;
      doc.font(PDF_THEME.fonts.bold)
        .fontSize(9)
        .fillColor(PDF_THEME.colors.textDark)
        .text(`Dr. ${treatingDoctorName}`, sigX, currentY, { width: 200, align: 'right' });
      currentY += 12;

      doc.font(PDF_THEME.fonts.regular)
        .fontSize(8)
        .fillColor(PDF_THEME.colors.textLight)
        .text(`Treating Dental Surgeon • ${branding.name}`, sigX, currentY, { width: 200, align: 'right' });
      if (branding.phone) {
        currentY += 10;
        doc.text(`Ph: ${branding.phone}`, sigX, currentY, { width: 200, align: 'right' });
      }

      finalizeDocumentWithFooters(doc, branding, {
        disclaimer: 'This medical advice request is for clinical decision-making and patient safety during dental intervention.'
      });

      doc.end();
    });
  }
}
