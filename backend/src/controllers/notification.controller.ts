import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification.service';
import { ForbiddenError } from '../middleware/error.middleware';

import { prisma } from '../lib/prisma';
import { pageMeta } from '../middleware/validators';

// GET /api/v1/notifications
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const { isRead, type, page = 1, limit = 20 } = req.query;

  const where: any = { userId };
  
  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }
  
  if (type) {
    where.type = type;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            bannerImage: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: Number(limit),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: notifications,
    meta: { ...pageMeta(page, limit, total), unreadCount },
  });
};

// PUT /api/v1/notifications/:id/read
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  await NotificationService.markAsRead(id, userId);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
  });
};

// PUT /api/v1/notifications/read-all
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  await NotificationService.markAllAsRead(userId);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
};

// DELETE /api/v1/notifications/:id
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  await prisma.notification.deleteMany({
    where: {
      id,
      userId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
};

// GET /api/v1/notifications/unread-count
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  res.status(200).json({
    success: true,
    message: 'Unread count retrieved',
    data: { count },
  });
};
