import { Dialog } from '@/components/ui/Dialog';
import { ROUTES } from '@/routes/paths';
import { useNavigate } from 'react-router-dom';

import type { SubscriptionGateReason } from './subscription-context';

interface SubscriptionGateProps {
  open: boolean;
  onClose: () => void;
  reason?: SubscriptionGateReason;
}

export function SubscriptionGate({ open, onClose, reason = 'expired' }: SubscriptionGateProps) {
  const navigate = useNavigate();
  const isFeature = reason === 'feature';

  return (
    <Dialog
      open={open}
      title={isFeature ? 'Bu funksiya sizning tarifingizda mavjud emas' : 'Tarif muddati tugagan'}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-2xl" aria-hidden="true">
          🔒
        </p>
        <p className="text-sm text-ink">
          {isFeature
            ? 'Bu funksiya sizning tarifingizda mavjud emas.'
            : 'Sizning bepul sinov davringiz tugadi.'}
        </p>
        {!isFeature ? (
          <p className="text-sm text-ink-muted">Ma&apos;lumotlaringiz saqlanib turibdi.</p>
        ) : null}
        <p className="text-sm text-ink-muted">
          {isFeature
            ? 'Davom etish uchun tariflardan birini tanlang.'
            : 'Davom etish uchun tariflardan birini tanlang.'}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-input px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover"
            onClick={onClose}
          >
            Keyinroq
          </button>
          <button
            type="button"
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={() => {
              onClose();
              void navigate(ROUTES.billing);
            }}
          >
            Tariflarni ko&apos;rish
          </button>
        </div>
      </div>
    </Dialog>
  );
}
