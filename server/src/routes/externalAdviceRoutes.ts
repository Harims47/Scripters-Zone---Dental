import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { ExternalAdviceController } from '../controllers/externalAdviceController';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requireRole('Head Doctor', 'Duty Doctor'),
  ExternalAdviceController.createAdvice
);

router.get(
  '/visit/:visitId',
  requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'),
  ExternalAdviceController.getByVisit
);

router.get(
  '/:id/pdf',
  requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'),
  ExternalAdviceController.getPDF
);

router.post(
  '/:id/send-email',
  requireRole('Head Doctor', 'Duty Doctor'),
  ExternalAdviceController.resendEmail
);

router.patch(
  '/:id',
  requireRole('Head Doctor', 'Duty Doctor'),
  ExternalAdviceController.updateAdvice
);

export default router;
