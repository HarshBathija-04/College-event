import { CheckCircle2, Inbox, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CategoryTag, DateStamp } from '@/components/app/EventCard';
import { EmptyState, ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { formatRange, relativeTime } from '@/lib/format';
import type { EventItem } from '@/types';

export default function PendingApprovalsPage() {
  const pending = useAsync(() => api.admin.pending().then((r) => r.items), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<EventItem | null>(null);
  const [reason, setReason] = useState('');

  const drop = (id: string) => pending.setData((d) => d?.filter((e) => e.id !== id));

  async function approve(e: EventItem) {
    setBusy(e.id);
    try {
      await api.events.approve(e.id);
      drop(e.id);
      toast.success('Approved and published', { description: e.title });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejecting || reason.trim().length < 3) return;
    setBusy(rejecting.id);
    try {
      await api.events.reject(rejecting.id, reason.trim());
      drop(rejecting.id);
      toast('Sent back to the organizer', { description: rejecting.title });
      setRejecting(null);
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page max-w-4xl py-10">
      <PageHeader
        eyebrow="Review queue"
        title="Pending approvals"
        description="Events submitted by organizers. Approving publishes them instantly; rejecting sends your note back."
      />
      {pending.error ? (
        <ErrorState message={pending.error} onRetry={pending.reload} />
      ) : pending.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !pending.data?.length ? (
        <EmptyState icon={Inbox} title="Queue is empty" description="Nothing is waiting for review. Nice work." />
      ) : (
        <ul className="space-y-4">
          {pending.data.map((e) => (
            <li key={e.id} className="surface p-5">
              <div className="flex gap-4">
                <DateStamp iso={e.startDate} />
                <div className="min-w-0 flex-1">
                  <CategoryTag event={e} />
                  <h2 className="mt-1 text-lg font-bold">
                    <Link to={`/events/${e.id}`} className="underline-offset-4 hover:underline">
                      {e.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatRange(e.startDate, e.endDate)} · {e.isOnline ? 'Online' : e.venue}
                    {e.maxParticipants ? ` · ${e.maxParticipants} seats` : ''}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm">{e.description}</p>
                  {e.organizer && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted by {e.organizer.firstName} {e.organizer.lastName}
                      {e.organizer.department ? ` (${e.organizer.department})` : ''}
                      {e.createdAt ? ` · ${relativeTime(e.createdAt)}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setRejecting(e)} disabled={busy === e.id}>
                  <XCircle /> Request changes
                </Button>
                <Button onClick={() => approve(e)} disabled={busy === e.id}>
                  {busy === e.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>Tell the organizer what to fix in “{rejecting?.title}”. They will see this note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reviewer note</Label>
            <Textarea
              id="reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Please move to an indoor venue and finish by 10 PM."
              className="min-h-28"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={reason.trim().length < 3 || busy === rejecting?.id}>
              {busy === rejecting?.id && <Loader2 className="animate-spin" />} Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
