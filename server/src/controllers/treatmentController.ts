import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

// Valid 32 permanent adult teeth in FDI notation (ISO 3950)
export const VALID_FDI_NUMBERS = new Set([
  // Maxillary / Upper: 18..11 (UR) and 21..28 (UL)
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  // Mandibular / Lower: 48..41 (LR) and 31..38 (LL)
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
]);

export const getTreatmentCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const catalog = await prisma.treatmentCatalog.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
        { variant: 'asc' }
      ]
    });
    return res.json(catalog);
  } catch (error) {
    next(error);
  }
};

export const getPatientTreatmentPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    
    // Ensure patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    let plan = await prisma.treatmentPlan.findUnique({
      where: { patientId },
      include: {
        items: {
          include: {
            catalogItem: true,
            completedVisit: true,
            sessions: {
              include: {
                doctor: { select: { id: true, name: true, role: true } },
                visit: true
              },
              orderBy: { sittingNumber: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!plan) {
      plan = await prisma.treatmentPlan.create({
        data: { patientId },
        include: {
          items: {
            include: {
              catalogItem: true,
              completedVisit: true,
              sessions: {
                include: {
                  doctor: { select: { id: true, name: true, role: true } },
                  visit: true
                },
                orderBy: { sittingNumber: 'asc' }
              }
            }
          }
        }
      });
    }

    // Ensure multi-sitting items or legacy items with totalSittings > 0 have at least 1 session backfilled
    for (const item of plan.items) {
      if (item.totalSittings > 0 && (!item.sessions || item.sessions.length === 0)) {
        const defaultSession = await prisma.treatmentSession.create({
          data: {
            treatmentPlanItemId: item.id,
            sittingNumber: 1,
            stage: item.totalSittings > 1 ? 'Sitting 1' : 'Primary Session',
            status: item.status === 'Completed' ? 'Completed' : 'Planned',
            actualDate: item.completedAt || null,
            plannedDate: item.completedAt || item.createdAt,
            visitId: item.completedVisitId || null,
            clinicalNotes: null,
          },
          include: {
            doctor: { select: { id: true, name: true, role: true } },
            visit: true
          }
        });
        item.sessions = [defaultSession];
      }
    }

    return res.json(plan);
  } catch (error) {
    next(error);
  }
};

export const addTreatmentPlanItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const {
      treatmentCatalogId,
      toothNumber,
      toothNumbers,
      notes,
      completedVisitId,
      status,
      totalSittings: rawTotalSittings
    } = req.body;

    const parsed = parseInt(rawTotalSittings, 10);
    const totalSittings = !isNaN(parsed) && parsed >= 0 ? parsed : 1;

    // 1. Validation: Cannot provide both toothNumber and toothNumbers simultaneously
    if (toothNumber !== undefined && toothNumbers !== undefined) {
      return res.status(400).json({ error: 'Cannot provide both toothNumber and toothNumbers simultaneously' });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const catalogItem = await prisma.treatmentCatalog.findUnique({ where: { id: treatmentCatalogId } });
    if (!catalogItem) return res.status(404).json({ error: 'Catalog item not found' });

    let plan = await prisma.treatmentPlan.findUnique({ where: { patientId } });
    if (!plan) {
      plan = await prisma.treatmentPlan.create({ data: { patientId } });
    }

    const targetStatus = status || (completedVisitId ? 'Completed' : 'Planned');

    // 2. Multi-tooth creation
    if (toothNumbers !== undefined && toothNumbers !== null) {
      if (!Array.isArray(toothNumbers) || toothNumbers.length === 0) {
        return res.status(400).json({ error: 'toothNumbers must be a non-empty array of numbers' });
      }

      // Check uniqueness
      const uniqueTeeth = Array.from(new Set(toothNumbers));
      if (uniqueTeeth.length !== toothNumbers.length) {
        return res.status(400).json({ error: 'Duplicate tooth numbers are not permitted in toothNumbers' });
      }

      // Validate each FDI number
      for (const t of toothNumbers) {
        if (typeof t !== 'number' || !Number.isInteger(t) || !VALID_FDI_NUMBERS.has(t)) {
          return res.status(400).json({ error: `Invalid FDI tooth number: ${t}` });
        }
      }

      // Execute transactionally
      const createdItems = await prisma.$transaction(async (tx) => {
        const items = [];
        for (const t of toothNumbers) {
          const item = await tx.treatmentPlanItem.create({
            data: {
              treatmentPlanId: plan.id,
              treatmentCatalogId,
              toothNumber: t,
              notes: notes || null,
              totalSittings,
              status: targetStatus,
              completedVisitId: completedVisitId || null,
              completedAt: completedVisitId ? new Date() : null,
            }
          });

          // Create initial planned sittings
          for (let s = 1; s <= totalSittings; s++) {
            await tx.treatmentSession.create({
              data: {
                treatmentPlanItemId: item.id,
                sittingNumber: s,
                stage: totalSittings === 1 ? 'Primary Session' : `Sitting ${s}`,
                status: (s === 1 && targetStatus === 'Completed') ? 'Completed' : 'Planned',
                actualDate: (s === 1 && targetStatus === 'Completed') ? new Date() : null,
                plannedDate: (s === 1 && targetStatus === 'Completed') ? new Date() : null,
                visitId: (s === 1 && targetStatus === 'Completed') ? (completedVisitId || null) : null,
                clinicalNotes: null,
              }
            });
          }

          const fullItem = await tx.treatmentPlanItem.findUnique({
            where: { id: item.id },
            include: {
              catalogItem: true,
              completedVisit: true,
              sessions: {
                include: {
                  doctor: { select: { id: true, name: true, role: true } },
                  visit: true
                },
                orderBy: { sittingNumber: 'asc' }
              }
            }
          });

          if (fullItem) items.push(fullItem);
        }
        return items;
      });

      return res.status(201).json(createdItems);
    }

    // 3. Single-tooth (or general non-tooth) creation
    let validatedToothNumber: number | null = null;
    if (toothNumber !== undefined && toothNumber !== null) {
      if (typeof toothNumber !== 'number' || !Number.isInteger(toothNumber) || !VALID_FDI_NUMBERS.has(toothNumber)) {
        return res.status(400).json({ error: `Invalid FDI tooth number: ${toothNumber}` });
      }
      validatedToothNumber = toothNumber;
    }

    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.treatmentPlanItem.create({
        data: {
          treatmentPlanId: plan.id,
          treatmentCatalogId,
          toothNumber: validatedToothNumber,
          notes: notes || null,
          totalSittings,
          status: targetStatus,
          completedVisitId: completedVisitId || null,
          completedAt: completedVisitId ? new Date() : null,
        }
      });

      // Create initial planned sittings
      for (let s = 1; s <= totalSittings; s++) {
        await tx.treatmentSession.create({
          data: {
            treatmentPlanItemId: item.id,
            sittingNumber: s,
            stage: totalSittings === 1 ? 'Primary Session' : `Sitting ${s}`,
            status: (s === 1 && targetStatus === 'Completed') ? 'Completed' : 'Planned',
            actualDate: (s === 1 && targetStatus === 'Completed') ? new Date() : null,
            plannedDate: (s === 1 && targetStatus === 'Completed') ? new Date() : null,
            visitId: (s === 1 && targetStatus === 'Completed') ? (completedVisitId || null) : null,
            clinicalNotes: null,
          }
        });
      }

      return tx.treatmentPlanItem.findUnique({
        where: { id: item.id },
        include: {
          catalogItem: true,
          completedVisit: true,
          sessions: {
            include: {
              doctor: { select: { id: true, name: true, role: true } },
              visit: true
            },
            orderBy: { sittingNumber: 'asc' }
          }
        }
      });
    });

    return res.status(201).json(createdItem);
  } catch (error) {
    next(error);
  }
};

