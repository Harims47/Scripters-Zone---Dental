import express from 'express';
import {
  getPrescriptionPDF,
  getReceiptPDF,
  getInvoicePDF,
  getPurchaseOrderPDF,
  getDocumentShareLink,
  getPublicDocumentPDF,
} from '../controllers/documentController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// ==============================================================================
// 1. PUBLIC DOCUMENT ACCESS (Cryptographically signed token required)
// ==============================================================================
router.get('/public/:type/:visitId', getPublicDocumentPDF);

// ==============================================================================
// 2. PROTECTED CLINIC STAFF ROUTES (Require authentication & role verification)
// ==============================================================================
router.use(requireAuth);

router.get('/share-link/:type/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getDocumentShareLink);
router.get('/prescription/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getPrescriptionPDF);
router.get('/receipt/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getReceiptPDF);
router.get('/invoice/:visitId', requireRole('Receptionist', 'Head Doctor', 'Duty Doctor', 'Admin'), getInvoicePDF);
router.get('/purchase-order/:id', requireRole('Head Doctor', 'Duty Doctor', 'Admin'), getPurchaseOrderPDF);

export default router;
