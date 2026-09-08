import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getReportsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter: any = undefined;
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    }

    // 1. Clinic Summary
    const visits = await prisma.visit.findMany({ 
      where: dateFilter,
      select: { patientId: true, status: true } 
    });
    const uniquePatientsSeen = new Set(visits.map(v => v.patientId)).size;
    const completedVisits = visits.filter(v => v.status === 'COMPLETED').length;
    const pendingVisits = visits.filter(v => v.status !== 'COMPLETED' && v.status !== 'CANCELLED').length;
    
    const totalAppointments = await prisma.appointment.count({
      where: dateFilter
    });

    // 2. Payment Summary
    const payments = await prisma.payment.findMany({
      where: dateFilter
    });
    // Use actual status from DB logic
    const isPaid = (p: any) => p.status === 'Paid' || p.status === 'Completed'; 
    const totalRevenue = payments.reduce((sum, p) => isPaid(p) ? sum + p.amount : sum, 0);
    const cashCollected = payments.reduce((sum, p) => (isPaid(p) && p.method === 'Cash') ? sum + p.amount : sum, 0);
    const gpayCollected = payments.reduce((sum, p) => (isPaid(p) && p.method === 'GPay') ? sum + p.amount : sum, 0);
    const paymentCount = payments.filter(isPaid).length;

    // 3. Medicine Dispensing Summary
    const dispensings = await prisma.dispensing.findMany({
      where: dateFilter,
      include: {
        items: { include: { medicine: true } }
      }
    });
    
    const dispensingTransactions = dispensings.length;
    const totalItemsDispensed = dispensings.reduce((sum, d) => sum + d.items.reduce((itemSum, item) => itemSum + item.dispensedQuantity, 0), 0);
    

    // 4. Inventory Snapshot
    const medicines = await prisma.medicine.findMany();
    const totalItems = medicines.length;
    const lowStockItems = medicines.filter(i => i.currentStock > 0 && i.currentStock < i.stockWarningLevel).length;
    const outOfStockItems = medicines.filter(i => i.currentStock === 0).length;

    return res.json({
      clinicSummary: {
        uniquePatientsSeen,
        completedVisits,
        pendingVisits,
        totalAppointments
      },
      paymentSummary: {
        totalRevenue,
        cashCollected,
        gpayCollected,
        paymentCount
      },
      dispensingSummary: {
        dispensingTransactions,
        totalItemsDispensed
      },
      inventorySnapshot: {
        totalItems,
        lowStockItems,
        outOfStockItems
      }
    });

  } catch (error) {
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const getClinicActivityReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reasonForVisit: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.id, s.name]));

    const [visits, totalRecords] = await Promise.all([
      prisma.visit.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: true,
          queueEntry: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.visit.count({ where })
    ]);

    const mapped = visits.map(v => {
      const docName = v.doctorId ? (staffMap.get(v.doctorId) || '—') : '—';
      const visitType = v.appointmentId ? 'Appointment' : 'Walk-in';
      const totalPaid = (v.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const balance = (v.amountDue || 0) - totalPaid;

      return {
        id: v.id,
        patientName: v.patient?.name || 'Unknown',
        visitDate: v.createdAt.toISOString(),
        doctorName: docName,
        visitType,
        reasonForVisit: v.reasonForVisit || '—',
        status: v.status,
        amountDue: v.amountDue || 0,
        totalPaid,
        balance: Math.max(0, balance)
      };
    });

    return res.json({
      data: mapped,
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

export const exportClinicActivityReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = req.query.format as string;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reasonForVisit: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.id, s.name]));

    const visits = await prisma.visit.findMany({
      where,
      include: {
        patient: true,
        queueEntry: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const flatData = visits.map(v => {
      const docName = v.doctorId ? (staffMap.get(v.doctorId) || '—') : '—';
      const visitType = v.appointmentId ? 'Appointment' : 'Walk-in';
      const totalPaid = (v.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, (v.amountDue || 0) - totalPaid);

      return {
        id: v.id,
        patientName: v.patient?.name || 'Unknown',
        visitDate: new Date(v.createdAt).toLocaleDateString(),
        doctorName: docName,
        visitType,
        reasonForVisit: v.reasonForVisit || '—',
        status: v.status,
        amountDue: `₹${v.amountDue || 0}`,
        totalPaid: `₹${totalPaid}`,
        balance: `₹${balance}`
      };
    });

    const columns: ExportColumn[] = [
      { key: 'patientName', label: 'Patient Name' },
      { key: 'visitDate', label: 'Visit Date' },
      { key: 'doctorName', label: 'Doctor Name' },
      { key: 'visitType', label: 'Visit Type' },
      { key: 'reasonForVisit', label: 'Reason for Visit' },
      { key: 'status', label: 'Visit Status' },
      { key: 'amountDue', label: 'Amount Due' },
      { key: 'totalPaid', label: 'Total Paid' },
      { key: 'balance', label: 'Balance' }
    ];

    const dateSub = (startDate && endDate)
      ? `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} | Records: ${flatData.length}`
      : `All Time | Records: ${flatData.length}`;

    if (format === 'csv') {
      const csv = generateCSV(columns, flatData);
      res.header('Content-Type', 'text/csv');
      res.attachment('clinic_activity_report.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, flatData, 'Clinic Activity');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('clinic_activity_report.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, flatData, 'Clinic Activity Report', dateSub);
      res.header('Content-Type', 'application/pdf');
      res.attachment('clinic_activity_report.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};

export const getPaymentReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const method = req.query.method as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (method && method !== 'all') {
      where.method = method;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.id, s.name]));

    const [payments, totalRecords] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          patient: true,
          visit: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    const mapped = payments.map(p => {
      const docName = p.visit?.doctorId ? (staffMap.get(p.visit.doctorId) || '—') : '—';
      return {
        id: p.id,
        patientName: p.patient?.name || 'Unknown',
        doctorName: docName,
        visitId: p.visitId,
        paymentDate: p.createdAt.toISOString(),
        method: p.method,
        amount: p.amount,
        status: p.status,
        notes: p.notes || '—'
      };
    });

    return res.json({
      data: mapped,
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

export const exportPaymentReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const method = req.query.method as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const format = req.query.format as string;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (method && method !== 'all') {
      where.method = method;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const staffMembers = await prisma.staff.findMany();
    const staffMap = new Map(staffMembers.map(s => [s.id, s.name]));

    const payments = await prisma.payment.findMany({
      where,
      include: {
        patient: true,
        visit: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const flatData = payments.map(p => {
      const docName = p.visit?.doctorId ? (staffMap.get(p.visit.doctorId) || '—') : '—';
      return {
        id: p.id,
        patientName: p.patient?.name || 'Unknown',
        doctorName: docName,
        visitId: p.visitId,
        paymentDate: new Date(p.createdAt).toLocaleDateString(),
        method: p.method,
        amount: `₹${p.amount}`,
        status: p.status,
        notes: p.notes || '—'
      };
    });

    const columns: ExportColumn[] = [
      { key: 'id', label: 'Payment ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'paymentDate', label: 'Payment Date' },
      { key: 'method', label: 'Method' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes / Reason' }
    ];

    const dateSub = (startDate && endDate)
      ? `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()} | Records: ${flatData.length}`
      : `All Time | Records: ${flatData.length}`;

    if (format === 'csv') {
      const csv = generateCSV(columns, flatData);
      res.header('Content-Type', 'text/csv');
      res.attachment('payment_report.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, flatData, 'Payments');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('payment_report.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, flatData, 'Payment Transactions Report', dateSub);
      res.header('Content-Type', 'application/pdf');
      res.attachment('payment_report.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};

