import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="page flex flex-col items-center py-24 text-center">
      <p className="font-display text-7xl font-extrabold text-highlight">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">This page skipped class</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The link may be broken or the page may have moved.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/events">Browse events</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
