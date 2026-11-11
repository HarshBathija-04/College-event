import { ArrowLeft, CalendarPlus, Check, Clock, Link2, Loader2, MapPin, Monitor, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CategoryTag, DateStamp, EventBanner, StatusPill } from '@/components/app/EventCard';
import { EmptyState, ErrorState } from '@/components/app/States';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError, errorMessage } from '@/lib/api';
import { eventPhase, formatDate, formatFullDate, formatTime, formatRange, icsFor, seatsLeft, typeLabel } from '@/lib/format';

export default function EventDetailPage() {
  const { id = '' } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data: event, error, loading, reload, setData } = useAsync(() => api.events.get(id).then((r) => r.data.event), [id, user?.id]);

  if (loading) return <DetailSkeleton />;
  if (error || !event) {
    const notFound = error?.toLowerCase().includes('not found');
    return (
      <div className="page py-16">
        {notFound ? (
          <EmptyState
            icon={CalendarPlus}
            title="This event isn't available"
            description="It may have been removed or is still waiting for approval."
            action={
              <Button asChild>
                <Link to="/events">Browse events</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState message={error ?? 'Unknown error'} onRetry={reload} />
        )}
      </div>
    );
  }

  const mine = event.registrations?.find((r) => r.status !== 'CANCELLED');
  const phase = eventPhase(event);
  const left = seatsLeft(event);
  const deadlinePassed = !!event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const isOwner = user?.id === event.organizerId;
  const canDelete = isOwner || user?.role === 'ADMIN';
  const open = event.status === 'APPROVED' && phase !== 'ended' && !deadlinePassed && left !== 0;
  const fillPct = event.maxParticipants ? Math.min(100, Math.round((event.currentParticipants / event.maxParticipants) * 100)) : null;

  async function register() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.registrations.create(event!.id);
      setData({
        ...event!,
        currentParticipants: event!.currentParticipants + 1,
        registrations: [{ id: data.registration.id, userId: user!.id, status: 'CONFIRMED', attended: false }],
      });
      toast.success("You're in!", { description: 'We added it to My tickets. Add it to your calendar too.' });
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 409 ? 'You are already registered.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!mine) return;
    setBusy(true);
    try {
      await api.registrations.cancel(mine.id);
      setData({ ...event!, currentParticipants: Math.max(0, event!.currentParticipants - 1), registrations: [] });
      toast('Registration cancelled', { description: 'Your seat has been released.' });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await api.events.remove(event!.id);
      toast.success('Event deleted');
      navigate('/dashboard');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function downloadIcs() {
    const blob = new Blob([icsFor(event!)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${event!.title.replace(/[^\w]+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event!.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const ctaLabel =
    event.status !== 'APPROVED'
      ? 'Not open yet'
      : phase === 'ended'
        ? 'This event has ended'
        : left === 0
          ? 'Fully booked'
          : deadlinePassed
            ? 'Registration closed'
            : 'Register, it’s free';

  return (
    <article className="pb-10">
      <div className="page pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft /> Back
        </Button>
      </div>
      <div className="page mt-3">
        <EventBanner event={event} className="aspect-[21/9] max-h-[420px] w-full rounded-2xl" />
      </div>

      {/* Mobile order: header, booking card, details. Desktop: booking card spans the right column. */}
      <div className="page mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryTag event={event} />
            {typeLabel(event.type) !== event.category?.name && (
              <span className="text-xs font-semibold text-muted-foreground">· {typeLabel(event.type)}</span>
            )}
            {event.status !== 'APPROVED' && <StatusPill status={event.status} />}
            {phase === 'live' && (
              <span className="rounded-full bg-highlight px-2.5 py-0.5 text-xs font-bold text-highlight-foreground">Happening now</span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{event.title}</h1>
          {event.shortDescription && <p className="mt-3 text-xl text-muted-foreground">{event.shortDescription}</p>}

          {event.status === 'REJECTED' && event.rejectionReason && (
            <div role="note" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">Reviewer note</p>
              <p className="mt-1">{event.rejectionReason}</p>
            </div>
          )}

        </div>

        <div className="order-last min-w-0 lg:order-none lg:col-start-1 lg:row-start-2">
          <h2 className="text-xl font-bold">About this event</h2>
          <div className="mt-3 max-w-prose space-y-4 whitespace-pre-line leading-relaxed text-foreground/90">{event.description}</div>

          {event.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
              {event.tags.map((t) => (
                <li key={t} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  #{t}
                </li>
              ))}
            </ul>
          )}

          {event.organizer && (
            <div className="mt-10 flex items-center gap-3 border-t pt-6">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                {event.organizer.firstName[0]}
                {event.organizer.lastName[0]}
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <p className="font-semibold">
                  {event.organizer.firstName} {event.organizer.lastName}
                  {event.organizer.department && <span className="font-normal text-muted-foreground"> · {event.organizer.department}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="surface overflow-hidden">
            <div className="flex gap-4 border-b p-5">
              <DateStamp iso={event.startDate} />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{formatFullDate(event.startDate)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" /> {formatRange(event.startDate, event.endDate)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                  {event.isOnline ? (
                    <Monitor className="size-3.5" aria-hidden="true" />
                  ) : (
                    <MapPin className="size-3.5" aria-hidden="true" />
                  )}
                  {event.isOnline ? 'Online' : event.venue}
                </p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Users className="size-4" aria-hidden="true" /> <span className="tabular">{event.currentParticipants}</span> going
                  </span>
                  {left !== null && (
                    <span className="tabular text-muted-foreground">
                      {left === 0 ? 'Full' : `${left} of ${event.maxParticipants} left`}
                    </span>
                  )}
                </div>
                {fillPct !== null && (
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={fillPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Seats taken"
                  >
                    <div className="h-full rounded-full bg-highlight transition-[width] duration-500" style={{ width: `${fillPct}%` }} />
                  </div>
                )}
              </div>

              {mine ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm font-semibold text-success">
                    <Check className="size-4" aria-hidden="true" /> You're registered
                  </p>
                  {phase !== 'ended' && (
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={cancel} disabled={busy}>
                      {busy && <Loader2 className="animate-spin" />} Cancel my registration
                    </Button>
                  )}
                </div>
              ) : (
                <Button size="lg" variant="highlight" className="w-full" onClick={register} disabled={!open || busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {ctaLabel}
                </Button>
              )}
              {event.registrationDeadline && !deadlinePassed && open && (
                <p className="text-center text-xs text-muted-foreground">
                  Registration closes {formatDate(event.registrationDeadline)}, {formatTime(event.registrationDeadline)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={downloadIcs}>
                  <CalendarPlus /> Calendar
                </Button>
                <Button variant="outline" size="sm" onClick={share}>
                  <Link2 /> Share
                </Button>
              </div>
              {mine && event.isOnline && event.onlineLink && (
                <Button variant="secondary" className="w-full" asChild>
                  <a href={event.onlineLink} target="_blank" rel="noreferrer">
                    Join online
                  </a>
                </Button>
              )}
            </div>
          </div>

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-3 w-full text-destructive hover:text-destructive">
                  <Trash2 /> Delete event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete “{event.title}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the event and all {event.currentParticipants} registrations. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep event</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </aside>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="page py-10" aria-busy="true" aria-label="Loading event">
      <Skeleton className="aspect-[21/9] max-h-[420px] w-full rounded-2xl" />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="mt-8 h-32 w-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
