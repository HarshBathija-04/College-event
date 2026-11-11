import { BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const list = useAsync(() => api.notifications.list().then((r) => r.items), []);
  const unread = list.data?.filter((n) => !n.isRead).length ?? 0;

  const patch = (fn: (n: Notification[]) => Notification[]) => list.setData((d) => (d ? fn(d) : d));

  async function markAll() {
    try {
      await api.notifications.markAllRead();
      patch((d) => d.map((n) => ({ ...n, isRead: true })));
      toast.success('All caught up');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function open(n: Notification) {
    if (n.isRead) return;
    patch((d) => d.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    api.notifications.markRead(n.id).catch(() => undefined);
  }

  async function remove(n: Notification) {
    const before = list.data;
    patch((d) => d.filter((x) => x.id !== n.id));
    try {
      await api.notifications.remove(n.id);
    } catch (e) {
      list.setData(before);
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="page max-w-3xl py-10">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !list.data?.length ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="Registration confirmations, reminders and approval updates land here."
        />
      ) : (
        <ul className="surface divide-y">
          {list.data.map((n) => {
            const body = (
              <>
                <p className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{relativeTime(n.createdAt)}</p>
              </>
            );
            return (
              <li key={n.id} className={cn('flex items-start gap-3 p-4', !n.isRead && 'bg-primary/[0.04]')}>
                <span
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-highlight')}
                  aria-hidden="true"
                />
                {n.actionLink?.startsWith('/') ? (
                  <Link to={n.actionLink} onClick={() => open(n)} className="min-w-0 flex-1 rounded-md">
                    {body}
                  </Link>
                ) : (
                  <button onClick={() => open(n)} className="min-w-0 flex-1 rounded-md text-left">
                    {body}
                  </button>
                )}
                {!n.isRead && <span className="sr-only">Unread</span>}
                <Button variant="ghost" size="icon-sm" onClick={() => remove(n)} aria-label={`Delete notification: ${n.title}`}>
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
