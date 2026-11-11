import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

export const prisma = new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });

/** Count only registrations that still hold a seat. */
export const activeRegistrationsCount = {
  registrations: { where: { status: { not: 'CANCELLED' as const } } },
};
