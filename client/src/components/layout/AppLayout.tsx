import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Header } from './Header';
import { MobileSidebar } from './MobileSidebar';
import { Sidebar } from './Sidebar';
import { SubscriptionProvider } from '@/features/subscription/SubscriptionProvider';

/**
 * The frame every authenticated screen is rendered in: module rail on the left,
 * header on top, page below it.
 *
 * The rail is fixed and the content column is inset by its width, so a long table
 * scrolls under a navigation that never moves. Below `lg` the rail is replaced by
 * the drawer and the inset disappears.
 */
export function AppLayout() {
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
          <Outlet />
        </main>
      </div>
      </div>
    </SubscriptionProvider>
  );
}
