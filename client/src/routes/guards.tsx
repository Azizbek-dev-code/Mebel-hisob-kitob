import { homePathForAuth, isPersonalAuth, isStoreAccessRestricted } from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';

import { ROUTES } from './paths';

export function ProtectedRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <SessionSplash label="Checking your session…" />;
  }

  if (!user) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (isPersonalAuth(user)) {
    return <Navigate to={ROUTES.personalDashboard} replace />;
  }

  if (isStoreAccessRestricted(user) && location.pathname !== ROUTES.accessBlocked) {
    return <Navigate to={ROUTES.accessBlocked} replace />;
  }

  return <Outlet />;
}

export function PersonalProtectedRoute() {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <SessionSplash label="Checking your session…" />;
  }

  if (!user) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!isPersonalAuth(user)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return <SessionSplash label="Checking your session…" />;
  }

  if (user) {
    return <Navigate to={homePathForAuth(user)} replace />;
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
