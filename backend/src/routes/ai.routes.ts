import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { Prisma } from '@prisma/client';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware';
import { ApiError, asyncHandler, validate } from '../middleware/error.middleware';
import { EVENT_TYPES } from '../middleware/validators';
import { prisma, activeRegistrationsCount } from '../lib/prisma';
import { callAiService } from '../services/ai.client';
import { AuthenticatedRequest } from '../types';

const router = Router();

const eventInclude = {
  category: { select: { id: true, name: true, color: true } },
  organizer: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: activeRegistrationsCount },
} satisfies Prisma.EventInclude;

type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

const format = (e: EventWithRelations, extra: Record<string, unknown> = {}) => {
  const { _count, ...rest } = e;
  return { ...rest, currentParticipants: _count.registrations, ...extra };
};

/** Compact event shape the AI service works with. */
const toCandidate = (e: EventWithRelations) => ({
  id: e.id,
  title: e.title,
  description: e.description.slice(0, 600),
  short_description: e.shortDescription,
  type: e.type,
  category_id: e.categoryId,
  category: e.category.name,
  tags: e.tags,
  venue: e.venue,
  is_online: e.isOnline,
  start_date: e.startDate.toISOString(),
  end_date: e.endDate.toISOString(),
  registrations: e._count.registrations,
  max_participants: e.maxParticipants,
});

const upcomingEvents = (take: number, extraWhere: Prisma.EventWhereInput = {}) =>
  prisma.event.findMany({
    where: { status: 'APPROVED', endDate: { gte: new Date() }, ...extraWhere },
    include: eventInclude,
    orderBy: { startDate: 'asc' },
    take,
  });

/**
 * GET /api/v1/ai/recommendations
 */
const getRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const limit = Number(req.query.limit) || 6;

  const [interests, registered, profile] = userId
    ? await Promise.all([
        prisma.userInterest.findMany({ where: { userId }, select: { categoryId: true } }),
        prisma.registration.findMany({ where: { userId }, select: { eventId: true } }),
        prisma.userProfile.findUnique({ where: { userId } }),
      ])
    : [[], [], null];

  const excludeIds = registered.map((r) => r.eventId);
  const candidates = await upcomingEvents(100, excludeIds.length ? { id: { notIn: excludeIds } } : {});
  const byId = new Map(candidates.map((e) => [e.id, e]));

  if (candidates.length) {
    const ai = await callAiService<Array<{ event_id: string; score: number; reason: string; algorithm: string }>>(
      '/recommendations',
      {
        user_features: {
          user_id: userId ?? 'anonymous',
          preferred_categories: interests.map((i) => i.categoryId),
          engagement_score: Math.min(Math.max(profile?.engagementScore ?? 0, 0), 1),
          total_events_attended: profile?.totalEventsAttended ?? 0,
        },
        events: candidates.map(toCandidate),
        exclude_event_ids: excludeIds,
        limit,
      },
    );

    if (ai.ok && Array.isArray(ai.data) && ai.data.length) {
      const recommendations = ai.data
        .filter((r) => byId.has(r.event_id))
        .map((r) => format(byId.get(r.event_id)!, { score: r.score, reason: r.reason, algorithm: r.algorithm }));
      res.json({ success: true, message: 'Personalized recommendations', data: { recommendations } });
      return;
    }
  }

  // Fallback: interest match first, then most popular, soonest first.
  const interestIds = new Set(interests.map((i) => i.categoryId));
  const recommendations = [...candidates]
    .sort(
      (a, b) =>
        Number(interestIds.has(b.categoryId)) - Number(interestIds.has(a.categoryId)) ||
        b._count.registrations - a._count.registrations,
    )
    .slice(0, limit)
    .map((e) =>
      format(e, {
        score: interestIds.has(e.categoryId) ? 0.7 : 0.5,
        reason: interestIds.has(e.categoryId) ? 'Matches your interests' : 'Popular on campus',
        algorithm: 'rule-based',
      }),
    );

  res.json({ success: true, message: 'Recommendations (rule-based fallback)', data: { recommendations } });
};

/**
 * GET /api/v1/ai/search?q=
 */
const smartSearch = async (req: AuthenticatedRequest, res: Response) => {
  const q = String(req.query.q);
  const candidates = await upcomingEvents(200);
  const byId = new Map(candidates.map((e) => [e.id, e]));

  const ai = await callAiService<{
    results: Array<{ event_id: string; score: number }>;
    processed_query: string;
    suggestions: string[];
  }>('/search', { query: q, events: candidates.map(toCandidate) });

  if (ai.ok && ai.data) {
    const results = ai.data.results
      .filter((r) => byId.has(r.event_id))
      .map((r) => format(byId.get(r.event_id)!, { relevanceScore: r.score }));
    res.json({
      success: true,
      message: 'Search results',
      data: { results, processedQuery: ai.data.processed_query, suggestions: ai.data.suggestions },
    });
    return;
  }

  const needle = q.toLowerCase();
  const results = candidates
    .filter((e) =>
      [e.title, e.description, e.category.name, ...e.tags].some((t) => t.toLowerCase().includes(needle)),
    )
    .slice(0, 20)
    .map((e) => format(e, { relevanceScore: 0.5 }));

  res.json({ success: true, message: 'Search results (fallback)', data: { results, processedQuery: q, suggestions: [] } });
};

