/**
 * Authentication Routes
 * 
 * Defines routes for user authentication operations.
 * 
 * @module routes/auth
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, validate } from '../middleware/error.middleware';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    // Self-registration may only pick STUDENT or ORGANIZER; FACULTY/ADMIN are granted by an admin.
    .isIn(['STUDENT', 'ORGANIZER'])
    .withMessage('You can register as a student or an organizer'),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Year must be between 1 and 5')
    .toInt(),
  body('department').optional().isString().trim().isLength({ max: 100 }),
  body('rollNumber').optional().isString().trim().isLength({ max: 40 }),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be 8-128 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number'),
];

// Routes
router.post('/register', registerValidation, validate, asyncHandler(register));
router.post('/login', loginValidation, validate, asyncHandler(login));
router.post('/refresh', refreshTokenValidation, validate, asyncHandler(refreshToken));
router.get('/me', authenticate, asyncHandler(getCurrentUser));
router.post('/logout', authenticate, asyncHandler(logout));
router.put('/change-password', authenticate, changePasswordValidation, validate, asyncHandler(changePassword));

export default router;