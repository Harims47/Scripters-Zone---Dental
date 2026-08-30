import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createPatientSchema, updatePatientSchema } from '../schemas/patientSchema';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient
} from '../controllers/patientController';

const router = Router();

// All patient endpoints require authentication
router.use(requireAuth);

router.get('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getPatients);
router.get('/:id', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getPatientById);
router.post('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), validateRequest(createPatientSchema), createPatient);
router.patch('/:id', requireRole('Head Doctor', 'Receptionist'), validateRequest(updatePatientSchema), updatePatient);

export default router;
