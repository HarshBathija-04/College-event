import { CalendarX2, Check, Loader2, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DateStamp } from '@/components/app/EventCard';
import { EmptyState, ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { eventPhase, formatRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Registration } from '@/types';

type Tab = 'upcoming' | 'past' | 'cancelled';

export default function MyRegistrationsPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const regs = useAsync(() => api.registrations.mine().then((r) => r.items), []);

  const groups: Record<Tab, Registration[]> = { upcoming: [], past: [], cancelled: [] };
  for (const r of regs.data ?? []) {
    if (r.status === 'CANCELLED') groups.cancelled.push(r);
    else if (eventPhase(r.event) === 'ended') groups.past.push(r);
    else groups.upcoming.push(r);
  }
  groups.upcoming.sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));
  groups.past.sort((a, b) => b.event.startDate.localeCompare(a.event.startDate));
  const list = groups[tab];

  async function cancel(r: Registration) {
    setCancelling(r.id);
    try {
      await api.registrations.cancel(r.id);
      regs.setData((d) => d?.map((x) => (x.id === r.id ? { ...x, status: 'CANCELLED' } : x)));
      toast('Registration cancelled', { description: r.event.title });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="page py-10">
      <PageHeader eyebrow="My tickets" title="Your registrations" description="Everything you've signed up for, in date order." />

      <div role="tablist" aria-label="Registration filter" className="mb-6 inline-flex rounded-xl border bg-card p-1">
        {(['upcoming', 'past', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'press rounded-lg px-4 py-2 text-sm font-semibold capitalize',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t} <span className="tabular opacity-70">{regs.data ? groups[t].length : ''}</span>
          </button>
        ))}
      </div>

      {regs.error ? (
        <ErrorState message={regs.error} onRetry={regs.reload} />
      ) : regs.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'cancelled' ? CalendarX2 : Ticket}
          title={tab === 'upcoming' ? 'No upcoming tickets' : tab === 'past' ? 'No past events yet' : 'Nothing cancelled'}
          description={tab === 'upcoming' ? 'Find something fun this week and register in one tap.' : undefined}
          action={
            tab === 'upcoming' && (
              <Button asChild>
                <Link to="/events">Browse events</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <DateStamp iso={r.event.startDate} />
              <div className="min-w-0 flex-1">
                <Link to={`/events/${r.event.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {r.event.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatRange(r.event.startDate, r.event.endDate)} · {r.event.isOnline ? 'Online' : r.event.venue}
                </p>
              </div>
              {tab === 'past' && r.attended && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <Check className="size-3.5" aria-hidden="true" /> Attended
                </span>
              )}
              {tab === 'upcoming' && (
                <Button variant="outline" size="sm" onClick={() => cancel(r)} disabled={cancelling === r.id}>
                  {cancelling === r.id && <Loader2 className="animate-spin" />} Cancel
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