export const updateTreatmentPlanItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const { status, completedVisitId, notes, toothNumber, treatmentCatalogId, totalSittings } = req.body;

    const item = await prisma.treatmentPlanItem.findUnique({
      where: { id: itemId },
      include: { treatmentPlan: true, sessions: true }
    });

    if (!item) return res.status(404).json({ error: 'Treatment plan item not found' });
    if (item.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Item does not belong to this patient' });
    }

    // Preservation of clinical completion semantics:
    const completedVisit = item.completedVisitId
      ? await prisma.visit.findUnique({ where: { id: item.completedVisitId } })
      : null;
    const isClosedHistoricalVisit = item.status === 'Completed' && completedVisit?.status === 'COMPLETED';
    const isLockedCompleted = item.status === 'Completed' && (!completedVisit || isClosedHistoricalVisit);

    if (isLockedCompleted) {
      if (toothNumber !== undefined && toothNumber !== item.toothNumber) {
        return res.status(400).json({ error: 'Cannot modify tooth assignment on a completed clinical procedure' });
      }
      if (treatmentCatalogId !== undefined && treatmentCatalogId !== item.treatmentCatalogId) {
        return res.status(400).json({ error: 'Cannot modify procedure on a completed clinical procedure' });
      }
    }

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;

    if (totalSittings !== undefined) {
      const parsedSittings = parseInt(totalSittings, 10);
      if (!isNaN(parsedSittings) && parsedSittings >= 0) {
        updateData.totalSittings = Math.max(item.sessions.length, parsedSittings);
      }

      // If doctor increased expected sittings beyond existing session records, create the additional planned sittings
      if (parsedSittings > item.sessions.length) {
        for (let s = item.sessions.length + 1; s <= parsedSittings; s++) {
          await prisma.treatmentSession.create({
            data: {
              treatmentPlanItemId: item.id,
              sittingNumber: s,
              stage: `Sitting ${s}`,
              status: 'Planned'
            }
          });
        }
      }
    }

    // Allow updating procedure on Planned/In Progress items
    if (treatmentCatalogId !== undefined && !isClosedHistoricalVisit) {
      const catalogItem = await prisma.treatmentCatalog.findUnique({ where: { id: treatmentCatalogId } });
      if (!catalogItem) return res.status(404).json({ error: 'Catalog item not found' });
      updateData.treatmentCatalogId = treatmentCatalogId;
    }

    // Allow updating toothNumber on Planned/In Progress items
    if (toothNumber !== undefined && !isClosedHistoricalVisit) {
      if (toothNumber !== null) {
        if (typeof toothNumber !== 'number' || !Number.isInteger(toothNumber) || !VALID_FDI_NUMBERS.has(toothNumber)) {
          return res.status(400).json({ error: `Invalid FDI tooth number: ${toothNumber}` });
        }
      }
      updateData.toothNumber = toothNumber;
    }

    if (status === 'Completed') {
      if (!completedVisitId && !item.completedVisitId) {
        return res.status(400).json({ error: 'completedVisitId is required when marking as Completed' });
      }

      const targetVisitId = completedVisitId || item.completedVisitId;
      const visit = await prisma.visit.findUnique({ where: { id: targetVisitId! } });
      if (!visit) return res.status(404).json({ error: 'Visit not found' });
      if (visit.patientId !== patientId) {
        return res.status(400).json({ error: 'Visit does not belong to this patient' });
      }

      updateData.status = 'Completed';
      updateData.completedVisitId = targetVisitId;
      updateData.completedAt = item.completedAt || new Date();
    } else if (status === 'Planned') {
      updateData.status = 'Planned';
      updateData.completedVisitId = null;
      updateData.completedAt = null;
    } else if (status === 'In Progress') {
      updateData.status = 'In Progress';
    }

    const updatedItem = await prisma.treatmentPlanItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        catalogItem: true,
        completedVisit: true,
        sessions: {
          include: {
            doctor: { select: { id: true, name: true, role: true } },
            visit: true
          },
          orderBy: { sittingNumber: 'asc' }
        }
      }
    });

    return res.json(updatedItem);
  } catch (error) {
    next(error);
  }
};

