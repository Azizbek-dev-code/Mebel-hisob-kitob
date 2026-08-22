import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { initialsOf } from '@/utils/format';
import { roleLabel } from '@/utils/roles';

import { SignOutButton } from './SignOutButton';

/** Who is signed in, and the way out. Reads the session from the Phase 2 auth query. */
export function UserMenu() {
  const { data: user } = useCurrentUser();
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 rounded-input py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-hover"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initialsOf(user.fullName)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-medium text-ink">{user.fullName}</span>
          <span className="block truncate text-xs text-ink-muted">{roleLabel(user.role)}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-ink-subtle transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-2 w-60 rounded-card border border-line bg-surface p-1.5 shadow-overlay"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.username ?? user.email}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {roleLabel(user.role)} · {user.storeName}
            </p>
          </div>

          <div className="my-1 h-px bg-line" />

          <Link
            role="menuitem"
            to={ROUTES.profile}
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-input px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-hover hover:text-ink"
          >
            Profile
          </Link>

          <SignOutButton
            className="text-ink-soft hover:bg-surface-hover hover:text-ink"
            onSignedOut={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
