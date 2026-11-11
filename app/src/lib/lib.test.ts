import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';
import { eventPhase, icsFor, seatsLeft } from './format';
import type { EventItem } from '@/types';

const hour = 3600_000;

describe('eventPhase', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  it('classifies upcoming, live and ended events', () => {
    expect(eventPhase({ startDate: new Date(now + hour).toISOString(), endDate: new Date(now + 2 * hour).toISOString() }, now)).toBe(
      'upcoming',
    );
    expect(eventPhase({ startDate: new Date(now - hour).toISOString(), endDate: new Date(now + hour).toISOString() }, now)).toBe('live');
    expect(eventPhase({ startDate: new Date(now - 2 * hour).toISOString(), endDate: new Date(now - hour).toISOString() }, now)).toBe(
      'ended',
    );
  });
});

describe('seatsLeft', () => {
  it('returns null for unlimited events and never goes negative', () => {
    expect(seatsLeft({ maxParticipants: null, currentParticipants: 5 })).toBeNull();
    expect(seatsLeft({ maxParticipants: 10, currentParticipants: 4 })).toBe(6);
    expect(seatsLeft({ maxParticipants: 10, currentParticipants: 12 })).toBe(0);
  });
});

describe('icsFor', () => {
  it('produces a valid calendar entry with escaped text', () => {
    const ics = icsFor({
      id: 'evt-1',
      title: 'Talk; with, commas',
      description: 'Line one',
      startDate: '2026-11-20T10:00:00.000Z',
      endDate: '2026-11-20T12:00:00.000Z',
      venue: 'Hall A',
      isOnline: false,
    } as EventItem);
    expect(ics).toContain('DTSTART:20261120T100000Z');
    expect(ics).toContain('SUMMARY:Talk\\; with\\, commas');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });
});

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('turns error envelopes into ApiError with code and field details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: false,
              message: 'Invalid sort field',
              error: { code: 'VALIDATION_ERROR', details: [{ field: 'sortBy', message: 'Invalid sort field' }] },
            }),
            { status: 400 },
          ),
      ),
    );
    const err = await api.events.list().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details[0].field).toBe('sortBy');
  });

  it('reports network failures with a friendly message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const err = await api.events.categories().catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
