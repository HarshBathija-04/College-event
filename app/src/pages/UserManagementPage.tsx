import { Search, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, PageHeader } from '@/components/app/States';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { api, errorMessage } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AdminUser, UserRole, UserStatus } from '@/types';

const ROLES: UserRole[] = ['STUDENT', 'ORGANIZER', 'FACULTY', 'ADMIN'];
const label = (s: string) => s[0] + s.slice(1).toLowerCase();

export default function UserManagementPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const users = useAsync(() => api.admin.users({ search: debounced, role, page }), [debounced, role, page]);
  const patch = (id: string, changes: Partial<AdminUser>) =>
    users.setData((d) => d && { ...d, items: d.items.map((u) => (u.id === id ? { ...u, ...changes } : u)) });

  async function changeRole(u: AdminUser, next: UserRole) {
    const prev = u.role;
    patch(u.id, { role: next });
    try {
      await api.admin.setRole(u.id, next);
      toast.success(`${u.firstName} is now ${label(next).toLowerCase()}`);
    } catch (e) {
      patch(u.id, { role: prev });
      toast.error(errorMessage(e));
    }
  }

  async function toggleSuspend(u: AdminUser) {
    const next: UserStatus = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    patch(u.id, { status: next });
    try {
      await api.admin.setStatus(u.id, next);
      toast.success(next === 'SUSPENDED' ? `${u.firstName} suspended` : `${u.firstName} reactivated`);
    } catch (e) {
      patch(u.id, { status: u.status });
      toast.error(errorMessage(e));
    }
  }

  const meta = users.data?.meta;

  return (
    <div className="page py-10">
      <PageHeader eyebrow="Admin" title="Users" description="Change roles, suspend accounts and see who is active." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="user-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-base sm:text-sm"
          />
        </div>
        <label htmlFor="role-filter" className="sr-only">
          Filter by role
        </label>
        <select
          id="role-filter"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole | '');
            setPage(1);
          }}
          className="h-10 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </select>
      </div>

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : users.loading && !users.data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : !users.data?.items.length ? (
        <EmptyState icon={UsersRound} title="No users found" description="Try a different name or role." />
      ) : (
        <div className={cn('surface overflow-x-auto', users.loading && 'opacity-60')}>
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Users</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Member
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Activity
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Access
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.data.items.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className={cn(u.status === 'SUSPENDED' && 'bg-destructive/5')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(u.firstName, u.lastName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {u.firstName} {u.lastName} {self && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label htmlFor={`role-${u.id}`} className="sr-only">
                        Role for {u.firstName}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={self}
                        onChange={(e) => changeRole(u, e.target.value as UserRole)}
                        className="h-9 rounded-lg border bg-background px-2 text-sm disabled:opacity-60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {label(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="tabular px-4 py-3 text-muted-foreground">
                      {u._count.registrations} tickets · {u._count.organizedEvents} hosted
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.status === 'SUSPENDED' ? 'outline' : 'ghost'}
                        disabled={self}
                        onClick={() => toggleSuspend(u)}
                        className={cn(u.status !== 'SUSPENDED' && 'text-destructive hover:text-destructive')}
                      >
                        {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <span className="tabular text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} users
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
