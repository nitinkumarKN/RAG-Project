import { Router } from 'express';
import { loginUser, registerUser, forgotPassword, resetPassword } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginValidation, registerValidation } from '../validation/authValidation.js';
import { body, param } from 'express-validator';

const router = Router();

router.post(
  '/register',
  ...registerValidation,
  validateRequest,
  registerUser,
);

router.post(
  '/login',
  ...loginValidation,
  validateRequest,
  loginUser,
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validateRequest,
  forgotPassword,
);

router.post(
  '/reset-password/:token',
  [param('token').notEmpty().withMessage('Token is required'), body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')],
  validateRequest,
  resetPassword,
);

export default router;