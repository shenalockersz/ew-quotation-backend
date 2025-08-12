import { Router } from 'express';
import {
  hello,
  health,
  getCompany,
  login,
  changePassword,
} from '../controllers/api.controller.js';

const router = Router();

router.get('/hello', hello);
router.get('/health', health);
router.get('/company', getCompany);

router.post('/login', login);
router.post('/change-password', changePassword);

export default router;
