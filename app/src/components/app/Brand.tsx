import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="7" y="7" width="8" height="8" rx="2" className="fill-primary-foreground" />
      <rect x="17" y="7" width="8" height="8" rx="2" className="fill-primary-foreground" />
      <rect x="7" y="17" width="8" height="8" rx="2" className="fill-primary-foreground" />
      <rect x="17" y="17" width="8" height="8" rx="4" className="fill-highlight" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 rounded-lg', className)} aria-label="Quad home">
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">Quad</span>
    </Link>
  );
}
