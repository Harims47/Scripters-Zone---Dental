import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      include: { visit: { include: { patient: true } } }
    });
    return res.json(queue);
  } catch (error) {
    next(error);
  }
};

export const getQueueEntryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const entry = await prisma.queueEntry.findUnique({
      where: { id },
      include: { visit: true }
    });
    if (!entry) return res.status(404).json({ error: 'Queue entry not found' });
    return res.json(entry);
  } catch (error) {
    next(error);
  }
};

export const transitionQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { action } = req.body;
    
    // Authorization checks based on action
    const userRole = (req as any).user.role;
    
    if (action === 'CALL_PATIENT') {
      if (!['Head Doctor', 'Receptionist'].includes(userRole)) {
        return res.status(403).json({ error: 'Unauthorized to call patient' });
      }
    } else if (action === 'START_CONSULTATION') {
      if (!['Head Doctor', 'Duty Doctor'].includes(userRole)) {
        return res.status(403).json({ error: 'Unauthorized to start consultation' });
      }
    }

    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id },
      include: { visit: true }
    });
    
    if (!queueEntry) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    const visit = queueEntry.visit;

    // Allowed Visit Transitions Dictionary (from frontend visit-status.ts)
    const allowedTransitions: Record<string, string[]> = {
      'ARRIVED': ['WAITING', 'CANCELLED'],
      'WAITING': ['CALLED', 'WITH_DOCTOR', 'CANCELLED'],
      'CALLED': ['WITH_DOCTOR', 'WAITING', 'CANCELLED'],
      'WITH_DOCTOR': ['READY_FOR_RECEPTION', 'READY_FOR_PAYMENT', 'COMPLETED'],
      'READY_FOR_RECEPTION': ['READY_FOR_PAYMENT'],
      'READY_FOR_PAYMENT': ['PAID'],
      'PAID': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    let targetVisitStatus = visit.status;
    let targetQueueStatus = queueEntry.status;

    if (action === 'CALL_PATIENT') {
      targetVisitStatus = 'CALLED';
      targetQueueStatus = 'Called';
    } else if (action === 'START_CONSULTATION') {
      targetVisitStatus = 'WITH_DOCTOR';
      targetQueueStatus = 'With Doctor';
    }

    if (!allowedTransitions[visit.status]?.includes(targetVisitStatus)) {
      return res.status(409).json({ error: `Invalid visit transition from ${visit.status} to ${targetVisitStatus}` });
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedVisit = await tx.visit.update({
        where: { id: visit.id },
        data: { status: targetVisitStatus }
      });

      const updatedQueue = await tx.queueEntry.update({
        where: { id: queueEntry.id },
        data: { status: targetQueueStatus }
      });

      return { queueEntry: updatedQueue, visit: updatedVisit };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const exportQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const format = req.query.format as string;

    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      include: { visit: { include: { patient: true } } }
    });

    const flatData = queue.map(q => ({
      queueId: q.id,
      patientName: q.visit?.patient?.name || 'Unknown',
      position: q.position,
      status: q.status,
      priority: q.priority ? 'Yes' : 'No',
      arrivalTime: q.arrivalTime
    }));

    let filteredData = flatData;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = flatData.filter(d => 
        d.patientName.toLowerCase().includes(searchLower) ||
        d.queueId.toLowerCase().includes(searchLower)
      );
    }

    const columns: ExportColumn[] = [
      { key: 'queueId', label: 'Queue ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'position', label: 'Position' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'arrivalTime', label: 'Arrival Time' }
    ];

    if (format === 'csv') {
      const csv = generateCSV(columns, filteredData);
      res.header('Content-Type', 'text/csv');
      res.attachment('queue_export.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, filteredData, 'Queue');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('queue_export.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, filteredData, 'Queue Report', `Total Patients in Queue: ${filteredData.length}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment('queue_export.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};
