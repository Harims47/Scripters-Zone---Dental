import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getTreatmentCatalog,
  getPatientTreatmentPlan,
  addTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
  createTreatmentSitting,
  updateTreatmentSitting,
  completeTreatmentSitting,
  rescheduleTreatmentSitting,
  deleteTreatmentSitting,
  getPatientPendingTreatments
} from '../controllers/treatmentController';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Treatment Catalog (Accessible by all clinical staff & receptionist)
router.get('/catalog', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getTreatmentCatalog);

// Patient Treatment Plan endpoints
// Note: Mounted at /api/patients/:patientId/treatment-plan and /api/treatments

// Receptionist & Doctors can view
router.get('/:patientId/treatment-plan', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getPatientTreatmentPlan);
router.get('/:patientId/pending-treatments', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getPatientPendingTreatments);

// Only doctors can modify treatment items
router.post('/:patientId/treatment-plan/items', requireRole('Head Doctor', 'Duty Doctor'), addTreatmentPlanItem);
router.patch('/:patientId/treatment-plan/items/:itemId', requireRole('Head Doctor', 'Duty Doctor'), updateTreatmentPlanItem);
router.delete('/:patientId/treatment-plan/items/:itemId', requireRole('Head Doctor', 'Duty Doctor'), deleteTreatmentPlanItem);

// Sitting / Session management (Doctors can add, edit, complete, reschedule, delete)
router.post('/:patientId/treatment-plan/items/:itemId/sessions', requireRole('Head Doctor', 'Duty Doctor'), createTreatmentSitting);
router.patch('/:patientId/treatment-plan/items/:itemId/sessions/:sessionId', requireRole('Head Doctor', 'Duty Doctor'), updateTreatmentSitting);
router.post('/:patientId/treatment-plan/items/:itemId/sessions/:sessionId/complete', requireRole('Head Doctor', 'Duty Doctor'), completeTreatmentSitting);
router.post('/:patientId/treatment-plan/items/:itemId/sessions/:sessionId/reschedule', requireRole('Head Doctor', 'Duty Doctor'), rescheduleTreatmentSitting);
router.delete('/:patientId/treatment-plan/items/:itemId/sessions/:sessionId', requireRole('Head Doctor', 'Duty Doctor'), deleteTreatmentSitting);

export default router;
