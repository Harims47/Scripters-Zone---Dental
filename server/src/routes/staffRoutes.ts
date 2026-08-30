import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getStaff,
  exportStaff,
  createStaff,
  updateStaff,
  updateStaffStatus
} from '../controllers/staffController';

const router = Router();

router.use(requireAuth);

router.get('/export', requireRole('Head Doctor', 'Receptionist'), exportStaff);
router.get('/', requireRole('Head Doctor', 'Receptionist'), getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.put('/:id/status', updateStaffStatus);

export default router;
