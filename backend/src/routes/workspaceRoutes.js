import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from '../controllers/workspaceController.js';

const router = Router();

router.get('/', protect, listWorkspaces);

router.post(
  '/',
  protect,
  ...[
    body('name').trim().notEmpty().withMessage('Workspace name is required'),
    body('description').optional().isString(),
  ],
  validateRequest,
  createWorkspace,
);

router.get('/:id', protect, getWorkspace);

router.put('/:id', protect, updateWorkspace);
router.post('/:id/members', protect, addWorkspaceMember);
router.delete('/:id', protect, deleteWorkspace);

export default router;