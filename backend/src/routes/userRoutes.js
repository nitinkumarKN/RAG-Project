import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { updateProfileValidation } from '../validation/userValidation.js';
import { deleteAccount } from '../controllers/userController.js';

const router = Router();

router.get('/profile', protect, getProfile);

router.put(
  '/profile',
  protect,
  ...updateProfileValidation,
  validateRequest,
  updateProfile,
);

router.delete('/account', protect, deleteAccount);

export default router;