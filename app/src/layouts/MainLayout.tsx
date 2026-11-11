import { Bell, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AssistantWidget } from '@/components/app/AssistantWidget';
import { Logo } from '@/components/app/Brand';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  auth?: boolean;
}

const NAV: NavItem[] = [
  { to: '/events', label: 'Events' },
  { to: '/dashboard', label: 'Dashboard', auth: true },
  { to: '/my-registrations', label: 'My tickets', auth: true },
  { to: '/events/create', label: 'Host an event', roles: ['ORGANIZER', 'FACULTY', 'ADMIN'] },
  { to: '/admin/pending-approvals', label: 'Approvals', roles: ['FACULTY', 'ADMIN'] },
  { to: '/admin', label: 'Admin', roles: ['ADMIN'] },
];

const roleLabel: Record<UserRole, string> = { STUDENT: 'Student', ORGANIZER: 'Organizer', FACULTY: 'Faculty', ADMIN: 'Admin' };

export default function MainLayout() {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const items = NAV.filter((n) => (n.roles ? hasRole(...n.roles) : n.auth ? isAuthenticated : true));

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    api.notifications
      .unreadCount()
      .then(({ data }) => alive && setUnread(data.count))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isAuthenticated, location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'press rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground',
      isActive && 'bg-accent text-foreground',
    );

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="page flex h-16 items-center gap-2">
          <Logo className="mr-4" />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/admin' || n.to === '/events'} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>

            {isAuthenticated && user ? (
              <>
                <Button variant="ghost" size="icon" asChild className="relative">
                  <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
                    <Bell />
                    {unread > 0 && (
                      <span className="tabular absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold leading-4 text-highlight-foreground">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="press ml-1 grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                      aria-label="Account menu"
                    >
                      {initials(user.firstName, user.lastName)}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate font-semibold">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {roleLabel[user.role]} · {user.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate('/profile')}>
                      <UserRound /> Profile & interests
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate('/notifications')}>
                      <Bell /> Notifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={signOut}>
                      <LogOut /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Join Quad</Link>
                </Button>
              </div>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 p-0"
                onClick={(e) => (e.target as HTMLElement).closest('a,button') && setMenuOpen(false)}
              >
                <SheetTitle className="border-b px-5 py-4 font-display text-lg">Menu</SheetTitle>
                <nav aria-label="Mobile" className="flex flex-col gap-1 px-3">
                  {items.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.to === '/admin' || n.to === '/events'} className={linkClass}>
                      {n.label}
                    </NavLink>
                  ))}
                  {isAuthenticated ? (
                    <>
                      <NavLink to="/profile" className={linkClass}>
                        Profile & interests
                      </NavLink>
                      <button
                        onClick={signOut}
                        className="press rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-accent"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <div className="mt-3 grid gap-2 px-1">
                      <Button variant="outline" asChild>
                        <Link to="/login">Sign in</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/register">Join Quad</Link>
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t">
        <div className="page flex flex-col gap-3 pb-24 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:pr-48">
          <p>
            <span className="font-display font-bold text-foreground">Quad</span> · Every campus event, one place.
          </p>
          <p>
            Built by{' '}
            <a
              className="font-semibold text-foreground underline-offset-4 hover:underline"
              href="https://github.com/HarshBathija-04"
              target="_blank"
              rel="noreferrer"
            >
              Harsh Bathija
            </a>
          </p>
        </div>
      </footer>

      <AssistantWidget />
    </div>
  );
}
