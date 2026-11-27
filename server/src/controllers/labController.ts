import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const DEFAULT_LABS = [
  {
    name: 'DentCraft Ceramics',
    contactPerson: 'Mr. Suresh (Senior Ceramicist)',
    phone: '9876543210',
    email: 'info@dentcraftceramics.com',
    address: 'No. 14, Anna Nagar 2nd Avenue, Chennai',
    color: '#0D9488', // Teal
    notes: 'Specializes in Zirconia crowns, porcelain veneers, and layered bridges'
  },
  {
    name: 'Apex Precision Dental Lab',
    contactPerson: 'Mr. Rajesh (CAD/CAM Technician)',
    phone: '9841234567',
    email: 'orders@apexprecisionlab.com',
    address: 'Plot 45, Industrial Estate, Guindy, Chennai',
    color: '#2563EB', // Royal Blue
    notes: 'Digital CAD/CAM milled crowns, titanium custom abutments, and implant prosthetics'
  },
  {
    name: 'SmileLine Prosthetics',
    contactPerson: 'Mr. Anand (Chief Prosthetist)',
    phone: '9789012345',
    email: 'support@smilelineprosthetics.com',
    address: 'Old No. 8, Kilpauk Garden Road, Chennai',
    color: '#9333EA', // Purple
    notes: 'Cast partial dentures, flexible dentures, complete dentures, and night guards'
  },
  {
    name: 'OrthoTech & Aligners Lab',
    contactPerson: 'Dr. K. Swaminathan',
    phone: '9884567890',
    email: 'swami@orthotechlab.com',
    address: '7th Cross St, Shastri Nagar, Adyar, Chennai',
    color: '#EA580C', // Orange
    notes: 'Clear aligners, Hawley retainers, twin block and functional orthodontic appliances'
  }
];

/**
 * Get all active dental labs with aggregated order statistics
 */
export const getLabs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let labs = await prisma.dentalLab.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Auto-seed default labs if clinic has no labs registered yet
    if (labs.length === 0) {
      for (const def of DEFAULT_LABS) {
        await prisma.dentalLab.create({ data: def });
      }
      labs = await prisma.dentalLab.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    }

    // Ensure unique labs by name (prevent accidental duplicate accordions)
    const seenNames = new Set<string>();
    const uniqueLabs: typeof labs = [];
    for (const l of labs) {
      const lower = l.name.toLowerCase().trim();
      if (!seenNames.has(lower)) {
        seenNames.add(lower);
        uniqueLabs.push(l);
      }
    }
    labs = uniqueLabs;

    // Attach request counts for each lab
    const labIds = labs.map(l => l.id);
    const requests = await prisma.labRequest.findMany({
      where: { labId: { in: labIds } },
      select: { labId: true, status: true }
    });

    const statsMap = new Map<string, { total: number; pending: number; received: number }>();
    for (const r of requests) {
      const cur = statsMap.get(r.labId) || { total: 0, pending: 0, received: 0 };
      cur.total += 1;
      if (r.status === 'Received') {
        cur.received += 1;
      } else {
        cur.pending += 1;
      }
      statsMap.set(r.labId, cur);
    }

    const labsWithStats = labs.map(lab => {
      const stats = statsMap.get(lab.id) || { total: 0, pending: 0, received: 0 };
      return {
        ...lab,
        totalRequests: stats.total,
        pendingRequests: stats.pending,
        receivedRequests: stats.received
      };
    });

    return res.json(labsWithStats);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new dental lab
 */
export const createLab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contactPerson, phone, email, address, color, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Lab name is required' });
    }

    const trimmedName = name.trim();

    // Prevent duplicate lab creation
    const existing = await prisma.dentalLab.findFirst({
      where: { name: trimmedName }
    });

    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ error: `A dental lab named "${trimmedName}" already exists.` });
      }
      // Re-activate previously deactivated lab
      const reactivated = await prisma.dentalLab.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          contactPerson: contactPerson?.trim() || existing.contactPerson,
          phone: phone?.trim() || existing.phone,
          email: email?.trim() || existing.email,
          address: address?.trim() || existing.address,
          color: color?.trim() || existing.color,
          notes: notes?.trim() || existing.notes
        }
      });
      return res.json(reactivated);
    }

    const lab = await prisma.dentalLab.create({
      data: {
        name: trimmedName,
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        color: color?.trim() || '#0D9488',
        notes: notes?.trim() || null
      }
    });

    return res.status(201).json(lab);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing dental lab
 */
