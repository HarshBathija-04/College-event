/**
 * Event Routes
 * 
 * Defines routes for event management operations.
 * 
 * @module routes/events
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent,
  getCategories,
} from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Validation middleware
const createEventValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('type')
    .isIn(['ACADEMIC', 'CULTURAL', 'SPORTS', 'TECHNICAL', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'OTHER'])
    .withMessage('Invalid event type'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required'),
  body('categoryId')
    .isString()
    .withMessage('Invalid category ID'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max participants must be a positive integer'),
];

const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('type')
    .optional()
    .isIn(['ACADEMIC', 'CULTURAL', 'SPORTS', 'TECHNICAL', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'SOCIAL', 'OTHER'])
    .withMessage('Invalid event type'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('categoryId')
    .optional()
    .isString()
    .withMessage('Invalid category ID'),
];

const rejectEventValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required'),
];

// Public routes
router.get('/', asyncHandler(getEvents));
router.get('/categories', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getEventById));

// Protected routes
router.post('/', authenticate, authorize('STUDENT', 'ORGANIZER', 'FACULTY', 'ADMIN'), createEventValidation, asyncHandler(createEvent));
router.put('/:id', authenticate, updateEventValidation, asyncHandler(updateEvent));
router.delete('/:id', authenticate, asyncHandler(deleteEvent));

// Admin/Faculty only routes
router.put('/:id/approve', authenticate, authorize('FACULTY', 'ADMIN'), asyncHandler(approveEvent));
router.put('/:id/reject', authenticate, authorize('FACULTY', 'ADMIN'), rejectEventValidation, asyncHandler(rejectEvent));

export default router;