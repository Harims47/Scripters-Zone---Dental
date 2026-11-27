import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getLabs,
  createLab,
  updateLab,
  deleteLab,
  getLabRequests,
  createLabRequest,
  updateLabRequest,
  receiveLabRequest,
  deleteLabRequest
} from '../controllers/labController';

const router = Router();

// Protect all lab endpoints with auth
router.use(requireAuth);

// Labs CRUD
router.get('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getLabs);
router.post('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), createLab);
router.put('/:id', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), updateLab);
router.delete('/:id', requireRole('Head Doctor'), deleteLab);

// Lab Requests
router.get('/requests', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getLabRequests);
router.post('/requests', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), createLabRequest);
router.put('/requests/:id', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), updateLabRequest);
router.post('/requests/:id/receive', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), receiveLabRequest);
router.delete('/requests/:id', requireRole('Head Doctor', 'Duty Doctor'), deleteLabRequest);

export default router;
