import { CalendarSearch, Loader2, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EventCard, EventCardSkeleton, EventGrid } from '@/components/app/EventCard';
import { EmptyState, ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api, errorMessage } from '@/lib/api';
import { EVENT_TYPES } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventItem, EventType } from '@/types';

const PAGE_SIZE = 12;

export default function EventsPage() {
  const { hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const type = (params.get('type') ?? '') as EventType | '';
  const [draft, setDraft] = useState(q);
  const [extra, setExtra] = useState<EventItem[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  useEffect(() => setDraft(q), [q]);

  const categories = useAsync(() => api.events.categories().then((r) => r.data.categories), []);
  const results = useAsync(async () => {
    setExtra([]);
    setPage(1);
    if (q) {
      const { data } = await api.ai.search(q);
      const items = data.results.filter((e) => (!categoryId || e.categoryId === categoryId) && (!type || e.type === type));
      return { items, hasNext: false, total: items.length, smart: true };
    }
    const res = await api.events.list({ isUpcoming: true, limit: PAGE_SIZE, categoryId, type: type || undefined });
    return { items: res.items, hasNext: res.meta.hasNext, total: res.meta.total, smart: false };
  }, [q, categoryId, type]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update('q', draft.trim());
  };

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const res = await api.events.list({ isUpcoming: true, limit: PAGE_SIZE, page: page + 1, categoryId, type: type || undefined });
      setExtra((x) => [...x, ...res.items]);
      setPage((p) => p + 1);
      results.setData((d) => d && { ...d, hasNext: res.meta.hasNext });
    } catch (e) {
      setMoreError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const items = [...(results.data?.items ?? []), ...extra];
  const filtersActive = !!(q || categoryId || type);

  return (
    <div className="page py-10">
      <PageHeader
        eyebrow="Discover"
        title="Upcoming events"
        description="Everything happening across campus. Search in plain English: Quad understands synonyms like “contest” for competition."
        actions={
          hasRole('ORGANIZER', 'FACULTY', 'ADMIN') && (
            <Button asChild>
              <Link to="/events/create">Host an event</Link>
            </Button>
          )
        }
      />

      <div className="surface sticky top-[4.5rem] z-30 mb-8 space-y-3 p-3 sm:p-4">
        <form onSubmit={onSearch} role="search" className="flex gap-2">
          <label htmlFor="event-search" className="sr-only">
            Search events
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="event-search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Try “robotics contest”"
              maxLength={200}
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-base placeholder:text-muted-foreground sm:text-sm"
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  update('q', '');
                }}
                className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
            role="group"
            aria-label="Filter by category"
          >
            <Chip active={!categoryId} onClick={() => update('categoryId', '')}>
              All
            </Chip>
            {categories.data?.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => update('categoryId', categoryId === c.id ? '' : c.id)}>
                <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                {c.name}
              </Chip>
            ))}
          </div>
          <label htmlFor="type-filter" className="sr-only">
            Event type
          </label>
          <select
            id="type-filter"
            value={type}
            onChange={(e) => update('type', e.target.value)}
            className="mb-1 h-9 cursor-pointer rounded-full border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <option value="">Any format</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {results.data && !results.loading && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {results.data.smart && <Sparkles className="mr-1 inline size-3.5 text-highlight" aria-hidden="true" />}
          <span className="tabular">{results.data.total}</span> {results.data.total === 1 ? 'event' : 'events'}
          {q && <> matching “{q}”</>}
        </p>
      )}

      {results.error ? (
        <ErrorState message={results.error} onRetry={results.reload} />
      ) : results.loading ? (
        <EventGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </EventGrid>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title={filtersActive ? 'No events match those filters' : 'No upcoming events yet'}
          description={
            filtersActive ? 'Try a broader search or clear the filters.' : 'New events appear here as soon as they are approved.'
          }
          action={
            filtersActive && (
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <EventGrid>
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </EventGrid>
          {results.data?.hasNext && (
            <div className="mt-10 flex flex-col items-center gap-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="animate-spin" />} Load more events
              </Button>
              {moreError && <p className="text-sm text-destructive">{moreError}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}
