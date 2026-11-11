import { describe, expect, it } from 'vitest';
import { withSchema } from '../src/config/env';
import { weekAnchor } from '../src/utils/seed';

describe('withSchema', () => {
  it('adds the schema param and keeps existing params', () => {
    const url = new URL(withSchema('postgresql://u:p@host:5432/db?sslmode=require', 'college_event'));
    expect(url.searchParams.get('schema')).toBe('college_event');
    expect(url.searchParams.get('sslmode')).toBe('require');
  });

  it('rejects unsafe schema names', () => {
    expect(() => withSchema('postgresql://u:p@h/db', 'bad"; drop')).toThrow(/Invalid DB_SCHEMA/);
    expect(() => withSchema('postgresql://u:p@h/db', 'Upper')).toThrow();
  });
});

describe('weekAnchor', () => {
  it('returns Monday 00:00 UTC of the same week', () => {
    expect(weekAnchor(new Date('2026-11-11T15:30:00Z')).toISOString()).toBe('2026-11-09T00:00:00.000Z'); // Wednesday
    expect(weekAnchor(new Date('2026-11-15T23:59:00Z')).toISOString()).toBe('2026-11-09T00:00:00.000Z'); // Sunday
    expect(weekAnchor(new Date('2026-11-16T00:00:00Z')).toISOString()).toBe('2026-11-16T00:00:00.000Z'); // Monday
  });
});
