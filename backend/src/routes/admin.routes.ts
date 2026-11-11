/**
 * Admin Routes
 * 
 * Defines routes for administrative operations.
 * 
 * @module routes/admin
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
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
import { asyncHandler, validate } from '../middleware/error.middleware';
import { idParam, pagination } from '../middleware/validators';

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

// Review queue is shared by faculty and admins
router.get('/pending-events', authenticate, authorize('FACULTY', 'ADMIN'), pagination, validate, asyncHandler(getPendingEvents));

// Everything else requires ADMIN role
router.use(authenticate, authorize('ADMIN'));

// User management routes
const userListQuery = [
  ...pagination,
  query('role').optional().isIn(['STUDENT', 'ORGANIZER', 'FACULTY', 'ADMIN']),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  query('search').optional().isString().trim().isLength({ max: 100 }),
];

router.get('/users', userListQuery, validate, asyncHandler(getAllUsers));
router.get('/users/:id', idParam(), validate, asyncHandler(getUserById));
router.put('/users/:id/role', idParam(), updateRoleValidation, validate, asyncHandler(updateUserRole));
router.put('/users/:id/status', idParam(), updateStatusValidation, validate, asyncHandler(updateUserStatus));
router.delete('/users/:id', idParam(), validate, asyncHandler(deleteUser));

// Event management routes

// System stats
router.get('/stats', asyncHandler(getSystemStats));

export default router;