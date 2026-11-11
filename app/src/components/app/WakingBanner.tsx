import { Loader2 } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { serverWaking } from '@/lib/api';

/**
 * Shown while any API call has been pending for more than a few seconds.
 * The free Render tier sleeps after 15 idle minutes; the first request can take 30-60s.
 */
export function WakingBanner() {
  const waking = useSyncExternalStore(serverWaking.subscribe, serverWaking.get, () => false);
  if (!waking) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex w-[calc(100%-2rem)] max-w-md animate-fade-up items-start gap-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lift"
    >
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-highlight" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold">Waking up the server…</p>
        <p className="text-muted-foreground">
          The demo runs on free hosting that naps when idle. The first load can take up to a minute; thanks for waiting.
        </p>
      </div>
    </div>
  );
}
