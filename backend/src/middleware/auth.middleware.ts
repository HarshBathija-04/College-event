import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const deny = (res: Response, status: number, message: string, code: string, details?: string) => {
  res.status(status).json({ success: false, message, error: details ? { code, details } : { code } });
};

/** Verifies the Bearer token and loads the user's current role and status from the DB. */
async function loadUser(req: AuthenticatedRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  const decoded = jwt.verify(authHeader.split(' ')[1], env.jwtSecret) as JwtPayload;
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, status: true },
  });
  return user ?? null;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await loadUser(req);
    if (user === undefined) return deny(res, 401, 'Access denied. No token provided.', 'NO_TOKEN');
    if (user === null) return deny(res, 401, 'User no longer exists.', 'USER_NOT_FOUND');
    if (user.status === 'SUSPENDED') {
      return deny(res, 403, 'Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
    }
    if (user.status === 'INACTIVE') {
      return deny(res, 403, 'Your account is inactive. Please activate your account.', 'ACCOUNT_INACTIVE');
    }
    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return deny(res, 401, 'Token has expired. Please login again.', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) return deny(res, 401, 'Invalid token.', 'INVALID_TOKEN');
    logger.error('Authentication error:', error);
    deny(res, 500, 'Internal server error during authentication.', 'AUTH_ERROR');
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) return deny(res, 401, 'Authentication required.', 'NOT_AUTHENTICATED');
    if (!allowedRoles.includes(req.user.role)) {
      return deny(res, 403, 'You do not have permission to access this resource.', 'FORBIDDEN', `Required roles: ${allowedRoles.join(', ')}`);
    }
    next();
  };
};

/** Attaches the user when a valid token is present; never rejects the request. */
export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await loadUser(req);
    if (user?.status === 'ACTIVE') req.user = { userId: user.id, email: user.email, role: user.role };
  } catch {
    // An invalid token on a public route is treated as anonymous.
  }
  next();
};
