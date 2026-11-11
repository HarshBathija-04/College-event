/**
 * Express application (no listen) so tests can import it with supertest.
 */
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import registrationRoutes from './routes/registration.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import { logger } from './utils/logger';

const app: Application = express();
const API_PREFIX = '/api/v1';

// Render sits behind one proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || env.frontendUrls.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

const limiterMessage = (message: string) => ({
  success: false,
  message,
  error: { code: 'TOO_MANY_REQUESTS' },
});

const skipInTests = () => env.isTest;

app.use(
  `${API_PREFIX}/`,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: skipInTests,
    message: limiterMessage('Too many requests, please try again later.'),
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: limiterMessage('Too many authentication attempts, please try again in 15 minutes.'),
});
app.use([`${API_PREFIX}/auth/login`, `${API_PREFIX}/auth/register`, `${API_PREFIX}/auth/refresh`], authLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: limiterMessage('AI requests are limited to 20 per minute. Please slow down.'),
});
app.use(`${API_PREFIX}/ai`, aiLimiter);

if (!env.isTest) {
  app.use(
    morgan(env.isProd ? 'combined' : 'dev', {
      stream: { write: (message: string) => logger.info(message.trim()) },
      skip: (req) => req.path === '/health',
    }),
  );
}

app.use(express.json({ limit: '100kb' }));

/** Liveness + DB check, also hit by the keep-alive workflow. */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'ok' });
  } catch (error) {
    logger.error('Health check DB failure', { error: (error as Error).message });
    res.status(503).json({ status: 'error', db: 'error' });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Campus Pulse API', health: '/health', api: API_PREFIX });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/events`, eventRoutes);
app.use(`${API_PREFIX}/registrations`, registrationRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
