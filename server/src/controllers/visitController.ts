import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const checkActiveVisit = async (patientId: string) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const activeVisit = await prisma.visit.findFirst({
    where: {
      patientId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      createdAt: { gte: startOfDay }
    }
  });
  return activeVisit !== null;
};

export const startWalkInVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, doctorId, isUrgent, reasonForVisit } = req.body;

    // Validate relationships
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(400).json({ error: 'Patient does not exist' });

    if (doctorId) {
      const doctor = await prisma.staff.findUnique({ where: { id: doctorId } });
      if (!doctor) return res.status(400).json({ error: 'Doctor does not exist' });
    }

    // Validate duplicate active visit
    const hasActive = await checkActiveVisit(patientId);
    if (hasActive) return res.status(409).json({ error: 'This patient already has an active visit.' });

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const position = await tx.queueEntry.count({
        where: { createdAt: { gte: startOfDay } }
      }) + 1;
      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Create Visit
      const visit = await tx.visit.create({
        data: {
          patientId,
          doctorId: doctorId || null,
          status: 'WAITING',
          amountDue: 1500, // Matching frontend mock
          reasonForVisit,
          queueEntry: {
            create: {
              patientId,
              assignedDoctorId: doctorId || null,
              position,
              status: 'Waiting',
              priority: isUrgent || false,
              arrivalTime
            }
          }
        },
        include: { queueEntry: true }
      });

      return visit;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const checkInAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.body;

    // Validate appointment
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (['Cancelled', 'No Show'].includes(appointment.status)) {
      return res.status(409).json({ error: 'Cannot confirm arrival for a cancelled or no-show appointment.' });
    }

    if (appointment.status === 'Checked In') {
      return res.status(409).json({ error: 'Appointment is already checked in.' });
    }

    // Check duplicate visit for appointment
    const existingVisit = await prisma.visit.findUnique({ where: { appointmentId } });
    if (existingVisit) {
      return res.status(409).json({ error: 'A visit has already been created for this appointment.' });
    }

    // Check active visit for patient
    const hasActive = await checkActiveVisit(appointment.patientId);
    if (hasActive) {
      return res.status(409).json({ error: 'This patient already has an active visit.' });
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const position = await tx.queueEntry.count({
        where: { createdAt: { gte: startOfDay } }
      }) + 1;
      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const reasonForVisit = req.body.reasonForVisit || appointment.type || appointment.notes || 'General Consultation';

      // Create Visit linked to Appointment
      const visit = await tx.visit.create({
        data: {
          patientId: appointment.patientId,
          doctorId: null,
          appointmentId: appointment.id,
          reasonForVisit,
          status: 'WAITING',
          amountDue: 1500,
          queueEntry: {
            create: {
              patientId: appointment.patientId,
              assignedDoctorId: null,
              position,
              status: 'Waiting',
              priority: false,
              arrivalTime
            }
          }
        },
        include: { queueEntry: true }
      });

      // Update Appointment status
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: 'Checked In' }
      });

      return visit;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const visits = await prisma.visit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        queueEntry: true,
        consultation: true,
        prescription: { include: { items: true } },
        dispensing: { include: { items: true } }
      }
    });
    return res.json(visits);
  } catch (error) {
    next(error);
  }
};

export const getVisitById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { 
        queueEntry: true,
        consultation: true,
        prescription: { include: { items: true } },
        dispensing: { include: { items: true } }
      }
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    return res.json(visit);
  } catch (error) {
    next(error);
  }
};

