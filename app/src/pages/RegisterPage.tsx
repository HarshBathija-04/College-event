import { GraduationCap, Loader2, Megaphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

type Role = 'STUDENT' | 'ORGANIZER';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', department: '' });
  const [role, setRole] = useState<Role>('STUDENT');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const next: Record<string, string> = {};
    if (form.firstName.trim().length < 2) next.firstName = 'Enter at least 2 characters';
    if (form.lastName.trim().length < 2) next.lastName = 'Enter at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      next.password = 'Use 8+ characters with at least one letter and one number';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await register({ ...form, department: form.department || undefined, role });
      toast.success(`Welcome to Quad, ${user.firstName}!`, { description: 'Add a few interests to get better picks.' });
      navigate('/profile');
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setErrors(Object.fromEntries(err.details.filter((d) => d.field).map((d) => [d.field!, d.message])));
      } else {
        setErrors({ form: errorMessage(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof form, label: string, props: React.ComponentProps<'input'> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        value={form[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${k}-err` : undefined}
        {...props}
      />
      {errors[k] && (
        <p id={`${k}-err`} className="text-xs font-medium text-destructive">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-extrabold">Join Quad</h1>
      <p className="mt-2 text-muted-foreground">It takes 30 seconds. No spam, just events.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am joining as</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(
              [
                { value: 'STUDENT', label: 'Student', hint: 'Discover & attend', icon: GraduationCap },
                { value: 'ORGANIZER', label: 'Organizer', hint: 'Host events', icon: Megaphone },
              ] as const
            ).map(({ value, label, hint, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  'press flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  role === value && 'border-primary bg-primary/5 ring-1 ring-primary',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="sr-only"
                />
                <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', 'First name', { autoComplete: 'given-name' })}
          {field('lastName', 'Last name', { autoComplete: 'family-name' })}
        </div>
        {field('email', 'College email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        {field('department', 'Department (optional)', { placeholder: 'e.g. Computer Science' })}
        {errors.form && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
