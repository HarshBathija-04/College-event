/**
 * Registration Controller
 * 
 * Handles event registration, attendance tracking, and management.
 * 
 * @module controllers/registration
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest, CreateRegistrationData, UpdateRegistrationData } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

/**
 * Register for an event
 * POST /api/v1/registrations
 */
export const createRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
      });
      return;
    }

    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const { eventId, notes, dietaryRequirements }: CreateRegistrationData = req.body;

    // Check if event exists and is approved
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    if (event.status !== 'APPROVED') {
      throw new BadRequestError('Event is not open for registration');
    }

    // Check if event has already ended
    if (new Date(event.endDate) < new Date()) {
      throw new BadRequestError('Event has already ended');
    }

    // Check if registration deadline has passed
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
      throw new BadRequestError('Registration deadline has passed');
    }

    // Check if user is already registered
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existingRegistration) {
      throw new ConflictError('You are already registered for this event');
    }

    // Check if event is full
    if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
      throw new BadRequestError('Event is full');
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        userId,
        eventId,
        notes,
        dietaryRequirements,
        status: 'CONFIRMED',
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            venue: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update user's event count
    await prisma.userProfile.update({
      where: { userId },
      data: {
        totalEventsAttended: {
          increment: 1,
        },
      },
    });

    logger.info(`User registered for event`, { userId, eventId });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { registration },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's registrations
 * GET /api/v1/registrations/my-registrations
 */
export const getMyRegistrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const { status, page = 1, limit = 10 } = req.query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
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
              organizer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.registration.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: 'Registrations retrieved successfully',
      data: registrations,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get registrations for an event (Organizer/Admin only)
 * GET /api/v1/registrations/event/:eventId
 */
export const getEventRegistrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { eventId } = req.params;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check permissions
    const isOwner = event.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view these registrations');
    }

    const { status, page = 1, limit = 20 } = req.query;

    const where: any = { eventId };
    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              rollNumber: true,
              department: true,
              year: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.registration.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      message: 'Event registrations retrieved successfully',
      data: registrations,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Update registration (mark attendance, cancel)
 * PUT /api/v1/registrations/:id
 */
export const updateRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;
    const { status, attended }: UpdateRegistrationData = req.body;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find registration
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!registration) {
      throw new NotFoundError('Registration');
    }

    // Check permissions
    const isOwner = registration.userId === userId;
    const isEventOrganizer = registration.event.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    // User can only cancel their own registration
    if (status && !isOwner && !isEventOrganizer && !isAdmin) {
      throw new ForbiddenError('You do not have permission to update this registration');
    }

    // Only organizer/admin can mark attendance
    if (attended !== undefined && !isEventOrganizer && !isAdmin) {
      throw new ForbiddenError('You do not have permission to mark attendance');
    }

    // Update registration
    const updatedRegistration = await prisma.registration.update({
      where: { id },
      data: {
        status,
        attended: attended !== undefined ? attended : undefined,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`Registration updated`, { registrationId: id, updatedBy: userId });

    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: { registration: updatedRegistration },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel registration
 * DELETE /api/v1/registrations/:id
 */
export const cancelRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    // Find registration
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!registration) {
      throw new NotFoundError('Registration');
    }

    // Check permissions
    const isOwner = registration.userId === userId;
    const isEventOrganizer = registration.event.organizerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isEventOrganizer && !isAdmin) {
      throw new ForbiddenError('You do not have permission to cancel this registration');
    }

    // Cancel registration (soft delete by updating status)
    await prisma.registration.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    logger.info(`Registration cancelled`, { registrationId: id, cancelledBy: userId });

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  } catch (error) {
    throw error;
  }
};

export default {
  createRegistration,
  getMyRegistrations,
  getEventRegistrations,
  updateRegistration,
  cancelRegistration,
};