/**
 * Frontend Type Definitions
 * College Event Aggregator
 */

// ============================================
// USER TYPES
// ============================================

export type UserRole = 'STUDENT' | 'ORGANIZER' | 'FACULTY' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
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
  createdAt: string;
  lastLogin?: string;
}

export interface UserProfile extends User {
  interests: UserInterest[];
}

export interface UserInterest {
  id: string;
  categoryId: string;
  category: EventCategory;
  weight: number;
}

// ============================================
// AUTHENTICATION TYPES
// ============================================

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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// EVENT TYPES
// ============================================

export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type EventType = 'ACADEMIC' | 'CULTURAL' | 'SPORTS' | 'TECHNICAL' | 'WORKSHOP' | 'SEMINAR' | 'COMPETITION' | 'SOCIAL' | 'OTHER';

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  venue: string;
  isOnline: boolean;
  onlineLink?: string;
  maxParticipants?: number;
  currentParticipants: number;
  bannerImage?: string;
  gallery: string[];
  category: EventCategory;
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  tags: string[];
  popularityScore: number;
  isRegistered?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  shortDescription?: string;
  type: EventType;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  venue: string;
  isOnline?: boolean;
  onlineLink?: string;
  maxParticipants?: number;
  categoryId: string;
  bannerImage?: string;
  gallery?: string[];
  tags?: string[];
}

export interface EventFilters {
  status?: EventStatus;
  type?: EventType;
  categoryId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  search?: string;
  organizerId?: string;
  isUpcoming?: boolean;
  isOngoing?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// REGISTRATION TYPES
// ============================================

export type RegistrationStatus = 'REGISTERED' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'NO_SHOW';

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  event: Event;
  status: RegistrationStatus;
  attended: boolean;
  notes?: string;
  dietaryRequirements?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'EVENT_REMINDER' 
  | 'REGISTRATION_CONFIRMATION' 
  | 'EVENT_APPROVAL' 
  | 'EVENT_REJECTION' 
  | 'EVENT_UPDATE' 
  | 'EVENT_CANCELLED' 
  | 'TRENDING_EVENT' 
  | 'RECOMMENDATION' 
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  aiPriorityScore: number;
  eventId?: string;
  event?: {
    id: string;
    title: string;
    bannerImage?: string;
  };
  actionLink?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================
// AI TYPES
// ============================================

export interface AIRecommendation {
  event: Event;
  score: number;
  reason: string;
  algorithm: string;
}

export interface SearchResult {
  event: Event;
  relevanceScore: number;
}

export interface CategoryPrediction {
  predictedCategory: string;
  confidence: number;
  alternativeCategories: { category: string; confidence: number }[];
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface StudentDashboard {
  stats: {
    totalRegistrations: number;
    attendedEvents: number;
    upcomingRegistrations: number;
    unreadNotifications: number;
  };
  upcomingEvents: Event[];
  recommendedEvents: AIRecommendation[];
}

export interface OrganizerDashboard {
  stats: {
    totalEvents: number;
    pendingEvents: number;
    approvedEvents: number;
    totalRegistrations: number;
    attendanceRate: number;
  };
  recentEvents: Event[];
  upcomingEvents: Event[];
}

export interface AdminDashboard {
  stats: {
    totalUsers: number;
    newUsersThisMonth: number;
    totalEvents: number;
    pendingApprovals: number;
    upcomingEvents: number;
    ongoingEvents: number;
    totalRegistrations: number;
    recentRegistrations: number;
  };
  userGrowth: { date: string; count: number }[];
  eventsByStatus: { status: string; count: number }[];
  recentUsers: User[];
  recentEvents: Event[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: string;
    field?: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    unreadCount?: number;
  };
}

// ============================================
// UI TYPES
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: UserRole[];
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}