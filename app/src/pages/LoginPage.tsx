import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/api';

// Public demo accounts created by the backend seed (see README).
const DEMO_PASSWORD = 'Demo@1234';
const DEMOS = [
  { label: 'Student', email: 'student@example.edu' },
  { label: 'Organizer', email: 'organizer@example.edu' },
  { label: 'Faculty', email: 'faculty@example.edu' },
  { label: 'Admin', email: 'admin@example.edu' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: string, p: string, key: string) {
    setBusy(key);
    setError(null);
    try {
      const user = await login(e, p);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void signIn(email, password, 'form');
  };

  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Sign in to see your tickets and picks.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">College email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={!!busy || !email || !password}>
          {busy === 'form' && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>

      <div className="mt-8 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Explore with a demo account</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Each role sees a different side of Quad.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMOS.map((d) => (
            <Button
              key={d.label}
              variant="outline"
              size="sm"
              disabled={!!busy}
              onClick={() => void signIn(d.email, DEMO_PASSWORD, d.label)}
            >
              {busy === d.label && <Loader2 className="animate-spin" />} {d.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
