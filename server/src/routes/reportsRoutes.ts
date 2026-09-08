import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getReportsSummary,
  getClinicActivityReport,
  exportClinicActivityReport,
  getPaymentReport,
  exportPaymentReport
} from '../controllers/reportsController';

const router = Router();

router.use(requireAuth);

// Head Doctor only
router.get('/summary', requireRole('Head Doctor'), getReportsSummary);
router.get('/clinic-activity', requireRole('Head Doctor'), getClinicActivityReport);
router.get('/clinic-activity/export', requireRole('Head Doctor'), exportClinicActivityReport);
router.get('/payments', requireRole('Head Doctor'), getPaymentReport);
router.get('/payments/export', requireRole('Head Doctor'), exportPaymentReport);

export default router;
