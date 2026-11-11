import { Request } from 'express';
import { EventStatus, EventType, RegistrationStatus, UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
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

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
  role?: UserRole;
  department?: string;
  year?: number;
  rollNumber?: string;
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

export type UpdateEventData = Partial<CreateEventData> & { status?: EventStatus };

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

export interface CreateRegistrationData {
  eventId: string;
  notes?: string;
  dietaryRequirements?: string;
}

export interface UpdateRegistrationData {
  status?: RegistrationStatus;
  attended?: boolean;
}
