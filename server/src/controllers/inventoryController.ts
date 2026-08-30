import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const status = req.query.status as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category && category !== 'all') {
      where.categoryId = category;
    }

    // Since Prisma doesn't natively support comparing two columns in simple findMany,
    // we'll get all matching items first if status filter is active
    if (status && status !== 'all-status') {
      const allMatching = await prisma.medicine.findMany({
        where,
        select: { id: true, currentStock: true, stockWarningLevel: true }
      });

      let filteredIds: string[] = [];
      if (status === 'out-of-stock') {
        filteredIds = allMatching.filter(m => m.currentStock === 0).map(m => m.id);
      } else if (status === 'low-stock') {
        filteredIds = allMatching.filter(m => m.currentStock > 0 && m.currentStock < m.stockWarningLevel).map(m => m.id);
      } else if (status === 'in-stock') {
        filteredIds = allMatching.filter(m => m.currentStock >= m.stockWarningLevel).map(m => m.id);
      }

      where.id = { in: filteredIds };
    }

    const [medicines, totalRecords] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.medicine.count({ where })
    ]);

    // For KPI stats, calculate on everything BEFORE the ID filter, but wait, the UI stats should reflect the search & category filter, but probably NOT the status filter itself so you can see "Total In Stock" even if you filtered by "Out of Stock".
    // To do this, we'll re-fetch the stats using the base where clause without the id filter.
    const statsWhere = { ...where };
    delete statsWhere.id;

    const allStocks = await prisma.medicine.findMany({
      where: statsWhere,
      select: { currentStock: true, stockWarningLevel: true }
    });

    const totalItems = allStocks.length;
    const lowStockItems = allStocks.filter(i => i.currentStock > 0 && i.currentStock < i.stockWarningLevel).length;
    const outOfStockItems = allStocks.filter(i => i.currentStock === 0).length;
    const inStockItems = totalItems - lowStockItems - outOfStockItems;

    return res.json({
      data: medicines,
      meta: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        stats: {
          totalItems,
          inStockItems,
          lowStockItems,
          outOfStockItems
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    return res.json(medicine);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { adjustmentAmount } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Must read current stock within transaction
      const med = await tx.medicine.findUnique({ where: { id } });
      if (!med) throw { status: 404, message: 'Medicine not found' };

      const newStock = med.currentStock + adjustmentAmount;
      if (newStock < 0) {
        throw { status: 409, message: `Insufficient stock. Cannot adjust by ${adjustmentAmount}. Current stock is ${med.currentStock}.` };
      }

      return tx.medicine.update({
        where: { id },
        data: { currentStock: newStock }
      });
    });

    return res.json(result);
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

import { generateCSV, generateXLSX, generatePDF, ExportColumn } from '../services/exportService';

export const exportInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const format = req.query.format as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { batchNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category && category !== 'all') {
      where.categoryId = category;
    }

    if (status && status !== 'all-status') {
      const allMatching = await prisma.medicine.findMany({
        where,
        select: { id: true, currentStock: true, stockWarningLevel: true }
      });

      let filteredIds: string[] = [];
      if (status === 'out-of-stock') {
        filteredIds = allMatching.filter(m => m.currentStock === 0).map(m => m.id);
      } else if (status === 'low-stock') {
        filteredIds = allMatching.filter(m => m.currentStock > 0 && m.currentStock < m.stockWarningLevel).map(m => m.id);
      } else if (status === 'in-stock') {
        filteredIds = allMatching.filter(m => m.currentStock >= m.stockWarningLevel).map(m => m.id);
      }

      where.id = { in: filteredIds };
    }

    const medicines = await prisma.medicine.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    const columns: ExportColumn[] = [
      { key: 'id', label: 'Medicine ID' },
      { key: 'name', label: 'Name' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'categoryId', label: 'Category ID' },
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'currentStock', label: 'Current Stock' },
      { key: 'stockWarningLevel', label: 'Warning Level' },
      { key: 'price', label: 'Price' }
    ];

    if (format === 'csv') {
      const csv = generateCSV(columns, medicines);
      res.header('Content-Type', 'text/csv');
      res.attachment('inventory_export.csv');
      return res.send(csv);
    } else if (format === 'xlsx') {
      const xlsx = await generateXLSX(columns, medicines, 'Inventory');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('inventory_export.xlsx');
      return res.send(xlsx);
    } else if (format === 'pdf') {
      const pdf = await generatePDF(columns, medicines, 'Inventory Report', `Total Items: ${medicines.length}`);
      res.header('Content-Type', 'application/pdf');
      res.attachment('inventory_export.pdf');
      return res.send(pdf);
    } else {
      return res.status(400).json({ error: 'Invalid export format' });
    }
  } catch (error) {
    next(error);
  }
};
