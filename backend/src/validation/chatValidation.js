import { body } from 'express-validator';

export const chatValidation = [
  body('question').trim().notEmpty().withMessage('Question is required'),
];
