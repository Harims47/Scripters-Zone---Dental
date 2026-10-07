import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { VALID_FDI_NUMBERS } from './treatmentController';
import { saveImageToDisk, deleteStoredFile } from '../services/fileStorageService';

export const getDentalImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const { type, toothNumber, visitId } = req.query;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const whereClause: any = { patientId };
    if (type && (type === 'OPG' || type === 'RVG')) {
      whereClause.type = type;
    }
    if (toothNumber !== undefined) {
      const parsedTooth = parseInt(toothNumber as string, 10);
      if (!isNaN(parsedTooth)) {
        whereClause.toothNumber = parsedTooth;
      }
    }
    if (visitId) {
      whereClause.visitId = visitId as string;
    }

    const images = await prisma.dentalImage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(images);
  } catch (error) {
    next(error);
  }
};

export const createDentalImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const {
      type,
      fileName,
      mimeType,
      fileSize,
      imageUrl,
      toothNumber,
      visitId,
      title,
      notes
    } = req.body;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (visitId) {
      const visit = await prisma.visit.findUnique({ where: { id: visitId } });
      if (!visit) {
        return res.status(404).json({ error: 'Visit not found' });
      }
      if (visit.patientId !== patientId) {
        return res.status(400).json({ error: 'Visit does not belong to this patient' });
      }
    }

    // Tooth rules enforcement
    let validatedToothNumber: number | null = null;
    if (type === 'OPG') {
      if (toothNumber !== undefined && toothNumber !== null) {
        return res.status(400).json({ error: 'OPG images cannot be associated with an individual tooth' });
      }
    } else if (type === 'RVG') {
      if (toothNumber !== undefined && toothNumber !== null) {
        if (typeof toothNumber !== 'number' || !Number.isInteger(toothNumber) || !VALID_FDI_NUMBERS.has(toothNumber)) {
          return res.status(400).json({ error: `Invalid FDI tooth number: ${toothNumber}` });
        }
        validatedToothNumber = toothNumber;
      }
    }

    const uploadedById = (req as any).user?.staffId || (req as any).user?.id || null;

    // Save image binary to disk under /uploads/dental-images/:patientId/
    let storedImageUrl = imageUrl;
    let storedFileSize = fileSize;
    let storedMimeType = mimeType;
    let storedFileName = fileName;

    if (imageUrl && (imageUrl.startsWith('data:') || !imageUrl.startsWith('/uploads/'))) {
      const saved = await saveImageToDisk(imageUrl, 'dental-images', patientId, fileName);
      storedImageUrl = saved.urlPath;
      if (saved.fileSize > 0) storedFileSize = saved.fileSize;
      if (saved.mimeType) storedMimeType = saved.mimeType;
      if (saved.fileName) storedFileName = saved.fileName;
    }

    const dentalImage = await prisma.dentalImage.create({
      data: {
        patientId,
        visitId: visitId || null,
        type,
        toothNumber: validatedToothNumber,
        title: title || null,
        fileName: storedFileName,
        mimeType: storedMimeType,
        fileSize: storedFileSize,
        imageUrl: storedImageUrl,
        notes: notes || null,
        uploadedById
      }
    });

    return res.status(201).json(dentalImage);
  } catch (error) {
    next(error);
  }
};

export const updateDentalImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const imageId = req.params.imageId as string;
    const { title, notes, toothNumber, visitId } = req.body;

    const image = await prisma.dentalImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return res.status(404).json({ error: 'Dental image not found' });
    }

    // Strict patient isolation check
    if (image.patientId !== patientId) {
      return res.status(400).json({ error: 'Image does not belong to this patient' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title || null;
    if (notes !== undefined) updateData.notes = notes || null;

    if (visitId !== undefined) {
      if (visitId !== null) {
        const visit = await prisma.visit.findUnique({ where: { id: visitId } });
        if (!visit || visit.patientId !== patientId) {
          return res.status(400).json({ error: 'Invalid visit for this patient' });
        }
      }
      updateData.visitId = visitId;
    }

    if (toothNumber !== undefined) {
      if (image.type === 'OPG' && toothNumber !== null) {
        return res.status(400).json({ error: 'OPG images cannot be associated with an individual tooth' });
      }
      if (image.type === 'RVG' && toothNumber !== null) {
        if (typeof toothNumber !== 'number' || !Number.isInteger(toothNumber) || !VALID_FDI_NUMBERS.has(toothNumber)) {
          return res.status(400).json({ error: `Invalid FDI tooth number: ${toothNumber}` });
        }
      }
      updateData.toothNumber = toothNumber;
    }

    const updated = await prisma.dentalImage.update({
      where: { id: imageId },
      data: updateData
    });

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteDentalImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId as string;
    const imageId = req.params.imageId as string;

    const image = await prisma.dentalImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return res.status(404).json({ error: 'Dental image not found' });
    }

    // Strict patient isolation check
    if (image.patientId !== patientId) {
      return res.status(400).json({ error: 'Image does not belong to this patient' });
    }

    await prisma.dentalImage.delete({ where: { id: imageId } });

    // Clean up physical file on disk if stored locally
    if (image.imageUrl) {
      deleteStoredFile(image.imageUrl);
    }

    return res.status(200).json({
      message: 'Dental image deleted successfully',
      id: imageId
    });
  } catch (error) {
    next(error);
  }
};
