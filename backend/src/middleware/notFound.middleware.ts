import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: { code: 'ROUTE_NOT_FOUND', details: 'The requested resource does not exist.' },
  });
};
