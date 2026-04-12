/**
 * Registration Routes
 * 
 * Defines routes for event registration operations.
 * 
 * @module routes/registrations
 */

import { Router } from 'express';
import { body } from 'express-validator';
import {
  createRegistration,
  getMyRegistrations,
  getEventRegistrations,
  updateRegistration,
  cancelRegistration,
} from '../controllers/registration.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Validation middleware
const createRegistrationValidation = [
  body('eventId')
    .isString()
    .withMessage('Invalid event ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

const updateRegistrationValidation = [
  body('status')
    .optional()
    .isIn(['REGISTERED', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid status'),
  body('attended')
    .optional()
    .isBoolean()
    .withMessage('Attended must be a boolean'),
];

// Protected routes
router.post('/', authenticate, createRegistrationValidation, asyncHandler(createRegistration));
router.get('/my-registrations', authenticate, asyncHandler(getMyRegistrations));
router.get('/event/:eventId', authenticate, asyncHandler(getEventRegistrations));
router.put('/:id', authenticate, updateRegistrationValidation, asyncHandler(updateRegistration));
router.delete('/:id', authenticate, asyncHandler(cancelRegistration));

export default router;