export const deleteTreatmentPlanItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;

    const item = await prisma.treatmentPlanItem.findUnique({
      where: { id: itemId },
      include: { treatmentPlan: true, sessions: true }
    });

    if (!item) return res.status(404).json({ error: 'Treatment plan item not found' });
    if (item.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Item does not belong to this patient' });
    }

    // Do not permit deleting an item if it has completed sittings in a closed visit
    const hasCompletedSittings = item.sessions.some(s => s.status === 'Completed');
    if (item.status === 'Completed' && hasCompletedSittings) {
      const completedVisit = item.completedVisitId
        ? await prisma.visit.findUnique({ where: { id: item.completedVisitId } })
        : null;
      if (completedVisit && completedVisit.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Cannot delete treatment plan item with completed clinical history' });
      }
    }

    await prisma.treatmentPlanItem.delete({ where: { id: itemId } });
    return res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// SITTING / SESSION MANAGEMENT ENDPOINTS
// =========================================================================

export const createTreatmentSitting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const { stage, plannedDate, clinicalNotes, materialsUsed, followUpInstructions, doctorId } = req.body;

    const item = await prisma.treatmentPlanItem.findUnique({
      where: { id: itemId },
      include: { treatmentPlan: true, sessions: { orderBy: { sittingNumber: 'desc' } } }
    });

    if (!item) return res.status(404).json({ error: 'Treatment plan item not found' });
    if (item.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Item does not belong to this patient' });
    }

    const currentMaxSitting = item.sessions.length > 0 ? item.sessions[0].sittingNumber : 0;
    const newSittingNumber = currentMaxSitting + 1;

    const newSession = await prisma.treatmentSession.create({
      data: {
        treatmentPlanItemId: item.id,
        sittingNumber: newSittingNumber,
        stage: stage || `Sitting ${newSittingNumber}`,
        status: 'Planned',
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        clinicalNotes: clinicalNotes || null,
        materialsUsed: materialsUsed || null,
        followUpInstructions: followUpInstructions || null,
        doctorId: doctorId || null,
      },
      include: {
        doctor: { select: { id: true, name: true, role: true } },
        visit: true
      }
    });

    // Update total sittings count on item if increased
    const updatedTotal = Math.max(item.totalSittings, newSittingNumber);
    if (updatedTotal !== item.totalSittings) {
      await prisma.treatmentPlanItem.update({
        where: { id: itemId },
        data: { totalSittings: updatedTotal }
      });
    }

    return res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
};

