import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getStaff,
  exportStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  updateStaffAttendance
} from '../controllers/staffController';

const router = Router();

router.use(requireAuth);

router.get('/export', requireRole('Head Doctor', 'Receptionist'), exportStaff);
router.get('/', requireRole('Head Doctor', 'Receptionist'), getStaff);
router.post('/', requireRole('Head Doctor'), createStaff);
router.put('/:id', requireRole('Head Doctor'), updateStaff);
router.put('/:id/status', requireRole('Head Doctor'), updateStaffStatus);
router.put('/:id/attendance', requireRole('Head Doctor'), updateStaffAttendance);

export default router;
