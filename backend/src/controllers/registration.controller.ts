import { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthenticatedRequest, CreateRegistrationData, UpdateRegistrationData } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/error.middleware';

import { prisma, activeRegistrationsCount, categorySelect } from '../lib/prisma';
import { pageMeta } from '../middleware/validators';

// POST /api/v1/registrations
export const createRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const { eventId, notes, dietaryRequirements }: CreateRegistrationData = req.body;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: activeRegistrationsCount },
    },
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

  if (event.status !== 'APPROVED') {
    throw new BadRequestError('Event is not open for registration');
  }

  if (new Date(event.endDate) < new Date()) {
    throw new BadRequestError('Event has already ended');
  }

  if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
    throw new BadRequestError('Registration deadline has passed');
  }

  const existingRegistration = await prisma.registration.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  if (existingRegistration && existingRegistration.status !== 'CANCELLED') {
    throw new ConflictError('You are already registered for this event');
  }

  // Check if event is full (cancelled registrations do not hold a seat)
  if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
    throw new BadRequestError('Event is full');
  }

  // Create the registration, or re-activate a previously cancelled one
  const registration = await prisma.registration.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { status: 'CONFIRMED', notes, dietaryRequirements },
    create: {
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

  // Update user's event count (profile may be missing for legacy users)
  await prisma.userProfile.upsert({
    where: { userId },
    update: { totalEventsAttended: { increment: 1 } },
    create: { userId, totalEventsAttended: 1 },
  });

  await NotificationService.createNotification({
    userId,
    type: 'REGISTRATION_CONFIRMATION',
    title: "You're in!",
    message: `Your spot for "${event.title}" is confirmed.`,
    eventId,
    actionLink: `/events/${eventId}`,
  }).catch(() => undefined);

  logger.info(`User registered for event`, { userId, eventId });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { registration },
  });
};

// GET /api/v1/registrations/my-registrations
export const getMyRegistrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
            category: categorySelect,
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

  res.status(200).json({
    success: true,
    message: 'Registrations retrieved successfully',
    data: registrations,
    meta: pageMeta(page, limit, total),
  });
};

// GET /api/v1/registrations/event/:eventId
export const getEventRegistrations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const { eventId } = req.params;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new NotFoundError('Event');
  }

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

  res.status(200).json({
    success: true,
    message: 'Event registrations retrieved successfully',
    data: registrations,
    meta: pageMeta(page, limit, total),
  });
};

// PUT /api/v1/registrations/:id
export const updateRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const { id } = req.params;
  const { status, attended }: UpdateRegistrationData = req.body;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });

  if (!registration) {
    throw new NotFoundError('Registration');
  }

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
};

// DELETE /api/v1/registrations/:id
export const cancelRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const userRole = req.user?.role;
  const { id } = req.params;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });

  if (!registration) {
    throw new NotFoundError('Registration');
  }

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
};
