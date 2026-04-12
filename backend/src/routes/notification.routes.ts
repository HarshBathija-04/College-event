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
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Protected routes
router.get('/', authenticate, asyncHandler(getNotifications));
router.get('/unread-count', authenticate, asyncHandler(getUnreadCount));
router.put('/:id/read', authenticate, asyncHandler(markAsRead));
router.put('/read-all', authenticate, asyncHandler(markAllAsRead));
router.delete('/:id', authenticate, asyncHandler(deleteNotification));

export default router;