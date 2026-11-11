import { ArrowUp, Bot, CalendarDays, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = ['What is happening this weekend?', 'Any coding events coming up?', 'Something relaxing before exams?'];

/** Floating "Ask Quad" concierge, backed by the Groq-powered /ai/assistant endpoint. */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages;
    setMessages([...history, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const { data } = await api.ai.assistant(message, history);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, events: data.events }]);
    } catch (e) {
      const text =
        e instanceof ApiError && e.status === 429
          ? 'I am getting a lot of questions right now. Give me a minute and try again.'
          : e instanceof ApiError && e.code === 'AI_UNAVAILABLE'
            ? 'The assistant is switched off on this deployment, but you can still browse every event on the Events page.'
            : 'I could not reach the assistant just now. Please try again in a moment.';
      setMessages((m) => [...m, { role: 'assistant', content: text }]);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-5 right-4 z-50 rounded-full shadow-lift sm:right-6"
          aria-haspopup="dialog"
        >
          <Sparkles /> Ask Quad
        </Button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="Ask Quad, the campus events assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(620px,85dvh)] animate-fade-up flex-col overflow-hidden rounded-t-2xl border bg-popover text-popover-foreground shadow-lift sm:inset-x-auto sm:bottom-5 sm:right-6 sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center gap-3 border-b px-4 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Bot className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">Ask Quad</h2>
              <p className="text-xs text-muted-foreground">Answers come from this week's real listings</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X />
            </Button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Hi! Tell me what you are into and I will find events that fit your week.</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="press rounded-full border bg-card px-3 py-1.5 text-left text-sm hover:border-primary/40 hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.role === 'user' && 'items-end')}>
                <p
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
                    m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary',
                  )}
                >
                  {m.content}
                </p>
                {m.events?.map((e) => (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    onClick={() => setOpen(false)}
                    className="press flex w-[85%] items-center gap-3 rounded-xl border bg-card p-2.5 text-sm hover:border-primary/40"
                  >
                    <CalendarDays className="size-4 shrink-0 text-highlight" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(e.startDate)} · {formatTime(e.startDate)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
            {busy && (
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3 w-fit" aria-label="Assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-3">
            <label htmlFor="assistant-input" className="sr-only">
              Ask about campus events
            </label>
            <input
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask about events…"
              className="h-10 min-w-0 flex-1 rounded-full border bg-card px-4 text-sm placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" className="rounded-full" disabled={!input.trim() || busy} aria-label="Send">
              <ArrowUp />
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
