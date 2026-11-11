import { MapPin, Monitor, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { dateStamp, eventPhase, formatTime, seatsLeft, STATUS_LABELS, typeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventItem, EventStatus } from '@/types';

/** Banner image with a category-tinted fallback when it is missing or fails. */
export function EventBanner({ event, className }: { event: EventItem; className?: string }) {
  const [failed, setFailed] = useState(false);
  const color = event.category?.color ?? '#1b3a8f';
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)} style={{ backgroundColor: `${color}22` }}>
      {event.bannerImage && !failed ? (
        <img
          src={event.bannerImage}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="grid size-full place-items-center font-display text-4xl font-extrabold opacity-40"
          style={{ color }}
          aria-hidden="true"
        >
          {event.title.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

export function DateStamp({ iso, className }: { iso: string; className?: string }) {
  const d = dateStamp(iso);
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col items-center rounded-lg bg-card py-1.5 text-center shadow-card ring-1 ring-border',
        className,
      )}
    >
      <span className="text-[10px] font-bold tracking-widest text-highlight">{d.month}</span>
      <span className="tabular font-display text-2xl font-extrabold leading-none">{d.day}</span>
      <span className="text-[10px] font-medium text-muted-foreground">{d.weekday}</span>
    </div>
  );
}

const statusStyles: Partial<Record<EventStatus, string>> = {
  PENDING_APPROVAL: 'bg-warning/15 text-warning',
  REJECTED: 'bg-destructive/10 text-destructive',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
  APPROVED: 'bg-success/15 text-success',
};

export function StatusPill({ status }: { status: EventStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryTag({ event }: { event: EventItem }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: event.category?.color }} aria-hidden="true" />
      {event.category?.name ?? typeLabel(event.type)}
    </span>
  );
}

export function EventCard({ event, showStatus = false }: { event: EventItem; showStatus?: boolean }) {
  const phase = eventPhase(event);
  const left = seatsLeft(event);
  const full = left === 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <EventBanner event={event} className="aspect-[16/9]" />
      <div className="absolute left-3 top-3 flex gap-2">
        {phase === 'live' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 text-xs font-bold text-highlight-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" /> Happening now
          </span>
        )}
        {event.reason && (
          <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs backdrop-blur">
            <Sparkles className="size-3 text-highlight" aria-hidden="true" /> {event.reason}
          </span>
        )}
      </div>
      <div className="flex flex-1 gap-3 p-4">
        <DateStamp iso={event.startDate} className="relative z-10 -mt-10 self-start" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag event={event} />
            {showStatus && <StatusPill status={event.status} />}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug">
            <Link to={`/events/${event.id}`} className="after:absolute after:inset-0 focus-visible:ring-0">
              {event.title}
            </Link>
          </h3>
          {event.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.shortDescription}</p>}
          <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Where</dt>
              {event.isOnline ? (
                <Monitor className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <dd className="truncate">
                {event.isOnline ? 'Online' : event.venue} · {formatTime(event.startDate)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Attendance</dt>
              <Users className="size-3.5 shrink-0" aria-hidden="true" />
              <dd
                className={cn(
                  'tabular',
                  full && 'font-semibold text-destructive',
                  left !== null && left > 0 && left <= 10 && 'font-semibold text-warning',
                )}
              >
                {event.currentParticipants} going
                {left !== null && (full ? ' · Full' : ` · ${left} seats left`)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-hidden="true">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="flex gap-3 p-4">
        <Skeleton className="h-16 w-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function EventGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
