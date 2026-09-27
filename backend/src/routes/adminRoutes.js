import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { getAnalytics } from '../controllers/adminController.js';

const router = Router();

router.get('/analytics', protect, requireRole(['Admin']), getAnalytics);

export default router;