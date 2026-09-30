import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createDentalImageSchema,
  updateDentalImageSchema
} from '../schemas/dentalImageSchema';
import {
  getDentalImages,
  createDentalImage,
  updateDentalImage,
  deleteDentalImage
} from '../controllers/dentalImageController';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// 1. View Images (Clinical & Receptionist)
router.get(
  ['/:patientId/dental-images', '/:patientId/images'],
  requireRole('Head Doctor', 'Duty Doctor', 'Receptionist', 'Admin'),
  getDentalImages
);

// 2. Upload Image (Doctors & Admin only)
router.post(
  ['/:patientId/dental-images', '/:patientId/images'],
  requireRole('Head Doctor', 'Duty Doctor', 'Admin'),
  validateRequest(createDentalImageSchema),
  createDentalImage
);

// 3. Edit Metadata / Notes / Tooth (Doctors & Admin only)
router.patch(
  ['/:patientId/dental-images/:imageId', '/:patientId/images/:imageId'],
  requireRole('Head Doctor', 'Duty Doctor', 'Admin'),
  validateRequest(updateDentalImageSchema),
  updateDentalImage
);

// 4. Delete Image (Doctors & Admin)
router.delete(
  ['/:patientId/dental-images/:imageId', '/:patientId/images/:imageId'],
  requireRole('Head Doctor', 'Duty Doctor', 'Admin'),
  deleteDentalImage
);

export default router;
