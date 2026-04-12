/**
 * Dashboard Controller
 * 
 * Handles dashboard data for different user roles.
 * Provides personalized statistics and summaries.
 * 
 * @module controllers/dashboard
 */

import { Response } from 'express';
import { PrismaClient, EventStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Get student dashboard
 * GET /api/v1/dashboard/student
 */
export const getStudentDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const now = new Date();

    // Get user's registration stats
    const [
      totalRegistrations,
      attendedEvents,
      upcomingRegistrations,
      unreadNotifications,
    ] = await Promise.all([
      prisma.registration.count({
        where: { userId },
      }),
      prisma.registration.count({
        where: { userId, attended: true },
      }),
      prisma.registration.count({
        where: {
          userId,
          status: 'CONFIRMED',
          event: {
            startDate: { gt: now },
          },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    // Get upcoming registered events
    const upcomingEvents = await prisma.registration.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        event: {
          startDate: { gt: now },
        },
      },
      include: {
        event: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
      take: 5,
    });

    // Get recommended events (simplified - based on category interests)
    const userInterests = await prisma.userInterest.findMany({
      where: { userId },
      select: { categoryId: true },
    });

    const interestCategoryIds = userInterests.map(ui => ui.categoryId);

    const recommendedEvents = await prisma.event.findMany({
      where: {
        status: 'APPROVED',
        startDate: { gt: now },
        categoryId: interestCategoryIds.length > 0 ? { in: interestCategoryIds } : undefined,
        registrations: {
          none: {
            userId,
          },
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 5,
    });

    res.status(200).json({
      success: true,
      message: 'Student dashboard retrieved successfully',
      data: {
        stats: {
          totalRegistrations,
          attendedEvents,
          upcomingRegistrations,
          unreadNotifications,
        },
        upcomingEvents: upcomingEvents.map(r => ({
          ...r.event,
          registrationId: r.id,
          registrationStatus: r.status,
        })),
        recommendedEvents: recommendedEvents.map(e => ({
          ...e,
          currentParticipants: e._count.registrations,
          _count: undefined,
        })),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get organizer dashboard
 * GET /api/v1/dashboard/organizer
 */
export const getOrganizerDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const now = new Date();

    // Get organizer's event stats
    const [
      totalEvents,
      pendingEvents,
      approvedEvents,
      totalRegistrations,
      averageAttendance,
    ] = await Promise.all([
      prisma.event.count({
        where: { organizerId: userId },
      }),
      prisma.event.count({
        where: { organizerId: userId, status: 'PENDING_APPROVAL' },
      }),
      prisma.event.count({
        where: { organizerId: userId, status: 'APPROVED' },
      }),
      prisma.registration.count({
        where: {
          event: {
            organizerId: userId,
          },
        },
      }),
      prisma.registration.aggregate({
        where: {
          event: {
            organizerId: userId,
          },
          attended: true,
        },
        _count: {
          attended: true,
        },
      }),
    ]);

    // Get recent events
    const recentEvents = await prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get upcoming events with registration counts
    const upcomingEvents = await prisma.event.findMany({
      where: {
        organizerId: userId,
        startDate: { gt: now },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    });

    // Calculate attendance rate
    const attendanceRate = totalRegistrations > 0
      ? Math.round((averageAttendance._count.attended / totalRegistrations) * 100)
      : 0;

    res.status(200).json({
      success: true,
      message: 'Organizer dashboard retrieved successfully',
      data: {
        stats: {
          totalEvents,
          pendingEvents,
          approvedEvents,
          totalRegistrations,
          attendanceRate,
        },
        recentEvents: recentEvents.map(e => ({
          ...e,
          currentParticipants: e._count.registrations,
          _count: undefined,
        })),
        upcomingEvents: upcomingEvents.map(e => ({
          ...e,
          currentParticipants: e._count.registrations,
          _count: undefined,
        })),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get admin dashboard
 * GET /api/v1/dashboard/admin
 */
export const getAdminDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get system-wide stats
    const [
      totalUsers,
      newUsersThisMonth,
      totalEvents,
      pendingApprovals,
      upcomingEvents,
      ongoingEvents,
      totalRegistrations,
      recentRegistrations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.event.count(),
      prisma.event.count({
        where: { status: 'PENDING_APPROVAL' },
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
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Get user growth by day
    const userGrowth = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Get events by status
    const eventsByStatus = await prisma.event.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get recent events
    const recentEvents = await prisma.event.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.status(200).json({
      success: true,
      message: 'Admin dashboard retrieved successfully',
      data: {
        stats: {
          totalUsers,
          newUsersThisMonth,
          totalEvents,
          pendingApprovals,
          upcomingEvents,
          ongoingEvents,
          totalRegistrations,
          recentRegistrations,
        },
        userGrowth,
        eventsByStatus: eventsByStatus.map(es => ({
          status: es.status,
          count: es._count.status,
        })),
        recentUsers,
        recentEvents,
      },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  getStudentDashboard,
  getOrganizerDashboard,
  getAdminDashboard,
};