import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const getReportsSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Clinic Summary
    const visits = await prisma.visit.findMany({ select: { patientId: true, status: true } });
    const uniquePatientsSeen = new Set(visits.map(v => v.patientId)).size;
    const completedVisits = visits.filter(v => v.status === 'COMPLETED').length;
    const pendingVisits = visits.filter(v => v.status !== 'COMPLETED' && v.status !== 'CANCELLED').length;
    
    const totalAppointments = await prisma.appointment.count();

    // 2. Payment Summary
    const payments = await prisma.payment.findMany();
    // Use actual status from DB logic
    const isPaid = (p: any) => p.status === 'Paid' || p.status === 'Completed'; 
    const totalRevenue = payments.reduce((sum, p) => isPaid(p) ? sum + p.amount : sum, 0);
    const cashCollected = payments.reduce((sum, p) => (isPaid(p) && p.method === 'Cash') ? sum + p.amount : sum, 0);
    const gpayCollected = payments.reduce((sum, p) => (isPaid(p) && p.method === 'GPay') ? sum + p.amount : sum, 0);
    const paymentCount = payments.filter(isPaid).length;

    // 3. Medicine Dispensing Summary
    const dispensings = await prisma.dispensing.findMany({
      include: {
        items: { include: { medicine: true } }
      }
    });
    
    const dispensingTransactions = dispensings.length;
    const totalItemsDispensed = dispensings.reduce((sum, d) => sum + d.items.reduce((itemSum, item) => itemSum + item.dispensedQuantity, 0), 0);
    
    const dispensingTableData = dispensings.flatMap(d => 
      d.items.map(item => ({
        id: `${d.id}-${item.id}`,
        dispensingId: d.id,
        medicineName: item.medicine.name,
        prescribedQty: item.prescribedQuantity,
        dispensedQty: item.dispensedQuantity,
        status: d.status
      }))
    );

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
        totalItemsDispensed,
        dispensingTableData
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
