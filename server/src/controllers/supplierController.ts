import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchaseOrders: true, bills: true }
        },
        bills: {
          where: { status: { not: 'Cancelled' } },
          select: {
            amount: true,
            payments: {
              select: { amount: true }
            }
          }
        }
      }
    });

    const formatted = suppliers.map(s => {
      const totalBilled = s.bills.reduce((sum, b) => sum + b.amount, 0);
      const totalPaid = s.bills.reduce((sum, b) => sum + b.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
      const outstandingBalance = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);

      const { bills, ...rest } = s;
      return {
        ...rest,
        financials: {
          totalBills: s._count.bills,
          totalBilled: Math.round(totalBilled * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          outstandingBalance
        }
      };
    });

    return res.json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    return res.json(supplier);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contactPerson, phone, email, address, status } = req.body;

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson,
        phone,
        email: email || null,
        address,
        status: status || 'Active'
      }
    });

    return res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const { name, contactPerson, phone, email, address, status } = req.body;

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address }),
        ...(status !== undefined && { status })
      }
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deactivateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Always prefer setting status to Inactive to preserve historical Purchase Orders
    const updated = await prisma.supplier.update({
      where: { id },
      data: { status: 'Inactive' }
    });

    return res.json({ message: 'Supplier marked as Inactive', supplier: updated });
  } catch (error) {
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const exportSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const format = req.query.format as string;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    const columns: ExportColumn[] = [
      { key: 'name', label: 'Supplier Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'status', label: 'Status' }
    ];

    if (format === 'csv') {
      const csv = generateCSV(columns, suppliers);
      res.header('Content-Type', 'text/csv');
      res.attachment('suppliers_export.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, suppliers, 'Suppliers');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('suppliers_export.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, suppliers, 'Suppliers Directory', `Total Suppliers: ${suppliers.length}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment('suppliers_export.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};

