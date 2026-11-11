import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError, errorMessage } from '@/lib/api';
import { EVENT_TYPES, toLocalInput, typeLabel } from '@/lib/format';
import type { EventType } from '@/types';

const inAWeek = () => {
  const d = new Date(Date.now() + 7 * 86400000);
  d.setHours(17, 0, 0, 0);
  return d;
};

export default function CreateEventPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const categories = useAsync(() => api.events.categories().then((r) => r.data.categories), []);
  const defaults = useMemo(() => {
    const start = inAWeek();
    return { start: toLocalInput(start), end: toLocalInput(new Date(start.getTime() + 2 * 3600000)) };
  }, []);

  const [f, setF] = useState({
    title: '',
    type: 'WORKSHOP' as EventType,
    categoryId: '',
    startDate: defaults.start,
    endDate: defaults.end,
    registrationDeadline: '',
    venue: '',
    isOnline: false,
    onlineLink: '',
    maxParticipants: '',
    bannerImage: '',
    notes: '',
    shortDescription: '',
    description: '',
    tags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [suggestedType, setSuggestedType] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const autoApproved = hasRole('FACULTY', 'ADMIN');

  async function draftWithAi() {
    if (f.title.trim().length < 3) {
      setErrors({ title: 'Add a title first so the assistant knows what to write about' });
      return;
    }
    setDrafting(true);
    try {
      const { data } = await api.ai.describe({
        title: f.title.trim(),
        type: f.type,
        notes: f.notes,
        venue: f.isOnline ? 'Online' : f.venue,
      });
      setF((s) => ({
        ...s,
        description: data.description,
        shortDescription: data.shortDescription || s.shortDescription,
        tags: data.tags.join(', ') || s.tags,
      }));
      toast.success('Draft ready', { description: 'Review and edit it before submitting.' });
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.code === 'AI_UNAVAILABLE' ? 'The AI writer is not enabled on this deployment.' : errorMessage(e),
      );
    } finally {
      setDrafting(false);
    }
  }

  async function suggestType() {
    if (f.title.length < 3 || f.description.length < 10) return;
    try {
      const { data } = await api.ai.predictType(f.title, f.description);
      setSuggestedType(data.confidence > 0.3 && data.predicted_category !== f.type ? data.predicted_category : null);
    } catch {
      /* suggestion is optional */
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 3) e.title = 'Title needs at least 3 characters';
    if (!f.categoryId) e.categoryId = 'Pick a category';
    if (f.description.trim().length < 10) e.description = 'Describe the event in at least 10 characters';
    if (!f.isOnline && !f.venue.trim()) e.venue = 'Where is it happening?';
    if (f.isOnline && f.onlineLink && !/^https?:\/\//.test(f.onlineLink)) e.onlineLink = 'Use a full link starting with https://';
    if (f.bannerImage && !/^https:\/\//.test(f.bannerImage)) e.bannerImage = 'Banner must be an https:// image URL';
    if (new Date(f.endDate) <= new Date(f.startDate)) e.endDate = 'End must be after the start';
    if (new Date(f.startDate) < new Date()) e.startDate = 'Start must be in the future';
    if (f.registrationDeadline && new Date(f.registrationDeadline) > new Date(f.startDate))
      e.registrationDeadline = 'Deadline must be before the start';
    if (f.maxParticipants && (!Number.isInteger(Number(f.maxParticipants)) || Number(f.maxParticipants) < 1))
      e.maxParticipants = 'Use a whole number above 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.events.create({
        title: f.title.trim(),
        type: f.type,
        categoryId: f.categoryId,
        description: f.description.trim(),
        shortDescription: f.shortDescription.trim() || undefined,
        startDate: new Date(f.startDate).toISOString(),
        endDate: new Date(f.endDate).toISOString(),
        registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline).toISOString() : undefined,
        venue: f.isOnline ? 'Online' : f.venue.trim(),
        isOnline: f.isOnline,
        onlineLink: f.isOnline && f.onlineLink ? f.onlineLink : undefined,
        bannerImage: f.bannerImage || undefined,
        maxParticipants: f.maxParticipants ? Number(f.maxParticipants) : null,
        tags: f.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10),
      });
      toast.success(autoApproved ? 'Event published' : 'Submitted for approval', {
        description: autoApproved ? 'It is live on the events page.' : 'Faculty will review it; you will get a notification.',
      });
      navigate(`/events/${data.event.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.details?.length)
        setErrors(Object.fromEntries(e.details.filter((d) => d.field).map((d) => [d.field!, d.message])));
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-err`} className="text-xs font-medium text-destructive">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined });

  return (
    <div className="page max-w-3xl py-10">
      <PageHeader
        eyebrow="Host"
        title="Create an event"
        description={
          autoApproved
            ? 'As faculty/admin your event is published immediately.'
            : 'Your event goes to faculty for a quick review before it is published.'
        }
      />
      <form onSubmit={submit} noValidate className="space-y-6">
        <section className="surface space-y-4 p-6" aria-labelledby="basics">
          <h2 id="basics" className="text-lg font-bold">
            The basics
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={f.title}
              maxLength={200}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Intro to Arduino"
              {...aria('title')}
            />
            {err('title')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Format</Label>
              <select
                id="type"
                value={f.type}
                onChange={(e) => set('type', e.target.value as EventType)}
                className="h-10 w-full rounded-lg border bg-card px-3 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {suggestedType && (
                <button
                  type="button"
                  onClick={() => (set('type', suggestedType), setSuggestedType(null))}
                  className="flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <Sparkles className="size-3" aria-hidden="true" /> Looks like a {typeLabel(suggestedType)}. Use that?
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                value={f.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="h-10 w-full rounded-lg border bg-card px-3 text-sm"
                {...aria('categoryId')}
              >
                <option value="">{categories.loading ? 'Loading…' : 'Choose a category'}</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {err('categoryId')}
            </div>
          </div>
        </section>

        <section className="surface space-y-4 p-6" aria-labelledby="desc">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="desc" className="text-lg font-bold">
                Description
              </h2>
              <p className="text-sm text-muted-foreground">Jot a few notes and let the AI writer draft it, or write your own.</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed bg-muted/50 p-4">
            <Label htmlFor="notes" className="flex items-center gap-1.5">
              <Wand2 className="size-4 text-highlight" aria-hidden="true" /> Notes for the AI writer
            </Label>
            <Textarea
              id="notes"
              value={f.notes}
              maxLength={2000}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="2 hours, kits provided, beginners welcome, bring a laptop…"
              className="mt-2 min-h-20"
            />
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={draftWithAi} disabled={drafting}>
              {drafting ? <Loader2 className="animate-spin" /> : <Sparkles />} {drafting ? 'Writing…' : 'Draft with AI'}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Tagline</Label>
            <Input
              id="shortDescription"
              value={f.shortDescription}
              maxLength={255}
              onChange={(e) => set('shortDescription', e.target.value)}
              placeholder="One line that sells it"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Full description</Label>
            <Textarea
              id="description"
              value={f.description}
              maxLength={10000}
              onChange={(e) => set('description', e.target.value)}
              onBlur={suggestType}
              className="min-h-40"
              {...aria('description')}
            />
            {err('description')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={f.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="robotics, beginners, hardware"
              aria-describedby="tags-hint"
            />
            <p id="tags-hint" className="text-xs text-muted-foreground">
              Comma separated, up to 10. Tags improve search.
            </p>
          </div>
        </section>

        <section className="surface space-y-4 p-6" aria-labelledby="when">
          <h2 id="when" className="text-lg font-bold">
            When & where
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Starts</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={f.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                {...aria('startDate')}
              />
              {err('startDate')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Ends</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={f.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                {...aria('endDate')}
              />
              {err('endDate')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registrationDeadline">Registration deadline (optional)</Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                value={f.registrationDeadline}
                onChange={(e) => set('registrationDeadline', e.target.value)}
                {...aria('registrationDeadline')}
              />
              {err('registrationDeadline')}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxParticipants">Capacity (optional)</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                inputMode="numeric"
                value={f.maxParticipants}
                onChange={(e) => set('maxParticipants', e.target.value)}
                placeholder="Unlimited"
                {...aria('maxParticipants')}
              />
              {err('maxParticipants')}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="isOnline" className="cursor-pointer">
              This is an online event
            </Label>
            <Switch id="isOnline" checked={f.isOnline} onCheckedChange={(v) => set('isOnline', v)} />
          </div>
          {f.isOnline ? (
            <div className="space-y-1.5">
              <Label htmlFor="onlineLink">Meeting link</Label>
              <Input
                id="onlineLink"
                type="url"
                value={f.onlineLink}
                onChange={(e) => set('onlineLink', e.target.value)}
                placeholder="https://"
                {...aria('onlineLink')}
              />
              <p className="text-xs text-muted-foreground">Only shown to registered attendees.</p>
              {err('onlineLink')}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={f.venue}
                maxLength={200}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="e.g. Lab 3, IT Building"
                {...aria('venue')}
              />
              {err('venue')}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bannerImage">Banner image URL (optional)</Label>
            <Input
              id="bannerImage"
              type="url"
              value={f.bannerImage}
              onChange={(e) => set('bannerImage', e.target.value)}
              placeholder="https://images.unsplash.com/…"
              {...aria('bannerImage')}
            />
            {err('bannerImage')}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} {autoApproved ? 'Publish event' : 'Submit for approval'}
          </Button>
        </div>
      </form>
    </div>
  );
}
