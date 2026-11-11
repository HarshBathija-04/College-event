import { Response } from 'express';
import { AuthenticatedRequest, UpdateUserData, UserInterestData } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error.middleware';

import { prisma, categorySelect } from '../lib/prisma';
import { pageMeta } from '../middleware/validators';

// GET /api/v1/users/profile
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      phone: true,
      role: true,
      department: true,
      year: true,
      rollNumber: true,
      createdAt: true,
      interests: {
        include: {
          category: categorySelect,
        },
      },
      userProfile: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: { user },
  });
};

// PUT /api/v1/users/profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const updateData: UpdateUserData = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phone: updateData.phone,
      avatar: updateData.avatar,
      department: updateData.department,
      year: updateData.year,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      phone: true,
      role: true,
      department: true,
      year: true,
      rollNumber: true,
    },
  });

  logger.info(`Profile updated`, { userId });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
};

// GET /api/v1/users/interests
export const getInterests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const interests = await prisma.userInterest.findMany({
    where: { userId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          color: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Interests retrieved successfully',
    data: { interests },
  });
};

// POST /api/v1/users/interests
export const addInterest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const { categoryId, weight }: UserInterestData = req.body;

  const category = await prisma.eventCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  const existingInterest = await prisma.userInterest.findUnique({
    where: {
      userId_categoryId: {
        userId,
        categoryId,
      },
    },
  });

  if (existingInterest) {
    throw new BadRequestError('Interest already exists');
  }

  const interest = await prisma.userInterest.create({
    data: {
      userId,
      categoryId,
      weight: weight || 1.0,
    },
    include: {
      category: categorySelect,
    },
  });

  const userInterests = await prisma.userInterest.findMany({
    where: { userId },
    select: { categoryId: true },
  });

  await prisma.userProfile.update({
    where: { userId },
    data: {
      preferredCategories: userInterests.map(ui => ui.categoryId),
    },
  });

  logger.info(`Interest added`, { userId, categoryId });

  res.status(201).json({
    success: true,
    message: 'Interest added successfully',
    data: { interest },
  });
};

// DELETE /api/v1/users/interests/:categoryId
export const removeInterest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { categoryId } = req.params;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  await prisma.userInterest.deleteMany({
    where: {
      userId,
      categoryId,
    },
  });

  const userInterests = await prisma.userInterest.findMany({
    where: { userId },
    select: { categoryId: true },
  });

  await prisma.userProfile.update({
    where: { userId },
    data: {
      preferredCategories: userInterests.map(ui => ui.categoryId),
    },
  });

  logger.info(`Interest removed`, { userId, categoryId });

  res.status(200).json({
    success: true,
    message: 'Interest removed successfully',
  });
};

// GET /api/v1/users/event-history
export const getEventHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            category: categorySelect,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.registration.count({ where: { userId } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Event history retrieved successfully',
    data: registrations,
    meta: pageMeta(page, limit, total),
  });
};
