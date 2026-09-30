import { Router } from 'express';
import { getClinicSettings, updateClinicSettings } from '../controllers/settingsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Retrieve clinic profile
router.get('/clinic', getClinicSettings);

// Update clinic profile (requires authenticated user)
router.put('/clinic', requireAuth, updateClinicSettings);

export default router;
