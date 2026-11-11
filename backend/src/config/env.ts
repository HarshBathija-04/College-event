import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, devDefault?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (!isProd && devDefault !== undefined) return devDefault;
  throw new Error(`Missing required environment variable: ${name}`);
}

const SCHEMA_RE = /^[a-z_][a-z0-9_]{0,62}$/;

/** Appends Prisma's `schema` param so every query runs with search_path = DB_SCHEMA. */
export function withSchema(databaseUrl: string, schema: string): string {
  if (!SCHEMA_RE.test(schema)) throw new Error(`Invalid DB_SCHEMA: ${schema}`);
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  return url.toString();
}

const dbSchema = process.env.DB_SCHEMA || 'college_event';

export const env = {
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5116,
  dbSchema,
  databaseUrl: withSchema(
    required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5433/portfolio'),
    dbSchema,
  ),
  jwtSecret: required('JWT_SECRET', 'dev-only-jwt-secret-change-me'),
  // Falls back to a derived value so a single JWT_SECRET is enough to deploy.
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || `${required('JWT_SECRET', 'dev-only-jwt-secret-change-me')}:refresh`,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5208')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  aiServiceUrl: (process.env.AI_SERVICE_URL || 'http://localhost:5117').replace(/\/$/, ''),
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY || '',
  enableCron: process.env.ENABLE_CRON !== 'false',
};
