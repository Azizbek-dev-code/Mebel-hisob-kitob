import { useEffect } from 'react';

import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

import { Sidebar } from './Sidebar';

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The sidebar as an overlay drawer, for viewports too narrow for a permanent rail.
 *
 * It is unmounted while closed rather than translated off-screen, so its links never
 * appear twice in the accessibility tree alongside the desktop rail.
 */
export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    const unlock = lockBodyScroll();

    return () => {
      unlock();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Dismisses the drawer on a tap outside it. Keyboard users have Escape and
            the close button inside the panel, so it stays out of the a11y tree. */}
        <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/40" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col shadow-overlay"
        >
          <Sidebar onNavigate={onClose} onRequestClose={onClose} />
        </div>
      </div>
    </ModalPortal>
  );
}
