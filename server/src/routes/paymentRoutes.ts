import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createPaymentSchema } from '../schemas/paymentSchema';
import {
  getPayments,
  getPayment,
  createPayment
} from '../controllers/paymentController';

const router = Router();

router.use(requireAuth);

// Receptionists and Head Doctors can view and process payments
router.get('/', requireRole('Head Doctor', 'Receptionist'), getPayments);
router.get('/:id', requireRole('Head Doctor', 'Receptionist'), getPayment);
router.post('/', requireRole('Head Doctor', 'Receptionist'), validateRequest(createPaymentSchema), createPayment);

export default router;
