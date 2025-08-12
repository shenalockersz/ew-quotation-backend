import { Router } from 'express';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/items.controller.js';

const router = Router();

router.get('/', listItems);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