export const updateLab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, contactPerson, phone, email, address, color, notes, isActive } = req.body;

    const existing = await prisma.dentalLab.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Dental Lab not found' });

    const updated = await prisma.dentalLab.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(color !== undefined && { color: color?.trim() || '#0D9488' }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / deactivate a dental lab
 */
export const deleteLab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.dentalLab.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Dental Lab not found' });

    // Check if there are orders linked to this lab
    const orderCount = await prisma.labRequest.count({ where: { labId: id } });
    if (orderCount > 0) {
      // Soft-delete so historical records remain intact
      await prisma.dentalLab.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ message: 'Lab deactivated successfully' });
    }

    await prisma.dentalLab.delete({ where: { id } });
    return res.json({ message: 'Lab deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all lab requests with filtering
 */
export const getLabRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { labId, patientId, status, search } = req.query;

    const where: any = {};
    if (labId) where.labId = String(labId);
    if (patientId) where.patientId = String(patientId);
    if (status && status !== 'all') where.status = String(status);

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { patient: { name: { contains: q } } },
        { patient: { phone: { contains: q } } },
        { workType: { contains: q } },
        { toothNumbers: { contains: q } },
        { shade: { contains: q } },
        { instructions: { contains: q } },
        { lab: { name: { contains: q } } }
      ];
    }

    const requests = await prisma.labRequest.findMany({
      where,
      include: {
        lab: true,
        patient: { select: { id: true, name: true, phone: true, age: true, gender: true } },
        visit: { select: { id: true, visitDate: true, reasonForVisit: true } },
        treatmentPlanItem: {
          include: {
            catalogItem: { select: { id: true, name: true, category: true, variant: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(requests);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lab request
 */
export const createLabRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      labId,
      patientId,
      treatmentPlanItemId,
      visitId,
      doctorId,
      workType,
      toothNumbers,
      shade,
      expectedDeliveryDate,
      instructions,
      cost
    } = req.body;

    if (!labId) return res.status(400).json({ error: 'Lab selection is required' });
    if (!patientId) return res.status(400).json({ error: 'Patient is required' });
    if (!workType || !workType.trim()) return res.status(400).json({ error: 'Work type is required' });

    const lab = await prisma.dentalLab.findUnique({ where: { id: labId } });
    if (!lab) return res.status(404).json({ error: 'Selected lab not found' });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const parsedCost = cost !== undefined ? parseFloat(cost) : 0;

    const request = await prisma.labRequest.create({
      data: {
        labId,
        patientId,
        treatmentPlanItemId: treatmentPlanItemId || null,
        visitId: visitId || null,
        doctorId: doctorId || (req.user as any)?.staffId || (req.user as any)?.id || null,
        workType: workType.trim(),
        toothNumbers: toothNumbers ? String(toothNumbers).trim() : null,
        shade: shade ? String(shade).trim() : null,
        sentDate: new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        instructions: instructions ? String(instructions).trim() : null,
        cost: isNaN(parsedCost) ? 0 : parsedCost,
        status: 'Sent'
      },
      include: {
        lab: true,
        patient: { select: { id: true, name: true, phone: true } },
        treatmentPlanItem: {
          include: { catalogItem: true }
        }
      }
    });

    return res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing lab request
 */
export const updateLabRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      labId,
      workType,
      toothNumbers,
      shade,
      expectedDeliveryDate,
      instructions,
      cost,
      status
    } = req.body;

    const existing = await prisma.labRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Lab request not found' });

    const parsedCost = cost !== undefined ? parseFloat(cost) : undefined;

    const updated = await prisma.labRequest.update({
      where: { id },
      data: {
        ...(labId && { labId }),
        ...(workType && { workType: workType.trim() }),
        ...(toothNumbers !== undefined && { toothNumbers: toothNumbers ? String(toothNumbers).trim() : null }),
        ...(shade !== undefined && { shade: shade ? String(shade).trim() : null }),
        ...(expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null
        }),
        ...(instructions !== undefined && { instructions: instructions ? String(instructions).trim() : null }),
        ...(parsedCost !== undefined && !isNaN(parsedCost) && { cost: parsedCost }),
        ...(status && { status })
      },
      include: {
        lab: true,
        patient: { select: { id: true, name: true, phone: true } },
        treatmentPlanItem: {
          include: { catalogItem: true }
        }
      }
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a lab request as received
 */
export const receiveLabRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { receivedDate, receivedNotes } = req.body;

    const existing = await prisma.labRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Lab request not found' });

    const updated = await prisma.labRequest.update({
      where: { id },
      data: {
        status: 'Received',
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        receivedNotes: receivedNotes ? String(receivedNotes).trim() : null
      },
      include: {
        lab: true,
        patient: { select: { id: true, name: true, phone: true } },
        treatmentPlanItem: {
          include: { catalogItem: true }
        }
      }
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lab request
 */
export const deleteLabRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.labRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Lab request not found' });

    await prisma.labRequest.delete({ where: { id } });
    return res.json({ message: 'Lab request deleted successfully' });
  } catch (error) {
    next(error);
  }
};
