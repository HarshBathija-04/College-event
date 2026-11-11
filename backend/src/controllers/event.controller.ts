/**
 * Event Controller
 * 
 * Handles event CRUD operations, search, filtering, and management.
 * 
 * @module controllers/event
 */

import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { EventStatus } from '@prisma/client';
import { AuthenticatedRequest, CreateEventData, UpdateEventData, EventFilters } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error.middleware';

import { prisma, activeRegistrationsCount } from '../lib/prisma';

/**
 * Create a new event
 * POST /api/v1/events
 */
export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {

    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const eventData: CreateEventData = req.body;

    // Validate dates
    const startDate = new Date(eventData.startDate);
    const endDate = new Date(eventData.endDate);

    if (startDate >= endDate) {
      throw new BadRequestError('End date must be after start date');
    }

    if (eventData.registrationDeadline) {
      const deadline = new Date(eventData.registrationDeadline);
      if (deadline > startDate) {
        throw new BadRequestError('Registration deadline must be before event start date');
      }
    }

    // Determine initial status based on user role
    // ORGANIZER events need approval, FACULTY and ADMIN events are auto-approved
    let status: EventStatus = 'PENDING_APPROVAL';
    let approvedBy: string | null = null;
    let approvedAt: Date | null = null;

    if (userRole === 'FACULTY' || userRole === 'ADMIN') {
      status = 'APPROVED';
      approvedBy = userId;
      approvedAt = new Date();
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description,
        shortDescription: eventData.shortDescription,
        type: eventData.type,
        status,
        startDate,
        endDate,
        registrationDeadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : null,
        venue: eventData.venue,
        isOnline: eventData.isOnline || false,
        onlineLink: eventData.onlineLink,
        maxParticipants: eventData.maxParticipants,
        categoryId: eventData.categoryId,
        organizerId: userId,
        bannerImage: eventData.bannerImage,
        gallery: eventData.gallery || [],
        tags: eventData.tags || [],
        approvedBy,
        approvedAt,
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
            avatar: true,
          },
        },
      },
    });

    logger.info(`Event created: ${event.title}`, { eventId: event.id, organizerId: userId });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get all events with filtering and pagination
 * GET /api/v1/events
 */
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: EventFilters = req.query;
    
    // Build where clause
    const where: any = {};

    // Status filter (default to approved for public)
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = 'APPROVED';
    }

    // Type filter
    if (filters.type) {
      where.type = filters.type;
    }

    // Category filter
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    // Organizer filter
    if (filters.organizerId) {
      where.organizerId = filters.organizerId;
    }

    // Date filters
    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) {
        where.startDate.gte = new Date(filters.startDateFrom);
      }
      if (filters.startDateTo) {
        where.startDate.lte = new Date(filters.startDateTo);
      }
    }

    // Upcoming events filter
    if (String(filters.isUpcoming) === 'true') {
      where.startDate = { gte: new Date() };
    }

    // Ongoing events filter
    if (String(filters.isOngoing) === 'true') {
      const now = new Date();
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    // Pagination
    const page = parseInt(filters.page as any) || 1;
    const limit = parseInt(filters.limit as any) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = filters.sortBy || 'startDate';
    const sortOrder = filters.sortOrder || 'asc';

    // Get events
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
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
              avatar: true,
            },
          },
          _count: { select: activeRegistrationsCount },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    // Format response
    const formattedEvents = events.map(event => ({
      ...event,
      currentParticipants: event._count.registrations,
      _count: undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: formattedEvents,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get single event by ID
 * GET /api/v1/events/:id
 */
export const getEventById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const viewerId = req.user?.userId;

    const event = await prisma.event.findUnique({
      where: { id },
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
            avatar: true,
            department: true,
          },
        },
        // Only expose the viewer's own registration, never other attendees.
        registrations: {
          where: { userId: viewerId ?? '__anonymous__' },
          select: {
            id: true,
            userId: true,
            status: true,
            attended: true,
          },
        },
        _count: { select: activeRegistrationsCount },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    const isPublic = ['APPROVED', 'ONGOING', 'COMPLETED'].includes(event.status);
    const canSeeUnpublished =
      viewerId === event.organizerId || req.user?.role === 'ADMIN' || req.user?.role === 'FACULTY';
    if (!isPublic && !canSeeUnpublished) {
      throw new NotFoundError('Event');
    }

    // Format response
    const formattedEvent = {
      ...event,
      currentParticipants: event._count.registrations,
      _count: undefined,
    };

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: { event: formattedEvent },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update an event
 * PUT /api/v1/events/:id
 */
export const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {

    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find event
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event');
    }

    // Check permissions
    const isOwner = existingEvent.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';
    const isFaculty = userRole === 'FACULTY';

    if (!isOwner && !isAdmin && !isFaculty) {
      throw new ForbiddenError('You do not have permission to update this event');
    }

    const updateData: UpdateEventData = req.body;

    // Validate dates if provided
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingEvent.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingEvent.endDate;

      if (startDate >= endDate) {
        throw new BadRequestError('End date must be after start date');
      }
    }

    // If organizer updates, set back to pending approval
    let status = existingEvent.status;
    if (isOwner && !isAdmin && !isFaculty) {
      status = 'PENDING_APPROVAL';
    }

    // Update event
    const event = await prisma.event.update({
      where: { id },
      data: {
        title: updateData.title,
        description: updateData.description,
        shortDescription: updateData.shortDescription,
        type: updateData.type,
        status,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
        registrationDeadline: updateData.registrationDeadline ? new Date(updateData.registrationDeadline) : undefined,
        venue: updateData.venue,
        isOnline: updateData.isOnline,
        onlineLink: updateData.onlineLink,
        maxParticipants: updateData.maxParticipants,
        categoryId: updateData.categoryId,
        bannerImage: updateData.bannerImage,
        gallery: updateData.gallery,
        tags: updateData.tags,
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
            avatar: true,
          },
        },
        _count: { select: activeRegistrationsCount },
      },
    });

    logger.info(`Event updated: ${event.title}`, { eventId: event.id, updatedBy: userId });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: { event },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an event
 * DELETE /api/v1/events/:id
 */
