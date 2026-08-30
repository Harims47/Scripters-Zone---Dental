import express from 'express';
import { getPrescriptionPDF, getReceiptPDF } from '../controllers/documentController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Require authentication for all document routes
router.use(requireAuth);

router.get('/prescription/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getPrescriptionPDF);
router.get('/receipt/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getReceiptPDF);

export default router;
