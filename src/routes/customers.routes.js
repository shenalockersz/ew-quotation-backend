import { Router } from 'express';
import {
  insertCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers.controller.js';

const router = Router();

// Stored proc insert
router.post('/', insertCustomer);

// List with optional ?cp_code=...
router.get('/', listCustomers);

// Update by cus_id (kept same as your original)
router.put('/:id', updateCustomer);

// Delete by cus_code (kept same as your original)
router.delete('/:id', deleteCustomer);

export default router;