export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find event
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event');
    }

    // Check permissions
    const isOwner = existingEvent.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to delete this event');
    }

    // Delete event
    await prisma.event.delete({
      where: { id },
    });

    logger.info(`Event deleted: ${existingEvent.title}`, { eventId: id, deletedBy: userId });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Approve an event (Admin/Faculty only)
 * PUT /api/v1/events/:id/approve
 */
export const approveEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find event
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event');
    }

    if (existingEvent.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError('Event is not pending approval');
    }

    // Approve event
    const event = await prisma.event.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
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
            avatar: true,
          },
        },
      },
    });

    logger.info(`Event approved: ${event.title}`, { eventId: event.id, approvedBy: userId });

    await NotificationService.createNotification({
      userId: event.organizerId,
      type: 'EVENT_APPROVAL',
      title: 'Your event was approved',
      message: `"${event.title}" is now live and open for registrations.`,
      eventId: event.id,
      actionLink: `/events/${event.id}`,
    }).catch(() => undefined);

    res.status(200).json({
      success: true,
      message: 'Event approved successfully',
      data: { event },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Reject an event (Admin/Faculty only)
 * PUT /api/v1/events/:id/reject
 */
export const rejectEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { reason } = req.body;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find event
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      throw new NotFoundError('Event');
    }

    if (existingEvent.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError('Event is not pending approval');
    }

    // Reject event
    const event = await prisma.event.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
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
            avatar: true,
          },
        },
      },
    });

    logger.info(`Event rejected: ${event.title}`, { eventId: event.id, rejectedBy: userId, reason });

    await NotificationService.createNotification({
      userId: event.organizerId,
      type: 'EVENT_REJECTION',
      title: 'Your event needs changes',
      message: `"${event.title}" was not approved: ${reason}`,
      eventId: event.id,
      actionLink: `/events/${event.id}`,
    }).catch(() => undefined);

    res.status(200).json({
      success: true,
      message: 'Event rejected successfully',
      data: { event },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get event categories
 * GET /api/v1/events/categories
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.eventCategory.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: { categories },
    });
  } catch (error) {
    throw error;
  }
};

export default {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent,
  getCategories,
};