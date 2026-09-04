import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { startWalkInVisitSchema, checkInAppointmentSchema } from '../schemas/visitSchema';
import {
  getVisits,
  getVisitById,
  startWalkInVisit,
  checkInAppointment,
  cancelVisit
} from '../controllers/visitController';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getVisits);
router.get('/:id', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getVisitById);

// Start walk-in visit (Receptionist, Head Doctor)
// Depending on frontend 'Patients'/'Queue' permissions
router.post('/walk-in', requireRole('Head Doctor', 'Receptionist'), validateRequest(startWalkInVisitSchema), startWalkInVisit);

// Check-in appointment (Receptionist, Head Doctor)
router.post('/check-in', requireRole('Head Doctor', 'Receptionist'), validateRequest(checkInAppointmentSchema), checkInAppointment);

// Cancel visit
router.patch('/:id/cancel', requireRole('Head Doctor', 'Receptionist'), cancelVisit);

export default router;
