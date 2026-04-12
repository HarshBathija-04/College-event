/**
 * Admin Routes
 * 
 * Defines routes for administrative operations.
 * 
 * @module routes/admin
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getPendingEvents,
  getSystemStats,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Validation middleware
const updateRoleValidation = [
  body('role')
    .isIn(['STUDENT', 'ORGANIZER', 'FACULTY', 'ADMIN'])
    .withMessage('Invalid role specified'),
];

const updateStatusValidation = [
  body('status')
    .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
    .withMessage('Invalid status specified'),
];

// All routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// User management routes
router.get('/users', asyncHandler(getAllUsers));
router.get('/users/:id', asyncHandler(getUserById));
router.put('/users/:id/role', updateRoleValidation, asyncHandler(updateUserRole));
router.put('/users/:id/status', updateStatusValidation, asyncHandler(updateUserStatus));
router.delete('/users/:id', asyncHandler(deleteUser));

// Event management routes
router.get('/pending-events', asyncHandler(getPendingEvents));

// System stats
router.get('/stats', asyncHandler(getSystemStats));

export default router;