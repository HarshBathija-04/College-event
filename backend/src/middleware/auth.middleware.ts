/**
 * Authentication Middleware
 * 
 * Handles JWT token verification and user authentication.
 * Implements role-based access control (RBAC) for protected routes.
 * 
 * @module middleware/auth
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { logger } from '../utils/logger';

import { prisma } from '../lib/prisma';
import { env } from '../config/env';

/**
 * JWT Secret keys from environment variables
 */
const JWT_SECRET = env.jwtSecret;

/**
 * Verify JWT token and attach user to request
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: {
          code: 'NO_TOKEN',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User no longer exists.',
        error: {
          code: 'USER_NOT_FOUND',
        },
      });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        error: {
          code: 'ACCOUNT_SUSPENDED',
        },
      });
      return;
    }

    if (user.status === 'INACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please activate your account.',
        error: {
          code: 'ACCOUNT_INACTIVE',
        },
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        error: {
          code: 'TOKEN_EXPIRED',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        error: {
          code: 'INVALID_TOKEN',
        },
      });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
      error: {
        code: 'AUTH_ERROR',
      },
    });
  }
};

/**
 * Authorize specific roles
 * 
 * @param allowedRoles - Array of allowed user roles
 * @returns Middleware function
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
        error: {
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
        error: {
          code: 'FORBIDDEN',
          details: `Required roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - attaches user if token exists, but doesn't require it
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (user && user.status === 'ACTIVE') {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch {
    // Silent fail for optional auth
    next();
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth,
};