import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { DEMO_PASSWORD, seed } from '../src/utils/seed';

const api = request(app);
const runId = Date.now().toString(36);
const testEmail = (name: string) => `test-${runId}-${name}@example.edu`;

async function login(email: string, password = DEMO_PASSWORD): Promise<string> {
  const res = await api.post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.tokens.accessToken;
}

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await prisma.event.deleteMany({ where: { title: { startsWith: `Test ${runId}` } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `test-${runId}` } } });
  await prisma.$disconnect();
});

describe('health', () => {
  it('reports ok when the database is reachable', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });
});

describe('events', () => {
  it('lists only published events by default', async () => {
    const res = await api.get('/api/v1/events?limit=50');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(5);
    expect(res.body.data.every((e: { status: string }) => e.status === 'APPROVED')).toBe(true);
  });

  it('rejects unknown query values', async () => {
    const res = await api.get('/api/v1/events?sortBy=password');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('hides unapproved events from the public', async () => {
    const res = await api.get('/api/v1/events/evt-data-hack');
    expect(res.status).toBe(404);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await api.get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('auth', () => {
  it('registers, logs in and returns the current user', async () => {
    const email = testEmail('student');
    const reg = await api
      .post('/api/v1/auth/register')
      .send({ email, password: 'Sup3rSecret', firstName: 'Test', lastName: 'Student' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.role).toBe('STUDENT');
    expect(reg.body.data.user).not.toHaveProperty('password');

    const token = await login(email, 'Sup3rSecret');
    const me = await api.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  it('does not allow self-registration as admin', async () => {
    const res = await api
      .post('/api/v1/auth/register')
      .send({ email: testEmail('admin'), password: 'Sup3rSecret', firstName: 'Evil', lastName: 'User', role: 'ADMIN' });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong password', async () => {
    const res = await api.post('/api/v1/auth/login').send({ email: 'student@example.edu', password: 'wrong-pass1' });
    expect(res.status).toBe(401);
  });

  it('requires a token for protected routes', async () => {
    const res = await api.get('/api/v1/dashboard/student');
    expect(res.status).toBe(401);
  });
});

describe('event lifecycle', () => {
  it('organizer submits, faculty approves, student registers once', async () => {
    const organizer = await login('organizer@example.edu');
    const faculty = await login('faculty@example.edu');
    const student = await login('student@example.edu');
    const categories = await api.get('/api/v1/events/categories');
    const categoryId = categories.body.data.categories[0].id;

    const start = new Date(Date.now() + 5 * 86400000);
    const created = await api
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${organizer}`)
      .send({
        title: `Test ${runId} Robotics Meetup`,
        description: 'A meetup to test the approval workflow end to end.',
        type: 'TECHNICAL',
        startDate: start.toISOString(),
        endDate: new Date(start.getTime() + 2 * 3600000).toISOString(),
        venue: 'Lab 1',
        categoryId,
        maxParticipants: 10,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.event.status).toBe('PENDING_APPROVAL');
    const eventId = created.body.data.event.id;

    const studentCreate = await api.post('/api/v1/events').set('Authorization', `Bearer ${student}`).send({});
    expect(studentCreate.status).toBe(403);

    const approved = await api.put(`/api/v1/events/${eventId}/approve`).set('Authorization', `Bearer ${faculty}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.event.status).toBe('APPROVED');

    const reg = await api.post('/api/v1/registrations').set('Authorization', `Bearer ${student}`).send({ eventId });
    expect(reg.status).toBe(201);
    const dup = await api.post('/api/v1/registrations').set('Authorization', `Bearer ${student}`).send({ eventId });
    expect(dup.status).toBe(409);

    const notifications = await api.get('/api/v1/notifications').set('Authorization', `Bearer ${organizer}`);
    expect(notifications.body.data.some((n: { eventId: string }) => n.eventId === eventId)).toBe(true);
  });
});

describe('dashboards', () => {
  it('admin dashboard serializes aggregate data', async () => {
    const admin = await login('admin@example.edu');
    const res = await api.get('/api/v1/dashboard/admin').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stats.totalUsers).toBeGreaterThan(0);
  });

  it('recommendations fall back gracefully when the AI service is down', async () => {
    const res = await api.get('/api/v1/ai/recommendations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.recommendations)).toBe(true);
  });
});
