import { CalendarDays, ClipboardCheck, Radio, Ticket, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, PageHeader, StatCard } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Published',
  PENDING_APPROVAL: 'Awaiting approval',
  REJECTED: 'Changes requested',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  ONGOING: 'Ongoing',
};

export default function AdminDashboardPage() {
  const stats = useAsync(() => api.admin.stats().then((r) => r.data), []);
  const s = stats.data;
  const pending = s?.events.byStatus.find((b) => b.status === 'PENDING_APPROVAL')?.count ?? 0;

  return (
    <div className="page py-10">
      <PageHeader
        eyebrow="Admin"
        title="Campus overview"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/users">
                <UserCog /> Manage users
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/pending-approvals">
                <ClipboardCheck /> Review queue{pending ? ` (${pending})` : ''}
              </Link>
            </Button>
          </>
        }
      />
      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : s && (
              <>
                <StatCard label="Members" value={s.users.total} icon={Users} />
                <StatCard label="Upcoming events" value={s.events.upcoming} icon={CalendarDays} hint={`${s.events.total} total`} />
                <StatCard label="Live right now" value={s.events.ongoing} icon={Radio} />
                <StatCard
                  label="Registrations"
                  value={s.registrations.total}
                  icon={Ticket}
                  hint={`${s.registrations.last30Days} in the last 30 days`}
                />
              </>
            )}
      </div>

      {s && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <BarList title="Events by category" rows={s.events.byCategory.map((c) => ({ label: c.category, value: c.count }))} />
          <BarList
            title="Events by status"
            rows={s.events.byStatus.map((c) => ({ label: STATUS_LABEL[c.status] ?? c.status, value: c.count }))}
          />
          <BarList
            title="Members by role"
            rows={s.users.byRole.map((r) => ({ label: r.role[0] + r.role.slice(1).toLowerCase(), value: r.count }))}
          />
        </div>
      )}
    </div>
  );
}

/** Lightweight horizontal bar chart: accessible as a plain list, no chart library needed. */
function BarList({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  return (
    <section className="surface p-5" aria-label={title}>
      <h2 className="text-base font-bold">{title}</h2>
      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="tabular font-semibold">{r.value}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
