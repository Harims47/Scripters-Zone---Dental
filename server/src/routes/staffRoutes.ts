import { Router } from 'express';
import { getStaff, createStaff, updateStaff, updateStaffStatus } from '../controllers/staffController';

const router = Router();

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.put('/:id/status', updateStaffStatus);

export default router;
