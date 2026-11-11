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
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler, validate } from '../middleware/error.middleware';
import { EVENT_TYPES, eventListQuery, idParam } from '../middleware/validators';

const router = Router();

function commonOptionalFields() {
  return [
    body('shortDescription').optional({ values: 'null' }).isString().trim().isLength({ max: 255 }),
    body('registrationDeadline').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid registration deadline'),
    body('isOnline').optional().isBoolean().toBoolean(),
    body('onlineLink').optional({ values: 'falsy' }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Online link must be a valid URL'),
    body('bannerImage').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Banner must be an https URL'),
    body('maxParticipants').optional({ values: 'null' }).isInt({ min: 1, max: 100000 }).withMessage('Max participants must be a positive integer').toInt(),
    body('tags').optional().isArray({ max: 10 }).withMessage('At most 10 tags'),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 30 }),
    body('gallery').optional().isArray({ max: 10 }),
    body('gallery.*').optional().isURL({ protocols: ['https'], require_protocol: true }),
  ];
}

const createEventValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Description must be at least 10 characters'),
  body('type')
    .isIn(EVENT_TYPES)
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
    .isLength({ max: 200 })
    .withMessage('Venue is required'),
  body('categoryId')
    .isString()
    .withMessage('Invalid category ID'),
  ...commonOptionalFields(),
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
    .isIn(EVENT_TYPES)
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
  body('venue').optional().trim().notEmpty().isLength({ max: 200 }),
  ...commonOptionalFields(),
];

const rejectEventValidation = [
  body('reason')
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Rejection reason is required'),
];

// Public routes
router.get('/', eventListQuery, validate, asyncHandler(getEvents));
router.get('/categories', asyncHandler(getCategories));
router.get('/:id', optionalAuth, idParam(), validate, asyncHandler(getEventById));

// Protected routes
router.post('/', authenticate, authorize('ORGANIZER', 'FACULTY', 'ADMIN'), createEventValidation, validate, asyncHandler(createEvent));
router.put('/:id', authenticate, idParam(), updateEventValidation, validate, asyncHandler(updateEvent));
router.delete('/:id', authenticate, idParam(), validate, asyncHandler(deleteEvent));

// Admin/Faculty only routes
router.put('/:id/approve', authenticate, authorize('FACULTY', 'ADMIN'), idParam(), validate, asyncHandler(approveEvent));
router.put('/:id/reject', authenticate, authorize('FACULTY', 'ADMIN'), idParam(), rejectEventValidation, validate, asyncHandler(rejectEvent));

export default router;