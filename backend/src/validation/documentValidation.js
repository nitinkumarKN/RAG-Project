import { body } from 'express-validator';

export const uploadDocumentValidation = [
  body('title').optional().trim().isLength({ min: 2 }).withMessage('Title should be at least 2 characters long'),
];
