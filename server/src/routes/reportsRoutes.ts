import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getReportsSummary } from '../controllers/reportsController';

const router = Router();

router.use(requireAuth);

// Head Doctor only
router.get('/summary', requireRole('Head Doctor'), getReportsSummary);

export default router;
