import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadPdf } from '../middleware/uploadMiddleware.js';
import { deleteDocument, getDocuments, uploadDocument } from '../controllers/documentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { uploadDocumentValidation } from '../validation/documentValidation.js';

const router = Router();

router.post('/upload', protect, uploadPdf.single('file'), ...uploadDocumentValidation, validateRequest, uploadDocument);
router.get('/', protect, getDocuments);
router.delete('/:id', protect, deleteDocument);

export default router;