/**
 * Thin fetch client for the Quad API.
 * - attaches the access token and refreshes it once on expiry
 * - normalizes errors into ApiError
 * - reports "slow" requests so the UI can explain Render cold starts
 */
import type {
  AdminUser,
  AuthTokens,
  Category,
  ChatMessage,
  EventItem,
  EventStatus,
  EventType,
  Notification,
  Paginated,
  Registration,
  User,
  UserRole,
} from '@/types';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5116').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api/v1`;
const AUTH_KEY = 'quad_auth';
const SLOW_MS = 4000;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Array<{ field?: string; message: string }>;
  constructor(message: string, status: number, code = 'ERROR', details?: ApiError['details']) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------- stored session ----------

export interface StoredAuth {
  user: User;
  tokens: AuthTokens;
}

export const session = {
  read(): StoredAuth | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
      return null;
    }
  },
  write(auth: StoredAuth | null) {
    try {
      if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      else localStorage.removeItem(AUTH_KEY);
    } catch {
      /* storage unavailable (private mode): session lives in memory only */
    }
    memory = auth;
    sessionListeners.forEach((l) => l(auth));
  },
};
let memory: StoredAuth | null = session.read();
const sessionListeners = new Set<(a: StoredAuth | null) => void>();
export const onSessionChange = (l: (a: StoredAuth | null) => void) => {
  sessionListeners.add(l);
  return () => {
    sessionListeners.delete(l);
  };
};

// ---------- slow-request (cold start) tracking ----------

let slowCount = 0;
const slowListeners = new Set<() => void>();
export const serverWaking = {
  subscribe(l: () => void) {
    slowListeners.add(l);
    return () => {
      slowListeners.delete(l);
    };
  },
  get: () => slowCount > 0,
};
const bumpSlow = (delta: number) => {
  slowCount = Math.max(0, slowCount + delta);
  slowListeners.forEach((l) => l());
};

// ---------- core request ----------

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean;
  retry?: boolean;
}

async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = memory?.tokens.accessToken;
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let flagged = false;
  const timer = setTimeout(() => {
    flagged = true;
    bumpSlow(1);
  }, SLOW_MS);
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    if (flagged) bumpSlow(-1);
  }
}

let refreshing: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const current = memory;
  if (!current?.tokens.refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await rawRequest('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.tokens.refreshToken },
        auth: false,
      });
      if (!res.ok) return false;
      const json = await res.json();
      session.write({ user: current.user, tokens: json.data.tokens });
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T; meta?: Paginated<unknown>['meta']; message?: string }> {
  const res = await rawRequest(path, opts);
  const json = await res.json().catch(() => null);

  if (res.status === 401 && json?.error?.code === 'TOKEN_EXPIRED' && opts.retry !== false) {
    if (await refreshTokens()) return request<T>(path, { ...opts, retry: false });
    session.write(null);
  }
  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.message || `Request failed (${res.status})`,
      res.status,
      json?.error?.code,
      Array.isArray(json?.error?.details) ? json.error.details : undefined,
    );
  }
  return { data: json.data as T, meta: json.meta, message: json.message };
}

const paged = async <T>(path: string, query?: Query): Promise<Paginated<T>> => {
  const res = await request<T[]>(path, { query });
  return { items: res.data, meta: res.meta! };
};

// ---------- endpoints ----------

export interface EventQuery extends Query {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  type?: EventType;
  isUpcoming?: boolean;
  sortBy?: 'startDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  organizerId?: string;
}

export interface EventInput {
  title: string;
  description: string;
  shortDescription?: string;
  type: EventType;
  categoryId: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  venue: string;
  isOnline: boolean;
  onlineLink?: string;
  bannerImage?: string;
  maxParticipants?: number | null;
  tags: string[];
}

