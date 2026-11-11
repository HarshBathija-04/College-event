import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

export const prisma = new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });

/** Count only registrations that still hold a seat. */
export const activeRegistrationsCount = {
  registrations: { where: { status: { not: 'CANCELLED' as const } } },
};

export const categorySelect = { select: { id: true, name: true, color: true } };
export const organizerSelect = { select: { id: true, firstName: true, lastName: true, avatar: true } };
