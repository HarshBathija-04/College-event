import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

import { prisma, categorySelect } from '../lib/prisma';
import { pageMeta } from '../middleware/validators';

// GET /api/v1/admin/users
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { role, status, search, page = 1, limit = 20 } = req.query;

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        status: true,
        department: true,
        year: true,
        rollNumber: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            organizedEvents: true,
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: users,
    meta: pageMeta(page, limit, total),
  });
};

// GET /api/v1/admin/users/:id
export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      phone: true,
      role: true,
      status: true,
      department: true,
      year: true,
      rollNumber: true,
      createdAt: true,
      lastLogin: true,
      interests: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      organizedEvents: {
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
        },
        orderBy: { startDate: 'desc' },
        take: 5,
      },
      registrations: {
        select: {
          id: true,
          status: true,
          attended: true,
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      userProfile: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: { user },
  });
};

// PUT /api/v1/admin/users/:id/role
export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  logger.info(`User role updated`, { userId: id, newRole: role });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: { user },
  });
};

// PUT /api/v1/admin/users/:id/status
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  logger.info(`User status updated`, { userId: id, newStatus: status });

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: { user },
  });
};

// DELETE /api/v1/admin/users/:id
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminId = req.user?.userId;

  if (id === adminId) {
    throw new BadRequestError('Cannot delete your own account');
  }

  await prisma.user.delete({
    where: { id },
  });

  logger.info(`User deleted`, { userId: id, deletedBy: adminId });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
};

// GET /api/v1/admin/pending-events
export const getPendingEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        category: categorySelect,
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.event.count({ where: { status: 'PENDING_APPROVAL' } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Pending events retrieved successfully',
    data: events,
    meta: pageMeta(page, limit, total),
  });
};

// GET /api/v1/admin/stats
export const getSystemStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    usersByRole,
    totalEvents,
    eventsByStatus,
    upcomingEvents,
    ongoingEvents,
    totalRegistrations,
    recentRegistrations,
    totalCategories,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    prisma.event.count(),
    prisma.event.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.event.count({
      where: {
        status: 'APPROVED',
        startDate: { gt: now },
      },
    }),
    prisma.event.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
    prisma.registration.count(),
    prisma.registration.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.eventCategory.count(),
  ]);

  const eventsByCategory = await prisma.event.groupBy({
    by: ['categoryId'],
    _count: { categoryId: true },
  });

  const categoryNames = await prisma.eventCategory.findMany({
    select: { id: true, name: true },
  });

  const eventsByCategoryWithNames = eventsByCategory.map(ec => ({
    category: categoryNames.find(c => c.id === ec.categoryId)?.name || 'Unknown',
    count: ec._count.categoryId,
  }));

  res.status(200).json({
    success: true,
    message: 'System statistics retrieved successfully',
    data: {
      users: {
        total: totalUsers,
        byRole: usersByRole.map(ur => ({
          role: ur.role,
          count: ur._count.role,
        })),
      },
      events: {
        total: totalEvents,
        byStatus: eventsByStatus.map(es => ({
          status: es.status,
          count: es._count.status,
        })),
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        byCategory: eventsByCategoryWithNames,
      },
      registrations: {
        total: totalRegistrations,
        last30Days: recentRegistrations,
      },
      categories: totalCategories,
    },
  });
};
