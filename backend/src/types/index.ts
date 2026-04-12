/**
 * Type Definitions for College Event Aggregator
 * Centralized type definitions for the backend API
 */

import { Request } from 'express';
import { UserRole, UserStatus, EventStatus, EventType, NotificationType, NotificationPriority } from '@prisma/client';

// ============================================
// AUTHENTICATION TYPES
// ============================================

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  department?: string;
  year?: number;
  rollNumber?: string;
}

// ============================================
// USER TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  year?: number;
  rollNumber?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  department?: string;
  year?: number;
}

export interface UserInterestData {
  categoryId: string;
  weight?: number;
}

// ============================================
// EVENT TYPES
// ============================================

export interface CreateEventData {
  title: string;
  description: string;
  shortDescription?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  venue: string;
  isOnline?: boolean;
  onlineLink?: string;
  maxParticipants?: number;
  categoryId: string;
  bannerImage?: string;
  gallery?: string[];
  tags?: string[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  shortDescription?: string;
  type?: EventType;
  startDate?: Date;
  endDate?: Date;
  registrationDeadline?: Date;
  venue?: string;
  isOnline?: boolean;
  onlineLink?: string;
  maxParticipants?: number;
  categoryId?: string;
  bannerImage?: string;
  gallery?: string[];
  tags?: string[];
  status?: EventStatus;
}

export interface EventFilters {
  status?: EventStatus;
  type?: EventType;
  categoryId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  search?: string;
  organizerId?: string;
  isUpcoming?: boolean;
  isOngoing?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  type: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  venue: string;
  isOnline: boolean;
  onlineLink?: string;
  maxParticipants?: number;
  currentParticipants: number;
  bannerImage?: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  tags: string[];
  popularityScore: number;
  isRegistered?: boolean;
}

// ============================================
// REGISTRATION TYPES
// ============================================

export interface CreateRegistrationData {
  eventId: string;
  notes?: string;
  dietaryRequirements?: string;
}

export interface UpdateRegistrationData {
  status?: string;
  attended?: boolean;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  eventId?: string;
  actionLink?: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}

// ============================================
// AI SERVICE TYPES
// ============================================

export interface AIRecommendationRequest {
  userId: string;
  limit?: number;
  excludeEventIds?: string[];
}

export interface AIRecommendationResponse {
  eventId: string;
  score: number;
  reason: string;
  algorithm: string;
}

export interface AISearchRequest {
  query: string;
  userId?: string;
  filters?: EventFilters;
}

export interface AISearchResponse {
  events: EventResponse[];
  processedQuery?: string;
  suggestions?: string[];
}

export interface AICategoryPrediction {
  eventId: string;
  predictedCategory: string;
  confidence: number;
  alternativeCategories: { category: string; confidence: number }[];
}

export interface NotificationPriorityRequest {
  userId: string;
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    eventId?: string;
  };
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  totalRegistrations: number;
  totalUsers: number;
  eventsByCategory: { category: string; count: number }[];
  registrationsByMonth: { month: string; count: number }[];
}

export interface StudentDashboard {
  registeredEvents: number;
  attendedEvents: number;
  upcomingRegistrations: EventResponse[];
  recommendedEvents: EventResponse[];
  notifications: number;
}

export interface OrganizerDashboard {
  totalEvents: number;
  totalRegistrations: number;
  averageAttendance: number;
  pendingApprovals: number;
  recentEvents: EventResponse[];
  topPerformingEvents: EventResponse[];
}

export interface AdminDashboard {
  totalUsers: number;
  totalEvents: number;
  pendingApprovals: number;
  totalRegistrations: number;
  userGrowth: { date: string; count: number }[];
  eventStatusBreakdown: { status: string; count: number }[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  details?: string;
  field?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface FileUploadResult {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}