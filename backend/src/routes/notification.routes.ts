/**
 * Notification Routes
 * 
 * Defines routes for notification operations.
 * 
 * @module routes/notifications
 */

import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { query } from 'express-validator';
import { asyncHandler, validate } from '../middleware/error.middleware';
import { idParam, pagination } from '../middleware/validators';

const router = Router();

// Protected routes
const listQuery = [
  ...pagination,
  query('isRead').optional().isIn(['true', 'false']),
  query('type').optional().isString().isLength({ max: 40 }),
];

router.get('/', authenticate, listQuery, validate, asyncHandler(getNotifications));
router.get('/unread-count', authenticate, asyncHandler(getUnreadCount));
router.put('/read-all', authenticate, asyncHandler(markAllAsRead));
router.put('/:id/read', authenticate, idParam(), validate, asyncHandler(markAsRead));
router.delete('/:id', authenticate, idParam(), validate, asyncHandler(deleteNotification));

export default router;