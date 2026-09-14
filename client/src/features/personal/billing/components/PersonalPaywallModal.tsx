import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Dialog } from '@/components/ui/Dialog';
import { ROUTES } from '@/routes/paths';

export function PersonalPaywallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Dialog open={open} title={t('personal.paywallTitle')} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink">{t('personal.paywallBody')}</p>
        <p className="text-sm text-ink-muted">{t('personal.paywallKept')}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-input px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover"
            onClick={onClose}
          >
            {t('personal.paywallLater')}
          </button>
          <button
            type="button"
            className="rounded-input bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={() => {
              onClose();
              void navigate(ROUTES.personalBilling);
            }}
          >
            {t('personal.choosePlan')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