/**
 * POST /api/v1/ai/predict-category  -> suggested EventType
 */
const predictCategory = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description } = req.body;
  const ai = await callAiService<{ predicted_category: string; confidence: number; alternative_categories: unknown[] }>(
    '/predict-category',
    { title, description },
  );

  if (ai.ok && ai.data) {
    res.json({ success: true, message: 'Category prediction', data: ai.data });
    return;
  }
  res.json({
    success: true,
    message: 'Category prediction (fallback)',
    data: { predicted_category: 'OTHER', confidence: 0, alternative_categories: [] },
  });
};

/** Maps AI service failures for LLM features onto clean API errors. */
const llmError = (status: number, detail?: string) => {
  if (status === 429) return new ApiError('The AI assistant is busy right now. Please try again in a minute.', 429, 'AI_RATE_LIMITED');
  if (status === 503) return new ApiError('The AI assistant is not configured.', 503, 'AI_UNAVAILABLE');
  return new ApiError(detail || 'The AI assistant is unavailable right now. Please try again shortly.', 502, 'AI_ERROR');
};

/**
 * POST /api/v1/ai/assistant  { message, history }
 * Campus concierge: answers questions grounded in the real upcoming events.
 */
const assistant = async (req: AuthenticatedRequest, res: Response) => {
  const { message, history = [], tz } = req.body as {
    message: string;
    history?: Array<{ role: string; content: string }>;
    tz?: string;
  };
  const userId = req.user?.userId;

  const [events, user] = await Promise.all([
    upcomingEvents(40),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, department: true, interests: { select: { category: { select: { name: true } } } } },
        })
      : null,
  ]);

  const ai = await callAiService<{ reply: string; event_ids: string[] }>(
    '/assistant/chat',
    {
      message,
      history: history.slice(-8),
      events: events.map(toCandidate),
      user: user
        ? { first_name: user.firstName, department: user.department, interests: user.interests.map((i) => i.category.name) }
        : null,
      now: new Date().toISOString(),
      tz,
    },
    30_000,
  );

  if (!ai.ok || !ai.data) throw llmError(ai.status, ai.error);

  const byId = new Map(events.map((e) => [e.id, e]));
  res.json({
    success: true,
    message: 'Assistant reply',
    data: {
      reply: ai.data.reply,
      events: ai.data.event_ids.filter((id) => byId.has(id)).slice(0, 4).map((id) => format(byId.get(id)!)),
    },
  });
};

/**
 * POST /api/v1/ai/describe  { title, type, notes }
 * Drafts a polished description, short tagline and tags for organizers.
 */
const describe = async (req: AuthenticatedRequest, res: Response) => {
  const { title, type, notes, venue } = req.body;
  const ai = await callAiService<{ description: string; short_description: string; tags: string[] }>(
    '/assistant/describe',
    { title, type, notes: notes ?? '', venue: venue ?? '' },
    30_000,
  );
  if (!ai.ok || !ai.data) throw llmError(ai.status, ai.error);
  res.json({
    success: true,
    message: 'Draft generated',
    data: { description: ai.data.description, shortDescription: ai.data.short_description, tags: ai.data.tags },
  });
};

router.get(
  '/recommendations',
  optionalAuth,
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt(),
  validate,
  asyncHandler(getRecommendations),
);
router.get(
  '/search',
  optionalAuth,
  query('q').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Search query is required'),
  validate,
  asyncHandler(smartSearch),
);
router.post(
  '/predict-category',
  authenticate,
  body('title').isString().trim().isLength({ min: 3, max: 200 }),
  body('description').isString().trim().isLength({ min: 10, max: 5000 }),
  validate,
  asyncHandler(predictCategory),
);
router.post(
  '/assistant',
  optionalAuth,
  body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('history').optional().isArray({ max: 20 }),
  body('tz').optional().isString().matches(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/).withMessage('Invalid timezone'),
  body('history.*.role').optional().isIn(['user', 'assistant']),
  body('history.*.content').optional().isString().isLength({ max: 4000 }),
  validate,
  asyncHandler(assistant),
);
router.post(
  '/describe',
  authenticate,
  authorize('ORGANIZER', 'FACULTY', 'ADMIN'),
  body('title').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Add a title first (3+ characters)'),
  body('type').isIn(EVENT_TYPES),
  body('notes').optional().isString().trim().isLength({ max: 2000 }),
  body('venue').optional().isString().trim().isLength({ max: 200 }),
  validate,
  asyncHandler(describe),
);

export default router;
