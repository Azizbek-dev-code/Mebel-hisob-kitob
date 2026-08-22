import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra classes for the panel (width, etc.). */
  className?: string;
}

/**
 * Lightweight modal used for fast create flows (e.g. recording an expense).
 * Matches existing panel/overlay tokens — not a third-party dialog library.
 *
 * Always portals to `document.body` so open/close and parent list updates cannot
 * desync React's fiber tree from the real DOM (insertBefore NotFoundError).
 */
export function Dialog({ open, title, description, onClose, children, className }: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    const unlock = lockBodyScroll();
    document.addEventListener('keydown', onKeyDown);

    return () => {
      unlock();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-ink/40"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-panel border border-line bg-surface shadow-overlay sm:max-w-lg sm:rounded-panel',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h3 id={titleId} className="text-base font-semibold text-ink">
                {title}
              </h3>
              {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-input p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
