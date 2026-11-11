import { CalendarCheck, Sparkles, Users } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/app/Brand';

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <div className="paper-grid absolute inset-0 opacity-20" aria-hidden="true" />
        <Logo className="relative" />
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-4xl font-extrabold leading-tight">The noticeboard your campus actually checks.</p>
          <ul className="mt-8 space-y-4 text-primary-foreground/85">
            <li className="flex gap-3">
              <CalendarCheck className="size-5 shrink-0" aria-hidden="true" /> Register for hackathons, fests and talks in one tap.
            </li>
            <li className="flex gap-3">
              <Sparkles className="size-5 shrink-0" aria-hidden="true" /> Picks tuned to your interests, plus an AI concierge.
            </li>
            <li className="flex gap-3">
              <Users className="size-5 shrink-0" aria-hidden="true" /> Organizers submit, faculty approve, everyone sees it live.
            </li>
          </ul>
        </div>
      </aside>
      <main id="main" className="flex flex-col px-4 py-8 sm:px-8">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col py-10 sm:justify-center">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
