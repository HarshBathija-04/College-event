import { ArrowRight, BadgeCheck, CalendarPlus, Search, Sparkles, Ticket } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DateStamp, EventCard, EventCardSkeleton, EventGrid } from '@/components/app/EventCard';
import { ErrorState } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/format';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const upcoming = useAsync(() => api.events.list({ isUpcoming: true, limit: 4, sortBy: 'startDate' }), []);
  const picks = useAsync(() => api.ai.recommendations(6).then((r) => r.data.recommendations), [isAuthenticated]);
  const categories = useAsync(() => api.events.categories().then((r) => r.data.categories), []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/events?q=${encodeURIComponent(query.trim())}` : '/events');
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="paper-grid absolute inset-0" aria-hidden="true" />
        <div className="page relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="animate-fade-up">
            <p className="eyebrow inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-highlight" aria-hidden="true" /> Campus events, sorted
            </p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] sm:text-6xl">
              Every campus event,
              <br />
              <span className="text-highlight">one place.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Hackathons, fests, guest lectures and match days from every department. Find what fits your week and grab a seat in one tap.
            </p>
            <form onSubmit={onSearch} role="search" className="mt-8 flex max-w-lg gap-2 rounded-xl border bg-card p-1.5 shadow-card">
              <label htmlFor="hero-search" className="sr-only">
                Search events
              </label>
              <div className="flex flex-1 items-center gap-2 pl-2.5">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  id="hero-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “coding competitions” or “music”"
                  className="h-10 w-full min-w-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {isAuthenticated ? (
                <Button variant="outline" asChild>
                  <Link to="/dashboard">
                    Go to your dashboard <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="highlight" asChild>
                    <Link to="/register">Join with your college email</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/login">Try a demo account</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* This week board */}
          <div className="surface relative p-5 sm:p-6" aria-labelledby="this-week">
            <div className="flex items-center justify-between">
              <h2 id="this-week" className="text-lg font-bold">
                Coming up next
              </h2>
              <Link to="/events" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                See all
              </Link>
            </div>
            <ul className="mt-4 divide-y">
              {upcoming.loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex gap-3 py-3" aria-hidden="true">
                    <div className="h-16 w-14 animate-pulse rounded-lg bg-accent" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-accent" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-accent" />
                    </div>
                  </li>
                ))}
              {upcoming.error && (
                <li className="py-4">
                  <ErrorState message={upcoming.error} onRetry={upcoming.reload} />
                </li>
              )}
              {upcoming.data?.items.map((e) => (
                <li key={e.id}>
                  <Link to={`/events/${e.id}`} className="press -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-accent">
                    <DateStamp iso={e.startDate} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {formatTime(e.startDate)} · {e.isOnline ? 'Online' : e.venue}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {upcoming.data && upcoming.data.items.length === 0 && (
                <li className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled yet. Check back soon.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.data && categories.data.length > 0 && (
        <section className="page pt-12" aria-labelledby="browse">
          <h2 id="browse" className="sr-only">
            Browse by category
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.data.map((c) => (
              <Link
                key={c.id}
                to={`/events?categoryId=${c.id}`}
                className="press inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:border-foreground/25 hover:shadow-xs"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section className="page pt-12" aria-labelledby="picks">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1 inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-highlight" aria-hidden="true" /> {isAuthenticated ? 'Recommended' : 'Trending'}
            </p>
            <h2 id="picks" className="text-2xl font-extrabold sm:text-3xl">
              {isAuthenticated ? `Picked for you, ${user?.firstName}` : 'Popular on campus'}
            </h2>
          </div>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/events">
              Browse all <ArrowRight />
            </Link>
          </Button>
        </div>
        {picks.error ? (
          <ErrorState message={picks.error} onRetry={picks.reload} />
        ) : (
          <EventGrid>
            {picks.loading
              ? Array.from({ length: 3 }).map((_, i) => <EventCardSkeleton key={i} />)
              : picks.data?.slice(0, 6).map((e) => <EventCard key={e.id} event={e} />)}
          </EventGrid>
        )}
      </section>

      {/* How it works */}
      <section className="page pt-20" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-extrabold sm:text-3xl">
          One workflow for the whole campus
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: CalendarPlus,
              who: 'Organizers',
              text: 'Draft a listing in minutes, with an AI writer for the description and tags, then submit it for review.',
            },
            {
              icon: BadgeCheck,
              who: 'Faculty',
              text: 'Approve or send back events from a single queue. Organizers are notified instantly either way.',
            },
            {
              icon: Ticket,
              who: 'Students',
              text: 'Discover events tuned to your interests, register in one tap and add them straight to your calendar.',
            },
          ].map(({ icon: Icon, who, text }, i) => (
            <li key={who} className="surface p-6">
              <div className="flex items-center gap-3">
                <span className="tabular grid size-8 place-items-center rounded-full bg-highlight/10 font-display text-sm font-bold text-highlight">
                  {i + 1}
                </span>
                <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{who}</h3>
              <p className="mt-1 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {!isAuthenticated && (
        <section className="page pt-20">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12">
            <div className="paper-grid absolute inset-0 opacity-20" aria-hidden="true" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-extrabold">Never miss the good stuff again.</h2>
                <p className="mt-2 max-w-xl text-primary-foreground/80">
                  Create a free account, pick your interests and Quad will keep your week full.
                </p>
              </div>
              <Button variant="highlight" size="lg" asChild>
                <Link to="/register">
                  Get started <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
