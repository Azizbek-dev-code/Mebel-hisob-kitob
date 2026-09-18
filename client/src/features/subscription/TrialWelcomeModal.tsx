import { formatDate } from '@/utils/format';

import { Dialog } from '@/components/ui/Dialog';

interface TrialWelcomeModalProps {
  open: boolean;
  trialEndsAt: string | null;
  onStart: () => void;
}

/** First-run trial welcome — start using the product; paid upgrade lives on Billing. */
export function TrialWelcomeModal({ open, trialEndsAt, onStart }: TrialWelcomeModalProps) {
  return (
    <Dialog open={open} title="Xush kelibsiz!" onClose={onStart}>
      <div className="space-y-4">
        <p className="text-sm text-ink">
          Fayz Mebel ERP&apos;ni 7 kun davomida bepul sinab ko&apos;rishingiz mumkin.
        </p>
        <div className="rounded-card border border-line bg-surface-muted px-3 py-3 text-sm">
          <p className="font-medium text-ink">7 kunlik bepul sinov</p>
          {trialEndsAt ? (
            <p className="mt-1 text-ink-muted">
              Trial tugash sanasi: {formatDate(trialEndsAt)}
            </p>
          ) : null}
        </div>
        <p className="text-sm text-ink-muted">
          Sinov davomida asosiy imkoniyatlardan foydalaning. Pullik tarifni keyinroq tanlashingiz mumkin.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={onStart}
          >
            7 kun bepul boshlash
          </button>
        </div>
      </div>
    </Dialog>
  );
}
