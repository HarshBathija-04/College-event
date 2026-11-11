export type UserRole = 'STUDENT' | 'ORGANIZER' | 'FACULTY' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type EventStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type EventType = 'ACADEMIC' | 'CULTURAL' | 'SPORTS' | 'TECHNICAL' | 'WORKSHOP' | 'SEMINAR' | 'COMPETITION' | 'SOCIAL' | 'OTHER';
export type RegistrationStatus = 'REGISTERED' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'NO_SHOW';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string | null;
  phone?: string | null;
  department?: string | null;
  year?: number | null;
  rollNumber?: string | null;
  createdAt?: string;
  lastLogin?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  icon?: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  registrationDeadline?: string | null;
  venue: string;
  isOnline: boolean;
  onlineLink?: string | null;
  bannerImage?: string | null;
  maxParticipants?: number | null;
  currentParticipants: number;
  tags: string[];
  rejectionReason?: string | null;
  createdAt?: string;
  categoryId: string;
  category?: Pick<Category, 'id' | 'name' | 'color'>;
  organizerId: string;
  organizer?: { id: string; firstName: string; lastName: string; department?: string | null; email?: string };
  registrations?: Array<{ id: string; userId: string; status: RegistrationStatus; attended: boolean }>;
  // AI extras
  score?: number;
  reason?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  attended: boolean;
  createdAt: string;
  event: EventItem;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRead: boolean;
  eventId?: string | null;
  actionLink?: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

export interface AdminUser extends User {
  _count: { organizedEvents: number; registrations: number };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  events?: EventItem[];
}