export const updateTreatmentSitting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const sessionId = req.params.sessionId as string;
    const {
      stage,
      plannedDate,
      actualDate,
      clinicalNotes,
      workPerformed,
      materialsUsed,
      nextSittingDate,
      followUpInstructions,
      status,
      doctorId,
      visitId
    } = req.body;

    const session = await prisma.treatmentSession.findUnique({
      where: { id: sessionId },
      include: {
        treatmentPlanItem: {
          include: { treatmentPlan: true }
        }
      }
    });

    if (!session || session.treatmentPlanItemId !== itemId) {
      return res.status(404).json({ error: 'Sitting not found' });
    }
    if (session.treatmentPlanItem.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Sitting does not belong to this patient' });
    }

    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (plannedDate !== undefined) updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;
    if (actualDate !== undefined) updateData.actualDate = actualDate ? new Date(actualDate) : null;
    if (clinicalNotes !== undefined) updateData.clinicalNotes = clinicalNotes;
    if (workPerformed !== undefined) updateData.workPerformed = workPerformed;
    if (materialsUsed !== undefined) updateData.materialsUsed = materialsUsed;
    if (nextSittingDate !== undefined) updateData.nextSittingDate = nextSittingDate ? new Date(nextSittingDate) : null;
    if (followUpInstructions !== undefined) updateData.followUpInstructions = followUpInstructions;
    if (doctorId !== undefined) updateData.doctorId = doctorId;
    if (visitId !== undefined) updateData.visitId = visitId;
    if (status !== undefined) updateData.status = status;

    const updatedSession = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        doctor: { select: { id: true, name: true, role: true } },
        visit: true
      }
    });

    return res.json(updatedSession);
  } catch (error) {
    next(error);
  }
};

