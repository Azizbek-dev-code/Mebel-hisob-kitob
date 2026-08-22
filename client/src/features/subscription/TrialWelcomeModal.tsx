import { formatDate } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

import { Dialog } from '@/components/ui/Dialog';
import { ROUTES } from '@/routes/paths';

interface TrialWelcomeModalProps {
  open: boolean;
  trialEndsAt: string | null;
  onStart: () => void;
}

export function TrialWelcomeModal({ open, trialEndsAt, onStart }: TrialWelcomeModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} title="Xush kelibsiz! 🎉" onClose={onStart}>
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
          Bu davrda barcha asosiy imkoniyatlardan foydalanishingiz mumkin.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-input px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover"
            onClick={() => {
              onStart();
              void navigate(ROUTES.billing);
            }}
          >
            Tariflarni ko&apos;rish
          </button>
          <button
            type="button"
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            onClick={onStart}
          >
            Boshlash
          </button>
        </div>
      </div>
    </Dialog>
  );
}
