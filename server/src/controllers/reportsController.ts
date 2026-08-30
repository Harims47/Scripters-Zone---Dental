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
