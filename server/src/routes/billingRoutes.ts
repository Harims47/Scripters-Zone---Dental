import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getBillingQueue } from '../controllers/billingController';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('Head Doctor', 'Receptionist'), getBillingQueue);

export default router;
