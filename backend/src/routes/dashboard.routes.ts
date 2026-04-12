/**
 * Dashboard Routes
 * 
 * Defines routes for dashboard data retrieval.
 * 
 * @module routes/dashboard
 */

import { Router } from 'express';
import {
  getStudentDashboard,
  getOrganizerDashboard,
  getAdminDashboard,
} from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student dashboard
router.get('/student', authorize('STUDENT', 'ORGANIZER', 'FACULTY', 'ADMIN'), asyncHandler(getStudentDashboard));

// Organizer dashboard
router.get('/organizer', authorize('ORGANIZER', 'FACULTY', 'ADMIN'), asyncHandler(getOrganizerDashboard));

// Admin dashboard
router.get('/admin', authorize('ADMIN'), asyncHandler(getAdminDashboard));

export default router;