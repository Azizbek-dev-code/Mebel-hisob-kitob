import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { formatDate } from '@/utils/format';

/** Trial welcome only — paid purchase is not forced on first open. */
export function PersonalTrialWelcomeModal({
  open,
  trialEndsAt,
  onStart,
}: {
  open: boolean;
  trialEndsAt: string | null;
  onStart: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} title={t('personal.trialWelcomeTitle')} onClose={onStart}>
      <div className="space-y-4">
        <p className="text-sm text-ink">{t('personal.trialWelcomeBody')}</p>
        {trialEndsAt ? (
          <p className="rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink-soft">
            {t('personal.trialWelcomeUntil', { date: formatDate(trialEndsAt) })}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-input bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={onStart}
          >
            {t('personal.startUsing')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
