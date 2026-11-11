import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, LoginCredentials, RegisterData, TokenPair } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, ConflictError, UnauthorizedError } from '../middleware/error.middleware';

import { prisma, categorySelect } from '../lib/prisma';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

const generateTokens = (userId: string, email: string, role: string): TokenPair => {
  const accessToken = jwt.sign({ userId, email, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
  const { iat, exp } = jwt.decode(accessToken) as { iat: number; exp: number };
  return { accessToken, refreshToken, expiresIn: exp - iat };
};

// POST /api/v1/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, role, department, year, rollNumber }: RegisterData = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'STUDENT',
      department,
      year,
      rollNumber,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  await prisma.userProfile.create({
    data: {
      userId: user.id,
    },
  });

  const tokens = generateTokens(user.id, user.email, user.role);

  logger.info(`New user registered: ${email}`, { userId: user.id, role: user.role });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      tokens,
    },
  });
};

// POST /api/v1/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password }: LoginCredentials = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'SUSPENDED') {
    throw new UnauthorizedError('Your account has been suspended. Please contact support.');
  }

  if (user.status === 'INACTIVE') {
    throw new UnauthorizedError('Your account is inactive. Please activate your account.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const tokens = generateTokens(user.id, user.email, user.role);

  logger.info(`User logged in: ${email}`, { userId: user.id });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        department: user.department,
        year: user.year,
      },
      tokens,
    },
  });
};

// POST /api/v1/auth/refresh
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokens = generateTokens(user.id, user.email, user.role);

    logger.info(`Token refreshed for user: ${user.id}`);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired. Please login again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw error;
  }
};

// GET /api/v1/auth/me
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError();
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
      status: true,
      department: true,
      year: true,
      rollNumber: true,
      createdAt: true,
      lastLogin: true,
      interests: {
        include: {
          category: categorySelect,
        },
      },
      userProfile: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: { user },
  });
};

// POST /api/v1/auth/logout
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  logger.info(`User logged out: ${userId}`);

  // Stateless JWTs: the client discards its tokens.
  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
};

// PUT /api/v1/auth/change-password
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new BadRequestError('Current password is incorrect', 'currentPassword');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  logger.info(`Password changed for user: ${userId}`);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
};
