import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import {
  dismissPersonalToast,
  subscribePersonalToasts,
  type PersonalToastItem,
} from './personal-toast';

export function PersonalToastHost() {
  const [toasts, setToasts] = useState<PersonalToastItem[]>([]);

  useEffect(() => subscribePersonalToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-line/80 bg-surface px-3.5 py-2.5 text-sm shadow-raised',
            toast.tone === 'success' && 'border-success-500/20',
            toast.tone === 'xp' && 'border-success-500/25',
            toast.tone === 'streak' && 'border-warning-500/25',
          )}
          role="status"
        >
          <p className="min-w-0 flex-1 font-medium text-ink">{toast.message}</p>
          {toast.action ? (
            <button
              type="button"
              className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
              onClick={() => {
                toast.action?.onClick();
                dismissPersonalToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          ) : (
            <button
              type="button"
              className="shrink-0 text-xs text-ink-muted hover:text-ink"
              aria-label="Close"
              onClick={() => dismissPersonalToast(toast.id)}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
