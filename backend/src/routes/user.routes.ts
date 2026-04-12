/**
 * User Routes
 * 
 * Defines routes for user profile operations.
 * 
 * @module routes/users
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  getInterests,
  addInterest,
  removeInterest,
  getEventHistory,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Validation middleware
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s-()]+$/)
    .withMessage('Invalid phone number format'),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Year must be between 1 and 5'),
];

const addInterestValidation = [
  body('categoryId')
    .isString()
    .withMessage('Invalid category ID'),
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Weight must be between 0 and 1'),
];

// Protected routes
router.get('/profile', authenticate, asyncHandler(getProfile));
router.put('/profile', authenticate, updateProfileValidation, asyncHandler(updateProfile));
router.get('/interests', authenticate, asyncHandler(getInterests));
router.post('/interests', authenticate, addInterestValidation, asyncHandler(addInterest));
router.delete('/interests/:categoryId', authenticate, asyncHandler(removeInterest));
router.get('/event-history', authenticate, asyncHandler(getEventHistory));

export default router;