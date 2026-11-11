import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  createRegistration,
  getMyRegistrations,
  getEventRegistrations,
  updateRegistration,
  cancelRegistration,
} from '../controllers/registration.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, validate } from '../middleware/error.middleware';
import { idParam, pagination, REGISTRATION_STATUSES } from '../middleware/validators';

const router = Router();

const createRegistrationValidation = [
  body('eventId')
    .isString()
    .isLength({ min: 1, max: 64 })
    .withMessage('Invalid event ID'),
  body('dietaryRequirements').optional().isString().trim().isLength({ max: 200 }),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

const updateRegistrationValidation = [
  body('status')
    .optional()
    .isIn(REGISTRATION_STATUSES)
    .withMessage('Invalid status'),
  body('attended')
    .optional()
    .isBoolean()
    .withMessage('Attended must be a boolean')
    .toBoolean(),
];

// Protected routes
router.post('/', authenticate, createRegistrationValidation, validate, asyncHandler(createRegistration));
const listQuery = [...pagination, query('status').optional().isIn(REGISTRATION_STATUSES)];

router.get('/my-registrations', authenticate, listQuery, validate, asyncHandler(getMyRegistrations));
router.get('/event/:eventId', authenticate, idParam('eventId'), listQuery, validate, asyncHandler(getEventRegistrations));
router.put('/:id', authenticate, idParam(), updateRegistrationValidation, validate, asyncHandler(updateRegistration));
router.delete('/:id', authenticate, idParam(), validate, asyncHandler(cancelRegistration));

export default router;