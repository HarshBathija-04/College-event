import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public errorCode = 'INTERNAL_ERROR',
    public details?: unknown,
    public field?: string,
  ) {
    super(message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, field?: string) {
    super(message, 400, 'BAD_REQUEST', undefined, field);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown;
  let field: string | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
    field = err.field;
  } else if ((err as { type?: string }).type === 'entity.parse.failed') {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Invalid request parameters';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      errorCode = 'UNIQUE_CONSTRAINT';
      message = 'A record with this value already exists';
      field = prismaError.meta?.target?.[0];
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Record not found';
    } else if (prismaError.code === 'P2003') {
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_CONSTRAINT';
      message = 'Referenced record does not exist';
    }
  }

  const errorLog = {
    errorCode,
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', errorLog);
  } else {
    logger.warn('Client Error:', errorLog);
  }

  const response: { success: false; message: string; error: Record<string, unknown> } = {
    success: false,
    message,
    error: {
      code: errorCode,
    },
  };

  if (details) {
    response.error.details = details;
  }

  if (field) {
    response.error.field = field;
  }

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => unknown) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/** Runs after express-validator chains; turns failures into a 400 with field details. */
export const validate = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({
    field: e.type === 'field' ? e.path : undefined,
    message: e.msg,
  }));
  next(new ApiError(String(details[0]?.message ?? 'Validation failed'), 400, 'VALIDATION_ERROR', details));
};
