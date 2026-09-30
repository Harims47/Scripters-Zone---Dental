import { Request, Response } from 'express';
import { prisma } from '../db';
import { ExternalAdviceService } from '../services/externalAdviceService';

export class ExternalAdviceController {
  /**
   * Create an external doctor advice / clearance request
   */
  public static async createAdvice(req: Request, res: Response) {
    try {
      const {
        visitId,
        patientId,
        doctorId,
        doctorName,
        doctorEmail,
        doctorPhone,
        speciality,
        hospitalClinic,
        medicalCondition,
        plannedProcedure,
        clinicalQuery,
        sendEmailNow = true
      } = req.body;

      if (!visitId || !patientId || !doctorName || !doctorEmail) {
        return res.status(400).json({ error: 'visitId, patientId, doctorName and doctorEmail are required' });
      }

      // Verify visit and patient exist
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: { patient: true }
      });

      if (!visit) {
        return res.status(404).json({ error: 'Visit not found' });
      }

      const advice = await prisma.externalDoctorAdvice.create({
        data: {
          visitId,
          patientId,
          doctorId: doctorId || visit.doctorId || null,
          doctorName: doctorName.trim(),
          doctorEmail: doctorEmail.trim(),
          doctorPhone: doctorPhone?.trim() || null,
          speciality: speciality?.trim() || 'General Physician',
          hospitalClinic: hospitalClinic?.trim() || null,
          medicalCondition: medicalCondition?.trim() || 'Comorbidity / Condition requires evaluation',
          plannedProcedure: plannedProcedure?.trim() || 'Dental treatment under Local Anesthesia',
          clinicalQuery: clinicalQuery?.trim() || 'Clinical evaluation and clearance for dental procedure',
          status: 'PENDING'
        }
      });

      let emailSent = false;
      if (sendEmailNow) {
        try {
          emailSent = await ExternalAdviceService.sendAdviceEmail(advice.id);
        } catch (err: any) {
          console.error('Email sending error:', err.message);
        }
      }

      const updated = await prisma.externalDoctorAdvice.findUnique({
        where: { id: advice.id },
        include: { patient: true }
      });

      return res.status(201).json({
        advice: updated,
        emailSent,
        message: emailSent
          ? `Advice request created and email successfully sent to Dr. ${doctorName}`
          : `Advice request created for Dr. ${doctorName}`
      });
    } catch (err: any) {
      console.error('Error creating external advice request:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Get all external advice requests for a specific visit
   */
  public static async getByVisit(req: Request, res: Response) {
    try {
      const visitId = String(req.params.visitId);
      const list = await prisma.externalDoctorAdvice.findMany({
        where: { visitId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(list);
    } catch (err: any) {
      console.error('Error fetching external advice by visit:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Download / stream Referral PDF letter
   */
  public static async getPDF(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const pdfBuffer = await ExternalAdviceService.generateAdvicePDF(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Medical_Advice_Request_${id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error('Error generating external advice PDF:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Resend email to external doctor
   */
  public static async resendEmail(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const emailSent = await ExternalAdviceService.sendAdviceEmail(id);
      return res.json({ success: emailSent, message: emailSent ? 'Email sent successfully' : 'Failed to send email' });
    } catch (err: any) {
      console.error('Error resending external advice email:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * Update external advice status & physician response
   */
  public static async updateAdvice(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, doctorResponse } = req.body;

      const updated = await prisma.externalDoctorAdvice.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(doctorResponse !== undefined ? { doctorResponse } : {})
        }
      });

      return res.json(updated);
    } catch (err: any) {
      console.error('Error updating external advice:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}
