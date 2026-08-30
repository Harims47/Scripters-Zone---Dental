import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { adjustStockSchema } from '../schemas/inventorySchema';
import {
  getInventory,
  getMedicine,
  createMedicine,
  updateMedicine,
  adjustStock,
  exportInventory
} from '../controllers/inventoryController';

const router = Router();

router.use(requireAuth);

router.get('/export', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), exportInventory);
router.get('/', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getInventory);
router.get('/:id', requireRole('Head Doctor', 'Duty Doctor', 'Receptionist'), getMedicine);

// According to existing frontend RBAC via role-config.ts:
// Head Doctor and Duty Doctor have 'view-inventory' (and implicit adjust) 
// Let's grant Head Doctor & Duty Doctor access to adjustments. Receptionist usually doesn't adjust inventory.
router.patch('/:id/adjust', requireRole('Head Doctor', 'Duty Doctor'), validateRequest(adjustStockSchema), adjustStock);

import { createMedicineSchema, updateMedicineSchema } from '../schemas/inventorySchema';

router.post('/', requireRole('Head Doctor', 'Duty Doctor'), validateRequest(createMedicineSchema), createMedicine);
router.put('/:id', requireRole('Head Doctor', 'Duty Doctor'), validateRequest(updateMedicineSchema), updateMedicine);

export default router;
