import { Loader2, LogOut } from 'lucide-react';

import { initialsOf } from '@/utils/format';
import { roleLabel } from '@/utils/roles';

import { useCurrentUser, useLogout } from '../hooks/use-auth';

/**
 * Who is signed in, and the way out, for the diagnostics screen.
 *
 * The application shell has its own account menu; this stays because the system
 * check sits outside the shell and still has to name the session it is reporting on.
 */
export function SessionPanel() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initialsOf(user.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
          <p className="truncate text-xs text-ink-muted">
            {roleLabel(user.role)} · {user.storeName}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="inline-flex shrink-0 items-center gap-2 rounded-input border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {logout.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="size-4" aria-hidden="true" />
        )}
        Sign out
      </button>
    </div>
  );
}
