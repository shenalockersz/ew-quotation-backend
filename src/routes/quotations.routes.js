import { Router } from 'express';
import {
  weeklyQuotationCount,
  listQuotations,
  listQuotationsByMonth,
  getQuotationByCode,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  approveOrRejectQuotation,
  submitQuotation,
  quotationCounts,
} from '../controllers/quotations.controller.js';

const router = Router();

// Static/specific routes first
router.get('/weekly-count', weeklyQuotationCount);
router.get('/counts', quotationCounts);
router.get('/by-month', listQuotationsByMonth);

// General list
router.get('/', listQuotations);

// Dynamic route LAST so it doesn't swallow others
router.get('/:quotationCode', getQuotationByCode);

// Mutations
router.post('/', createQuotation);
router.put('/', updateQuotation);
router.delete('/', deleteQuotation);
router.put('/update/:quotationId', approveOrRejectQuotation);
router.put('/submit/:quotationId', submitQuotation);

export default router;
