/**
 * Authentication Controller
 * 
 * Handles user registration, login, logout, and token refresh.
 * Implements secure authentication with JWT and bcrypt.
 * 
 * @module controllers/auth
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, LoginCredentials, RegisterData, TokenPair } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError, ConflictError, UnauthorizedError } from '../middleware/error.middleware';

import { prisma } from '../lib/prisma';
import { env } from '../config/env';

// JWT configuration
const JWT_SECRET = env.jwtSecret;
const JWT_REFRESH_SECRET = env.jwtRefreshSecret;
const JWT_EXPIRES_IN = env.jwtExpiresIn;
const JWT_REFRESH_EXPIRES_IN = env.jwtRefreshExpiresIn;

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * Generate JWT token pair (access + refresh)
 * 
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns TokenPair object
 */
const generateTokens = (userId: string, email: string, role: string): TokenPair => {
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  // Calculate expiresIn in seconds
  const expiresInMatch = JWT_EXPIRES_IN.match(/(\d+)([mhd])/);
  let expiresIn = 900; // Default 15 minutes
  
  if (expiresInMatch) {
    const value = parseInt(expiresInMatch[1]);
    const unit = expiresInMatch[2];
    
    switch (unit) {
      case 'm':
        expiresIn = value * 60;
        break;
      case 'h':
        expiresIn = value * 60 * 60;
        break;
      case 'd':
        expiresIn = value * 24 * 60 * 60;
        break;
    }
  }

  return { accessToken, refreshToken, expiresIn };
};

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {

    const { email, password, firstName, lastName, role, department, year, rollNumber }: RegisterData = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
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

    // Create user profile for AI recommendations
    await prisma.userProfile.create({
      data: {
        userId: user.id,
      },
    });

    // Generate tokens
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
  } catch (error) {
    throw error;
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {

    const { email, password }: LoginCredentials = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check user status
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Your account has been suspended. Please contact support.');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Your account is inactive. Please activate your account.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
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
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    // Check if user exists and is active
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

    // Generate new tokens
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

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
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
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
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
  } catch (error) {
    throw error;
  }
};

/**
 * Logout user (client-side token removal)
 * POST /api/v1/auth/logout
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    logger.info(`User logged out: ${userId}`);

    // In a stateless JWT system, logout is handled client-side
    // by removing the tokens. Here we can optionally blacklist tokens
    // or perform cleanup if needed.

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Change password
 * PUT /api/v1/auth/change-password
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new UnauthorizedError();
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect', 'currentPassword');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    logger.info(`Password changed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    throw error;
  }
};

export default {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  changePassword,
};