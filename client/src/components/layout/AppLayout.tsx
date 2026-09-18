import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Header } from './Header';
import { MobileSidebar } from './MobileSidebar';
import { Sidebar } from './Sidebar';
import { useNoIndex } from '@/features/marketing/hooks/use-page-seo';
import { PlatformHubChrome } from '@/features/platform/components/PlatformHubChrome';
import { FeatureLockedPanel } from '@/features/subscription/FeatureLockedPanel';
import { SubscriptionProvider } from '@/features/subscription/SubscriptionProvider';
import { useSubscription } from '@/features/subscription/subscription-context';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { featureForNavKey } from '@furniture-erp/shared';
import { navItemForPath } from '@/routes/navigation';

function FeatureGatedOutlet() {
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();
  const { hasFeature, isPlatformAdmin } = useSubscription();
  const nav = navItemForPath(pathname);
  const feature = nav ? featureForNavKey(nav.key) : null;
  if (!isPlatformAdmin && feature && user?.subscription && !hasFeature(feature)) {
    return <FeatureLockedPanel />;
  }
  return <Outlet />;
}

/**
 * The frame every authenticated screen is rendered in: module rail on the left,
 * header on top, page below it.
 *
 * The rail is fixed and the content column is inset by its width, so a long table
 * scrolls under a navigation that never moves. Below `lg` the rail is replaced by
 * the drawer and the inset disappears.
 */
export function AppLayout() {
  useNoIndex();
  const [isNavOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  const closeNav = useCallback(() => setNavOpen(false), []);

  // Covers the routes that change without a click on a drawer link — a redirect,
  // or the browser's back button while the drawer is open.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <SubscriptionProvider>
      <div className="min-h-screen bg-canvas lg:pl-sidebar">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-sidebar border-r border-line lg:block">
        <Sidebar />
      </div>

      <MobileSidebar isOpen={isNavOpen} onClose={closeNav} />

      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Header onOpenNavigation={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1">
          <PlatformHubChrome />
          <FeatureGatedOutlet />
        </main>
      </div>
      </div>
    </SubscriptionProvider>
  );
}
