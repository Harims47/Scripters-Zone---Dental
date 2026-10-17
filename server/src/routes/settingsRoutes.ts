import { Router } from 'express';
import { getClinicSettings, updateClinicSettings, syncCatalogsHandler } from '../controllers/settingsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Retrieve clinic profile
router.get('/clinic', getClinicSettings);

// Update clinic profile (requires authenticated user)
router.put('/clinic', requireAuth, updateClinicSettings);

// Synchronize master categories, medicines, and treatment catalog
router.post('/sync-catalogs', syncCatalogsHandler);

export default router;
