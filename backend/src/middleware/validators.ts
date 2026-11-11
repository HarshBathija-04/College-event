import { param, query } from 'express-validator';

export const EVENT_TYPES = ['ACADEMIC', 'CULTURAL', 'SPORTS', 'TECHNICAL', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'OTHER'];
export const REGISTRATION_STATUSES = ['REGISTERED', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'NO_SHOW'];

export const pagination = [
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
];

export const idParam = (name = 'id') =>
  param(name).isString().trim().isLength({ min: 1, max: 64 }).withMessage(`Invalid ${name}`);

export const eventListQuery = [
  ...pagination,
  query('status').optional().isIn(['APPROVED', 'ONGOING', 'COMPLETED']).withMessage('Invalid status filter'),
  query('type').optional().isIn(EVENT_TYPES).withMessage('Invalid event type'),
  query('categoryId').optional().isString().isLength({ max: 64 }),
  query('organizerId').optional().isString().isLength({ max: 64 }),
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search must be at most 100 characters'),
  query('sortBy').optional().isIn(['startDate', 'createdAt', 'title', 'popularityScore']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  query('isUpcoming').optional().isIn(['true', 'false']),
  query('isOngoing').optional().isIn(['true', 'false']),
  query('startDateFrom').optional().isISO8601(),
  query('startDateTo').optional().isISO8601(),
];
