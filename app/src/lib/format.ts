import type { EventItem, EventStatus, EventType } from '@/types';

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatFullDate = (iso: string) => fullFmt.format(new Date(iso));

export function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay
    ? `${formatDate(start)} · ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDate(start)}, ${formatTime(start)} – ${formatDate(end)}, ${formatTime(end)}`;
}

export function dateStamp(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: d.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleString(undefined, { weekday: 'short' }),
  };
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

export type EventPhase = 'upcoming' | 'live' | 'ended';
export function eventPhase(e: Pick<EventItem, 'startDate' | 'endDate'>, now = Date.now()): EventPhase {
  if (new Date(e.endDate).getTime() < now) return 'ended';
  if (new Date(e.startDate).getTime() <= now) return 'live';
  return 'upcoming';
}

export function seatsLeft(e: Pick<EventItem, 'maxParticipants' | 'currentParticipants'>) {
  return e.maxParticipants ? Math.max(0, e.maxParticipants - e.currentParticipants) : null;
}

export const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SEMINAR', label: 'Seminar' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'OTHER', label: 'Other' },
];
export const STATUS_LABELS: Record<EventStatus, string> = {
  APPROVED: 'Published',
  PENDING_APPROVAL: 'Awaiting approval',
  REJECTED: 'Changes requested',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  ONGOING: 'Ongoing',
};

export const typeLabel = (t: EventType) => EVENT_TYPES.find((x) => x.value === t)?.label ?? t;

export const initials = (first?: string, last?: string) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

/** Local "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Builds a minimal .ics file so attendees can add the event to any calendar. */
export function icsFor(e: EventItem) {
  const stamp = (iso: string) =>
    new Date(iso)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quad//Campus Events//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@quad`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.startDate)}`,
    `DTEND:${stamp(e.endDate)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.isOnline ? 'Online' : e.venue)}`,
    `DESCRIPTION:${esc(e.shortDescription || e.description.slice(0, 300))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
