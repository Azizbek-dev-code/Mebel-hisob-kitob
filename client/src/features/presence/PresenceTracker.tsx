import { AnalyticsAccountType, featureFromRoute } from '@furniture-erp/shared';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { presenceService } from '@/services/presence.service';

const HEARTBEAT_MS = 45_000;
const IDLE_MS = 300_000;
const SESSION_KEY = 'balancy.presence.sid';

function isTestEnv(): boolean {
  return import.meta.env.MODE === 'test' || Boolean(import.meta.env.VITEST);
}

function clientSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `sid_${Date.now()}`;
  }
}

function accountContext(pathname: string): {
  accountType: 'PERSONAL' | 'BUSINESS' | 'PLATFORM';
} {
  if (pathname.startsWith('/personal')) return { accountType: AnalyticsAccountType.PERSONAL };
  if (pathname.startsWith('/platform') || pathname.startsWith('/admin')) {
    return { accountType: AnalyticsAccountType.PLATFORM };
  }
  return { accountType: AnalyticsAccountType.BUSINESS };
}

function eventTypeForRoute(pathname: string): string | null {
  if (pathname === '/personal/dashboard') return 'personal_dashboard_viewed';
  if (pathname === '/dashboard') return 'business_dashboard_viewed';
  if (pathname.startsWith('/personal/history') || pathname.startsWith('/personal/income')) {
    return 'transaction_list_viewed';
  }
  if (pathname.startsWith('/personal/budgets')) return 'budget_viewed';
  if (pathname.startsWith('/inventory')) return 'inventory_viewed';
  if (pathname.startsWith('/customers')) return 'customer_viewed';
  if (pathname.startsWith('/delivery')) return 'delivery_viewed';
  if (pathname.startsWith('/assembly')) return 'assembly_viewed';
  if (pathname.startsWith('/reports')) return 'report_viewed';
  if (pathname.startsWith('/products')) return 'product_viewed';
  return featureFromRoute(pathname) ? 'dashboard_viewed' : null;
}

/**
 * Identity-level heartbeat. Does not write on every click — only interval,
 * visibility, and route changes.
 */
export function PresenceTracker() {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  const lastInteract = useRef(Date.now());
  const lastRoute = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Heartbeat interval + interaction listeners — keyed only on user, not pathname.
  useEffect(() => {
    if (isTestEnv() || !user) return undefined;

    const onInteract = () => {
      lastInteract.current = Date.now();
    };
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract);

    const send = (forceEvent = false) => {
      const route = pathnameRef.current;
      const visible = document.visibilityState === 'visible';
      const active = visible && Date.now() - lastInteract.current < IDLE_MS;
      const ctx = accountContext(route);
      void presenceService
        .heartbeat({
          clientSessionId: clientSessionId(),
          visible,
          active,
          route: route.slice(0, 160),
          accountType: ctx.accountType,
        })
        .catch(() => undefined);

      if (forceEvent && visible) {
        const eventType = eventTypeForRoute(route);
        if (eventType) {
          void presenceService
            .events({
              clientSessionId: clientSessionId(),
              events: [{ eventType, route, feature: featureFromRoute(route) ?? undefined }],
            })
            .catch(() => undefined);
        }
      }
    };

    send(false);

    const timer = window.setInterval(() => send(false), HEARTBEAT_MS);
    const onVis = () => {
      send(false);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(timer);
    };
  }, [user]);

  // Route-change analytics only — does not reset the heartbeat interval.
  useEffect(() => {
    if (isTestEnv() || !user) return;
    if (lastRoute.current === pathname) return;

    const visible = document.visibilityState === 'visible';
    const active = visible && Date.now() - lastInteract.current < IDLE_MS;
    const ctx = accountContext(pathname);
    void presenceService
      .heartbeat({
        clientSessionId: clientSessionId(),
        visible,
        active,
        route: pathname.slice(0, 160),
        accountType: ctx.accountType,
      })
      .catch(() => undefined);

    if (visible) {
      const eventType = eventTypeForRoute(pathname);
      if (eventType) {
        void presenceService
          .events({
            clientSessionId: clientSessionId(),
            events: [{ eventType, route: pathname, feature: featureFromRoute(pathname) ?? undefined }],
          })
          .catch(() => undefined);
      }
    }

    lastRoute.current = pathname;
  }, [user, pathname]);

  return null;
}