export const completeTreatmentSitting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const sessionId = req.params.sessionId as string;
    const {
      visitId,
      doctorId,
      workPerformed,
      clinicalNotes,
      materialsUsed,
      nextSittingDate,
      followUpInstructions,
      markOverallCompleted
    } = req.body;

    const session = await prisma.treatmentSession.findUnique({
      where: { id: sessionId },
      include: {
        treatmentPlanItem: {
          include: {
            treatmentPlan: true,
            sessions: true
          }
        }
      }
    });

    if (!session || session.treatmentPlanItemId !== itemId) {
      return res.status(404).json({ error: 'Sitting not found' });
    }
    if (session.treatmentPlanItem.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Sitting does not belong to this patient' });
    }

    if (visitId) {
      const visit = await prisma.visit.findUnique({ where: { id: visitId } });
      if (!visit || visit.patientId !== patientId) {
        return res.status(400).json({ error: 'Invalid visit for this patient' });
      }
    }

    // 1. Mark this session completed
    const updatedSession = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data: {
        status: 'Completed',
        actualDate: new Date(),
        visitId: visitId || session.visitId,
        doctorId: doctorId || session.doctorId,
        workPerformed: workPerformed || session.workPerformed,
        clinicalNotes: clinicalNotes !== undefined ? clinicalNotes : session.clinicalNotes,
        materialsUsed: materialsUsed !== undefined ? materialsUsed : session.materialsUsed,
        nextSittingDate: nextSittingDate ? new Date(nextSittingDate) : null,
        followUpInstructions: followUpInstructions !== undefined ? followUpInstructions : session.followUpInstructions
      },
      include: {
        doctor: { select: { id: true, name: true, role: true } },
        visit: true
      }
    });

    // 2. Evaluate overall treatment progress
    const allSessions = await prisma.treatmentSession.findMany({
      where: { treatmentPlanItemId: itemId }
    });

    const completedCount = allSessions.filter(s => s.status === 'Completed').length;
    const isAllCompleted = completedCount >= allSessions.length;
    const shouldMarkOverall = markOverallCompleted === true || isAllCompleted;

    let updatedItemStatus = session.treatmentPlanItem.status;
    if (shouldMarkOverall) {
      updatedItemStatus = 'Completed';
    } else if (completedCount > 0) {
      updatedItemStatus = 'In Progress';
    }

    const updatedItem = await prisma.treatmentPlanItem.update({
      where: { id: itemId },
      data: {
        status: updatedItemStatus,
        completedVisitId: shouldMarkOverall ? (visitId || session.treatmentPlanItem.completedVisitId) : session.treatmentPlanItem.completedVisitId,
        completedAt: shouldMarkOverall ? (session.treatmentPlanItem.completedAt || new Date()) : session.treatmentPlanItem.completedAt,
        notes: session.treatmentPlanItem.notes
      },
      include: {
        catalogItem: true,
        completedVisit: true,
        sessions: {
          include: {
            doctor: { select: { id: true, name: true, role: true } },
            visit: true
          },
          orderBy: { sittingNumber: 'asc' }
        }
      }
    });

    return res.json({ session: updatedSession, item: updatedItem });
  } catch (error) {
    next(error);
  }
};

export const rescheduleTreatmentSitting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const sessionId = req.params.sessionId as string;
    const { plannedDate, notes } = req.body;

    if (!plannedDate) {
      return res.status(400).json({ error: 'plannedDate is required for rescheduling' });
    }

    const session = await prisma.treatmentSession.findUnique({
      where: { id: sessionId },
      include: {
        treatmentPlanItem: {
          include: { treatmentPlan: true }
        }
      }
    });

    if (!session || session.treatmentPlanItemId !== itemId) {
      return res.status(404).json({ error: 'Sitting not found' });
    }
    if (session.treatmentPlanItem.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Sitting does not belong to this patient' });
    }

    const updatedNotes = notes
      ? (session.clinicalNotes ? `${session.clinicalNotes}\n[Rescheduled to ${new Date(plannedDate).toLocaleDateString()}: ${notes}]` : `[Rescheduled to ${new Date(plannedDate).toLocaleDateString()}: ${notes}]`)
      : session.clinicalNotes;

    const updatedSession = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data: {
        plannedDate: new Date(plannedDate),
        status: 'Planned',
        clinicalNotes: updatedNotes
      },
      include: {
        doctor: { select: { id: true, name: true, role: true } },
        visit: true
      }
    });

    return res.json(updatedSession);
  } catch (error) {
    next(error);
  }
};

