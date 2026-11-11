/**
 * HTTP entry point: starts the server and scheduled notification jobs.
 */
import app from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { NotificationService } from './services/notification.service';
import { logger } from './utils/logger';

const server = app.listen(env.port, () => {
  logger.info(`API listening on port ${env.port} (${env.isProd ? 'production' : 'development'})`);
});

if (env.enableCron) NotificationService.initializeCronJobs();

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err instanceof Error ? err.message : String(err) });
});
