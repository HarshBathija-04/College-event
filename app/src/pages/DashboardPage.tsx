import { Bell, CalendarCheck, CalendarClock, CheckCircle2, ClipboardList, Hourglass, Plus, Sparkles, Ticket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateStamp, EventCard, EventCardSkeleton, EventGrid, StatusPill } from '@/components/app/EventCard';
import { EmptyState, ErrorState, PageHeader, StatCard } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="page py-10">
      <PageHeader eyebrow="Dashboard" title={`${greeting}, ${user?.firstName}`} />
      {hasRole('ORGANIZER', 'FACULTY', 'ADMIN') && <OrganizerPanel />}
      <StudentPanel />
    </div>
  );
}

function StudentPanel() {
  const dash = useAsync(() => api.dashboard.student().then((r) => r.data), []);
  const picks = useAsync(() => api.ai.recommendations(3).then((r) => r.data.recommendations), []);

  return (
    <>
      <section aria-label="Your stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dash.loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : dash.data && (
              <>
                <StatCard
                  label="Upcoming"
                  value={dash.data.stats.upcomingRegistrations}
                  icon={CalendarClock}
                  hint="events you're going to"
                />
                <StatCard label="Registered" value={dash.data.stats.totalRegistrations} icon={Ticket} hint="all time" />
                <StatCard label="Attended" value={dash.data.stats.attendedEvents} icon={CheckCircle2} hint="checked in by organizers" />
                <StatCard label="Unread" value={dash.data.stats.unreadNotifications} icon={Bell} hint="notifications" />
              </>
            )}
      </section>
      {dash.error && <ErrorState className="mt-4" message={dash.error} onRetry={dash.reload} />}

      <section className="mt-12" aria-labelledby="next-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="next-up" className="text-xl font-bold">
            Your next events
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-registrations">All tickets</Link>
          </Button>
        </div>
        {dash.loading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : dash.data?.upcomingEvents.length ? (
          <ul className="surface divide-y">
            {dash.data.upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link to={`/events/${e.id}`} className="press flex items-center gap-4 p-4 hover:bg-accent/60">
                  <DateStamp iso={e.startDate} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatDate(e.startDate)} · {formatTime(e.startDate)} · {e.isOnline ? 'Online' : e.venue}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !dash.error && (
            <EmptyState
              icon={CalendarCheck}
              title="No upcoming events yet"
              description="When you register for something it shows up here."
              action={
                <Button asChild>
                  <Link to="/events">Find an event</Link>
                </Button>
              }
            />
          )
        )}
      </section>

      <section className="mt-12" aria-labelledby="for-you">
        <h2 id="for-you" className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Sparkles className="size-5 text-highlight" aria-hidden="true" /> Recommended for you
        </h2>
        {picks.error ? (
          <ErrorState message={picks.error} onRetry={picks.reload} />
        ) : picks.loading ? (
          <EventGrid>
            {Array.from({ length: 3 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </EventGrid>
        ) : picks.data?.length ? (
          <EventGrid>
            {picks.data.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </EventGrid>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="You're all caught up"
            description="You've registered for everything we'd recommend. Add more interests to widen your picks."
            action={
              <Button variant="outline" asChild>
                <Link to="/profile">Edit interests</Link>
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}

function OrganizerPanel() {
  const dash = useAsync(() => api.dashboard.organizer().then((r) => r.data), []);
  return (
    <section aria-labelledby="hosting" className="mb-14">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="hosting" className="text-xl font-bold">
          Your hosted events
        </h2>
        <Button asChild>
          <Link to="/events/create">
            <Plus /> New event
          </Link>
        </Button>
      </div>
      {dash.error && <ErrorState message={dash.error} onRetry={dash.reload} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dash.loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : dash.data && (
              <>
                <StatCard label="Events" value={dash.data.stats.totalEvents} icon={ClipboardList} />
                <StatCard label="Awaiting approval" value={dash.data.stats.pendingEvents} icon={Hourglass} />
                <StatCard label="Registrations" value={dash.data.stats.totalRegistrations} icon={Users} />
                <StatCard label="Attendance rate" value={`${dash.data.stats.attendanceRate}%`} icon={CheckCircle2} />
              </>
            )}
      </div>
      {dash.data && dash.data.recentEvents.length > 0 && (
        <div className="surface mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Recently created events</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Event
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Going
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dash.data.recentEvents.map((e) => (
                <tr key={e.id} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">
                    <Link to={`/events/${e.id}`} className="underline-offset-4 hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(e.startDate)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="tabular px-4 py-3 text-right">{e.currentParticipants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dash.data && dash.data.recentEvents.length === 0 && (
        <EmptyState
          className="mt-4"
          icon={ClipboardList}
          title="You haven't hosted anything yet"
          description="Create your first event; faculty will review it before it goes live."
        />
      )}
    </section>
  );
}
