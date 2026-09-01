import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ModalPortal } from '@/components/ui/ModalPortal';
import { lockBodyScroll } from '@/lib/body-scroll-lock';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * Lightweight confirm overlay — used when the user skips optional but important
 * fields (e.g. product cost price) and may fill them in later via edit.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel ?? t('common.continue');
  const resolvedCancel = cancelLabel ?? t('common.goBack');

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <div className="mt-2 text-sm text-ink-muted">{message}</div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-input border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover disabled:opacity-60"
            >
              {resolvedCancel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {resolvedConfirm}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