export const api = {
  health: () => fetch(`${API_ORIGIN}/health`).then((r) => r.ok),

  auth: {
    login: (email: string, password: string) =>
      request<StoredAuth>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
    register: (body: { email: string; password: string; firstName: string; lastName: string; role: UserRole; department?: string }) =>
      request<StoredAuth>('/auth/register', { method: 'POST', body, auth: false }),
    me: () => request<{ user: User & { interests: Array<{ category: Category }> } }>('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  events: {
    list: (q: EventQuery = {}) => paged<EventItem>('/events', q),
    get: (id: string) => request<{ event: EventItem }>(`/events/${encodeURIComponent(id)}`),
    categories: () => request<{ categories: Category[] }>('/events/categories'),
    create: (body: EventInput) => request<{ event: EventItem }>('/events', { method: 'POST', body }),
    approve: (id: string) => request(`/events/${id}/approve`, { method: 'PUT' }),
    reject: (id: string, reason: string) => request(`/events/${id}/reject`, { method: 'PUT', body: { reason } }),
    remove: (id: string) => request(`/events/${id}`, { method: 'DELETE' }),
  },

  registrations: {
    mine: (q: Query = {}) => paged<Registration>('/registrations/my-registrations', { limit: 100, ...q }),
    create: (eventId: string) => request<{ registration: Registration }>('/registrations', { method: 'POST', body: { eventId } }),
    cancel: (id: string) => request(`/registrations/${id}`, { method: 'DELETE' }),
  },

  notifications: {
    list: (q: Query = {}) => paged<Notification>('/notifications', { limit: 50, ...q }),
    unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
    remove: (id: string) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },

  users: {
    updateProfile: (body: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'department' | 'year'>>) =>
      request<{ user: User }>('/users/profile', { method: 'PUT', body }),
    addInterest: (categoryId: string) => request('/users/interests', { method: 'POST', body: { categoryId } }),
    removeInterest: (categoryId: string) => request(`/users/interests/${categoryId}`, { method: 'DELETE' }),
  },

  dashboard: {
    student: () =>
      request<{
        stats: { totalRegistrations: number; attendedEvents: number; upcomingRegistrations: number; unreadNotifications: number };
        upcomingEvents: Array<EventItem & { registrationId: string }>;
      }>('/dashboard/student'),
    organizer: () =>
      request<{
        stats: { totalEvents: number; pendingEvents: number; approvedEvents: number; totalRegistrations: number; attendanceRate: number };
        recentEvents: EventItem[];
        upcomingEvents: EventItem[];
      }>('/dashboard/organizer'),
  },

  admin: {
    stats: () =>
      request<{
        users: { total: number; byRole: Array<{ role: UserRole; count: number }> };
        events: {
          total: number;
          upcoming: number;
          ongoing: number;
          byStatus: Array<{ status: EventStatus; count: number }>;
          byCategory: Array<{ category: string; count: number }>;
        };
        registrations: { total: number; last30Days: number };
        categories: number;
      }>('/admin/stats'),
    users: (q: Query = {}) => paged<AdminUser>('/admin/users', { limit: 20, ...q }),
    setRole: (id: string, role: UserRole) => request(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
    setStatus: (id: string, status: string) => request(`/admin/users/${id}/status`, { method: 'PUT', body: { status } }),
    pending: () => paged<EventItem>('/admin/pending-events', { limit: 50 }),
  },

  ai: {
    recommendations: (limit = 6) => request<{ recommendations: EventItem[] }>('/ai/recommendations', { query: { limit } }),
    search: (q: string) => request<{ results: EventItem[]; suggestions: string[] }>('/ai/search', { query: { q } }),
    assistant: (message: string, history: ChatMessage[]) =>
      request<{ reply: string; events: EventItem[] }>('/ai/assistant', {
        method: 'POST',
        body: {
          message,
          history: history.map(({ role, content }) => ({ role, content })),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
    describe: (body: { title: string; type: EventType; notes?: string; venue?: string }) =>
      request<{ description: string; shortDescription: string; tags: string[] }>('/ai/describe', { method: 'POST', body }),
    predictType: (title: string, description: string) =>
      request<{ predicted_category: EventType; confidence: number }>('/ai/predict-category', {
        method: 'POST',
        body: { title, description },
      }),
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
