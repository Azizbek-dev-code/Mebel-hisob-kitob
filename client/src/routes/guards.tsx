import { isStoreAccessRestricted } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';

import { ROUTES } from './paths';

/**
 * Hides application routes from visitors without a session.
 *
 * This is presentation only. Anyone can edit the bundle and render whatever they
 * like, so the API authorises every request independently; the guard exists so a
 * signed-out user sees the login form instead of a screen full of failed requests.
 */
export function ProtectedRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <SessionSplash label="Checking your session…" />;
  }

  if (!user) {
    // Remembered so a deep link survives the detour through the login form.
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (isStoreAccessRestricted(user) && location.pathname !== ROUTES.accessBlocked) {
    return <Navigate to={ROUTES.accessBlocked} replace />;
  }

  return <Outlet />;
}

/** Keeps an already signed-in user off the login form. */
export function PublicOnlyRoute() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return <SessionSplash label="Checking your session…" />;
  }

  if (user) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}

function SessionSplash({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
    </div>
  );
}
