import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createChat, deleteChatHistory, getChatHistory } from '../controllers/chatController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { chatValidation } from '../validation/chatValidation.js';

const router = Router();

router.post('/', protect, ...chatValidation, validateRequest, createChat);
router.get('/history', protect, getChatHistory);
router.delete('/history', protect, deleteChatHistory);

export default router;