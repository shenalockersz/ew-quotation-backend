import { Router } from 'express';
import {
  insertSalesperson,
  listSalespersons,
  updateSalesperson,
  deleteSalesperson,
} from '../controllers/salespersons.controller.js';

const router = Router();

// Stored proc insert
router.post('/', insertSalesperson);

// List all
router.get('/', listSalespersons);

// Update by sales_p_code
router.put('/:id', updateSalesperson);

// Delete by sales_p_code (blocked if related quotations exist)
router.delete('/:id', deleteSalesperson);

export default router;
