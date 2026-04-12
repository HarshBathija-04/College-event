/**
 * AI Routes
 * 
 * Defines routes for AI-powered features.
 * These routes communicate with the Python AI microservice.
 * 
 * @module routes/ai
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { Response } from 'express';

const prisma = new PrismaClient();
const router = Router();

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Get personalized event recommendations
 * GET /api/v1/ai/recommendations
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      // Return trending events for non-authenticated users
      const trendingEvents = await prisma.event.findMany({
        where: {
          status: 'APPROVED',
          startDate: { gt: new Date() },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              registrations: true,
            },
          },
        },
        orderBy: {
          registrations: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      res.status(200).json({
        success: true,
        message: 'Trending events retrieved',
        data: {
          recommendations: trendingEvents.map(e => ({
            ...e,
            currentParticipants: e._count.registrations,
            _count: undefined,
            score: 0.5,
            reason: 'Trending event',
            algorithm: 'popularity',
          })),
        },
      });
      return;
    }

    // Get user's interests and history
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const userInterests = await prisma.userInterest.findMany({
      where: { userId },
      select: { categoryId: true, weight: true },
    });

    const registeredEventIds = await prisma.registration.findMany({
      where: { userId },
      select: { eventId: true },
    });

    // Build user features for recommendation
    const userFeatures = {
      userId,
      preferredCategories: userInterests.map(ui => ui.categoryId),
      engagementScore: userProfile?.engagementScore || 0,
      totalEventsAttended: userProfile?.totalEventsAttended || 0,
    };

    // Call AI service for recommendations
    try {
      const response = await fetch(`${AI_SERVICE_URL}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({
          user_features: userFeatures,
          exclude_event_ids: registeredEventIds.map(r => r.eventId),
          limit,
        }),
      });

      if (response.ok) {
        const aiResult = await response.json();
        
        // Get full event details for recommended events
        const eventIds = aiResult.recommendations.map((r: any) => r.event_id);
        const events = await prisma.event.findMany({
          where: {
            id: { in: eventIds },
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                registrations: true,
              },
            },
          },
        });

        // Merge AI scores with event data
        const recommendations = aiResult.recommendations.map((rec: any) => {
          const event = events.find(e => e.id === rec.event_id);
          return {
            ...event,
            currentParticipants: event?._count.registrations || 0,
            _count: undefined,
            score: rec.score,
            reason: rec.reason,
            algorithm: rec.algorithm,
          };
        }).filter((r: any) => r.id); // Remove any null events

        res.status(200).json({
          success: true,
          message: 'Personalized recommendations retrieved',
          data: { recommendations },
        });
        return;
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
      // Fall back to rule-based recommendations
    }

    // Fallback: Rule-based recommendations
    const recommendedEvents = await prisma.event.findMany({
      where: {
        status: 'APPROVED',
        startDate: { gt: new Date() },
        id: { notIn: registeredEventIds.map(r => r.eventId) },
        categoryId: userInterests.length > 0 
          ? { in: userInterests.map(ui => ui.categoryId) }
          : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { registrations: { _count: 'desc' } },
      ],
      take: limit,
    });

    res.status(200).json({
      success: true,
      message: 'Recommendations retrieved (rule-based fallback)',
      data: {
        recommendations: recommendedEvents.map(e => ({
          ...e,
          currentParticipants: e._count.registrations,
          _count: undefined,
          score: 0.7,
          reason: 'Based on your interests',
          algorithm: 'rule-based',
        })),
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Smart search with NLP
 * GET /api/v1/ai/search
 */
export const smartSearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const userId = req.user?.userId;

    if (!query || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Search query is required',
        error: { code: 'MISSING_QUERY' },
      });
      return;
    }

    // Try AI service first
    try {
      const response = await fetch(`${AI_SERVICE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({
          query,
          user_id: userId,
        }),
      });

      if (response.ok) {
        const aiResult = await response.json();
        
        // Get event details
        const eventIds = aiResult.results.map((r: any) => r.event_id);
        const events = await prisma.event.findMany({
          where: {
            id: { in: eventIds },
            status: 'APPROVED',
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            organizer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                registrations: true,
              },
            },
          },
        });

        const results = aiResult.results.map((rec: any) => {
          const event = events.find(e => e.id === rec.event_id);
          return {
            ...event,
            currentParticipants: event?._count.registrations || 0,
            _count: undefined,
            relevanceScore: rec.score,
          };
        }).filter((r: any) => r.id);

        res.status(200).json({
          success: true,
          message: 'Search results retrieved',
          data: {
            results,
            processedQuery: aiResult.processed_query,
            suggestions: aiResult.suggestions,
          },
        });
        return;
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
    }

    // Fallback: Simple text search
    const events = await prisma.event.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 20,
    });

    res.status(200).json({
      success: true,
      message: 'Search results retrieved (fallback)',
      data: {
        results: events.map(e => ({
          ...e,
          currentParticipants: e._count.registrations,
          _count: undefined,
          relevanceScore: 0.5,
        })),
        processedQuery: query,
        suggestions: [],
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Predict event category
 * POST /api/v1/ai/predict-category
 */
export const predictCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      res.status(400).json({
        success: false,
        message: 'Title and description are required',
        error: { code: 'MISSING_FIELDS' },
      });
      return;
    }

    // Try AI service
    try {
      const response = await fetch(`${AI_SERVICE_URL}/predict-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_SERVICE_API_KEY || '',
        },
        body: JSON.stringify({
          title,
          description,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        res.status(200).json({
          success: true,
          message: 'Category prediction retrieved',
          data: result,
        });
        return;
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
    }

    // Fallback: Return all categories
    const categories = await prisma.eventCategory.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Category prediction (fallback)',
      data: {
        predicted_category: categories[0]?.id,
        confidence: 0.3,
        alternative_categories: categories.slice(1, 4).map(c => ({
          category: c.id,
          confidence: 0.2,
        })),
      },
    });
  } catch (error) {
    throw error;
  }
};

// Routes
router.get('/recommendations', optionalAuth, asyncHandler(getRecommendations));
router.get('/search', optionalAuth, asyncHandler(smartSearch));
router.post('/predict-category', authenticate, asyncHandler(predictCategory));

export default router;