export const cancelVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { queueEntry: true }
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      return res.status(400).json({ error: `Cannot cancel a visit that is already ${visit.status}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.visit.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      if (visit.queueEntry) {
        await tx.queueEntry.update({
          where: { visitId: id },
          data: { status: 'Cancelled' }
        });
      }
    });

    const updatedVisit = await prisma.visit.findUnique({
      where: { id },
      include: { queueEntry: true, payments: true }
    });

    return res.json(updatedVisit);
  } catch (error) {
    next(error);
  }
};

export const updateVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reasonForVisit, doctorId, isUrgent, amountDue } = req.body;

    const existingVisit = await prisma.visit.findUnique({
      where: { id },
      include: { queueEntry: true }
    });


    if (!existingVisit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const updatedVisit = await prisma.$transaction(async (tx) => {
      const visitData: any = {};
      if (reasonForVisit !== undefined) visitData.reasonForVisit = reasonForVisit;
      if (doctorId !== undefined) visitData.doctorId = doctorId;
      if (amountDue !== undefined) visitData.amountDue = amountDue;

      const v = await tx.visit.update({
        where: { id },
        data: visitData,
        include: {
          queueEntry: true,
          consultation: true,
          prescription: { include: { items: true } },
          dispensing: { include: { items: true } }
        }
      });

      if (isUrgent !== undefined && existingVisit.queueEntry) {
        await tx.queueEntry.update({
          where: { visitId: id },
          data: { priority: isUrgent }
        });
      }

      return v;
    });

    return res.json(updatedVisit);
  } catch (error) {
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const exportVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const stage = req.query.stage as string;
    const visitType = req.query.visitType as string;
    const format = req.query.format as string;

    const visits = await prisma.visit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        queueEntry: true,
        payments: true
      }
    });

    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.id, s.name]));

    const flatData = visits.map(v => {
      let calcStage = 'Waiting';
      if (v.status === 'CANCELLED') calcStage = 'Cancelled';
      else if (v.status === 'COMPLETED') calcStage = 'Completed';
      else if (v.queueEntry) {
        if (v.queueEntry.status === 'Waiting') calcStage = 'Waiting';
        else if (v.queueEntry.status === 'In Progress' || v.queueEntry.status === 'With Doctor' || v.queueEntry.status === 'Called') calcStage = 'With Doctor';
        else if (v.queueEntry.status === 'Transferred') calcStage = 'Transferred';
        else if (v.queueEntry.status === 'Completed') calcStage = 'Ready at Reception';
        else calcStage = v.queueEntry.status;
      }

      const totalPaid = (v.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const amountDue = v.amountDue || 0;
      let paymentStatus = '—';
      if (calcStage === 'Ready at Reception' || calcStage === 'Completed') {
        paymentStatus = 'Unpaid';
        if (amountDue > 0 && totalPaid >= amountDue) paymentStatus = 'Paid';
        else if (totalPaid > 0) paymentStatus = 'Partial';
        else if (amountDue === 0) paymentStatus = 'Paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'Partial';
      }

      const type = v.appointmentId ? 'Appointment' : 'Walk-in';
      const docName = v.doctorId ? (staffMap.get(v.doctorId) || '—') : '—';

      return {
        id: v.id,
        token: v.queueEntry?.position ? `#${v.queueEntry.position}` : '—',
        patientName: v.patient?.name || 'Unknown',
        visitType: type,
        doctor: docName,
        stage: calcStage,
        paymentStatus
      };
    });

    let filteredData = flatData;
    if (stage && stage !== 'all') {
      filteredData = filteredData.filter(d => d.stage.toLowerCase() === stage.toLowerCase());
    }
    if (visitType && visitType !== 'all') {
      filteredData = filteredData.filter(d => d.visitType.toLowerCase() === visitType.toLowerCase());
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(d =>
        d.patientName.toLowerCase().includes(searchLower) ||
        d.doctor.toLowerCase().includes(searchLower) ||
        d.token.toLowerCase().includes(searchLower)
      );
    }

    const columns: ExportColumn[] = [
      { key: 'token', label: 'Token No.' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'visitType', label: 'Visit Type' },
      { key: 'doctor', label: 'Doctor Name' },
      { key: 'stage', label: 'Stage' },
      { key: 'paymentStatus', label: 'Payment Status' }
    ];

    if (format === 'csv') {
      const csv = generateCSV(columns, filteredData);
      res.header('Content-Type', 'text/csv');
      res.attachment('reception_desk_export.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, filteredData, 'Reception Desk');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('reception_desk_export.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, filteredData, 'Reception Desk Operations Report', `Total Records: ${filteredData.length}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment('reception_desk_export.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};


