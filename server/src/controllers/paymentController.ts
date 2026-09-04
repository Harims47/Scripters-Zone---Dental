import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [payments, totalRecords] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: { patient: true, visit: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    return res.json({
      data: payments,
      meta: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id as string },
      include: { patient: true, visit: true }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    return res.json(payment);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visitId, amount, method } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Lock the visit row to prevent concurrent partial payment races
      await tx.$executeRawUnsafe('SELECT 1 FROM "Visit" WHERE id = $1 FOR UPDATE', visitId);

      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        include: { patient: true, payments: true, prescription: true }
      });

      if (!visit) throw { status: 404, message: 'Visit not found' };

      const totalPaid = visit.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const expectedAmount = visit.amountDue || 0;
      const balance = expectedAmount - totalPaid;

      if (balance <= 0) {
        throw { status: 409, message: 'Payment already completed for this visit.' };
      }

      // Check state readiness
      if (visit.status === 'READY_FOR_RECEPTION') {
        // If there's a prescription but no dispensing, it's not ready
        if (visit.prescription) {
          const disp = await tx.dispensing.findUnique({ where: { visitId } });
          if (!disp) {
            throw { status: 409, message: 'Visit requires dispensing before payment can be collected.' };
          }
        }
      } else if (visit.status !== 'READY_FOR_PAYMENT') {
        throw { status: 409, message: `Cannot process payment for visit in status: ${visit.status}` };
      }

      if (amount <= 0) {
        throw { status: 400, message: 'Payment amount must be greater than zero.' };
      }

      if (amount > balance) {
        throw { status: 400, message: `Payment amount (₹${amount}) exceeds remaining balance (₹${balance}).` };
      }

      // Create Payment
      const payment = await tx.payment.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          amount,
          method,
          status: 'Completed',
          date: new Date().toISOString()
        }
      });

      // Update Visit Status ONLY if fully paid
      let updatedVisit = visit;
      const newBalance = balance - amount;
      
      if (newBalance === 0) {
        updatedVisit = await tx.visit.update({
          where: { id: visit.id },
          data: { status: 'COMPLETED' }
        });
        
        // Also ensure QueueEntry is marked Completed if we auto-completed the visit
        const qEntry = await tx.queueEntry.findUnique({ where: { visitId: visit.id } });
        if (qEntry && qEntry.status !== 'Completed') {
          await tx.queueEntry.update({
            where: { id: qEntry.id },
            data: { status: 'Completed' }
          });
        }
      }

      // Note: Do NOT touch stock here. It was deducted in Dispensing.

      return { payment, visit: updatedVisit };
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const exportPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const format = req.query.format as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    });

    const formattedData = payments.map(p => ({
      id: p.id,
      patientName: p.patient?.name || 'Unknown',
      amount: p.amount,
      method: p.method,
      status: p.status,
      date: p.date
    }));

    const columns: ExportColumn[] = [
      { key: 'id', label: 'Payment ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'amount', label: 'Amount' },
      { key: 'method', label: 'Method' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date' }
    ];

    if (format === 'csv') {
      const csv = generateCSV(columns, formattedData);
      res.header('Content-Type', 'text/csv');
      res.attachment('payments_export.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, formattedData, 'Payments');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('payments_export.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, formattedData, 'Payments Report', `Total Records: ${formattedData.length}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment('payments_export.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};