export const deleteTreatmentSitting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const itemId = req.params.itemId as string;
    const sessionId = req.params.sessionId as string;

    const session = await prisma.treatmentSession.findUnique({
      where: { id: sessionId },
      include: {
        treatmentPlanItem: {
          include: { treatmentPlan: true, sessions: true }
        }
      }
    });

    if (!session || session.treatmentPlanItemId !== itemId) {
      return res.status(404).json({ error: 'Sitting not found' });
    }
    if (session.treatmentPlanItem.treatmentPlan.patientId !== patientId) {
      return res.status(400).json({ error: 'Sitting does not belong to this patient' });
    }

    if (session.status === 'Completed') {
      return res.status(400).json({ error: 'Cannot delete a completed clinical sitting' });
    }

    if (session.treatmentPlanItem.sessions.length <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only sitting for a treatment plan item. Remove the treatment procedure instead.' });
    }

    await prisma.treatmentSession.delete({ where: { id: sessionId } });

    // Re-index remaining sessions and update totalSittings
    const remaining = await prisma.treatmentSession.findMany({
      where: { treatmentPlanItemId: itemId },
      orderBy: { sittingNumber: 'asc' }
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sittingNumber !== i + 1) {
        await prisma.treatmentSession.update({
          where: { id: remaining[i].id },
          data: { sittingNumber: i + 1 }
        });
      }
    }

    await prisma.treatmentPlanItem.update({
      where: { id: itemId },
      data: { totalSittings: remaining.length }
    });

    return res.json({ message: 'Sitting deleted successfully', totalSittings: remaining.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Reusable helper to query unfinished treatments with pending sittings for an array of patients
 */
export async function getPendingTreatmentsForPatients(patientIds: string[]) {
  if (!patientIds || patientIds.length === 0) return new Map<string, any[]>();

  const plans = await prisma.treatmentPlan.findMany({
    where: { patientId: { in: patientIds } },
    include: {
      items: {
        where: {
          status: { not: 'Completed' }
        },
        include: {
          catalogItem: { select: { id: true, name: true, variant: true, category: true } },
          sessions: {
            orderBy: { sittingNumber: 'asc' }
          }
        }
      }
    }
  });

  const resultMap = new Map<string, any[]>();
  for (const plan of plans) {
    const unfinishedList = [];
    for (const item of plan.items) {
      const completedSessions = (item.sessions || []).filter(s => s.status === 'Completed');
      const pendingSessions = (item.sessions || []).filter(s => s.status === 'Planned' || s.status === 'In Progress');

      if (pendingSessions.length > 0) {
        const nextSession = pendingSessions[0];
        unfinishedList.push({
          itemId: item.id,
          treatmentCatalogId: item.treatmentCatalogId,
          treatmentName: item.catalogItem?.name || 'Treatment Procedure',
          variant: item.catalogItem?.variant || null,
          category: item.catalogItem?.category || null,
          toothNumber: item.toothNumber,
          status: item.status,
          totalSittings: Math.max(item.totalSittings || 1, (item.sessions || []).length),
          completedCount: completedSessions.length,
          nextSession: {
            id: nextSession.id,
            sittingNumber: nextSession.sittingNumber,
            stage: nextSession.stage || `Sitting ${nextSession.sittingNumber}`,
            plannedDate: nextSession.plannedDate,
            actualDate: nextSession.actualDate,
            status: nextSession.status,
            clinicalNotes: nextSession.clinicalNotes
          }
        });
      }
    }
    if (unfinishedList.length > 0) {
      resultMap.set(plan.patientId, unfinishedList);
    }
  }

  return resultMap;
}

/**
 * GET /api/patients/:patientId/pending-treatments
 * Retrieves all unfinished treatments for a specific patient with next sitting details
 */
export const getPatientPendingTreatments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const pendingMap = await getPendingTreatmentsForPatients([patientId]);
    const list = pendingMap.get(patientId) || [];
    return res.json(list);
  } catch (error) {
    next(error);
  }
};

