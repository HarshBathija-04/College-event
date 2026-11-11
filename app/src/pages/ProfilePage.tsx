import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const me = useAsync(() => api.auth.me().then((r) => r.data.user), []);
  const categories = useAsync(() => api.events.categories().then((r) => r.data.categories), []);
  const [form, setForm] = useState({ firstName: '', lastName: '', department: '', phone: '', year: '' });
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    const u = me.data;
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department ?? '',
      phone: u.phone ?? '',
      year: u.year ? String(u.year) : '',
    });
    setInterests(new Set(u.interests.map((i) => i.category.id)));
  }, [me.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.users.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        department: form.department.trim() || undefined,
        phone: form.phone.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
      });
      updateUser(data.user);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string) {
    const on = interests.has(id);
    setToggling(id);
    try {
      if (on) await api.users.removeInterest(id);
      else await api.users.addInterest(id);
      setInterests((s) => {
        const next = new Set(s);
        if (on) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(null);
    }
  }

  if (me.error)
    return (
      <div className="page py-10">
        <ErrorState message={me.error} onRetry={me.reload} />
      </div>
    );

  return (
    <div className="page max-w-3xl py-10">
      <PageHeader eyebrow="Account" title="Profile & interests" description={me.data?.email} />

      <section aria-labelledby="interests" className="surface p-6">
        <h2 id="interests" className="text-lg font-bold">
          What are you into?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick categories to tune your recommendations and the assistant's suggestions.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.loading || me.loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)
            : categories.data?.map((c) => {
                const on = interests.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    disabled={toggling === c.id}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      'press inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold disabled:opacity-60',
                      on ? 'border-2' : 'bg-card hover:bg-accent',
                    )}
                    style={on ? { borderColor: c.color, backgroundColor: `${c.color}1f` } : undefined}
                  >
                    {toggling === c.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : on ? (
                      <Check className="size-4" style={{ color: c.color }} aria-hidden="true" />
                    ) : (
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                    )}
                    {c.name}
                  </button>
                );
              })}
        </div>
      </section>

      <form onSubmit={save} className="surface mt-6 space-y-4 p-6" aria-labelledby="details">
        <h2 id="details" className="text-lg font-bold">
          Your details
        </h2>
        {me.loading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="First name"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
                required
                minLength={2}
              />
              <Field
                id="lastName"
                label="Last name"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
                required
                minLength={2}
              />
              <Field id="department" label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
              <Field id="phone" label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              {me.data?.role === 'STUDENT' && (
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year of study</Label>
                  <select
                    id="year"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="h-10 w-full rounded-lg border bg-card px-3 text-sm"
                  >
                    <option value="">Not set</option>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Save changes
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  ...rest
}: { id: string; label: string; value: string; onChange: (v: string) => void } & Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value'
>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
