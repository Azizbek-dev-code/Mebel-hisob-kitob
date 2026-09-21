import {
  ACCOUNT_DELETION_REASON_LABELS,
  AccountDeletionReasonCode,
  BUSINESS_DELETE_CONFIRMATION,
  type AccountDeletionReasonCode as ReasonCode,
} from '@furniture-erp/shared';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { authQueryKeys } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { accountService } from '@/services/account.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const REASON_ORDER: ReasonCode[] = [
  AccountDeletionReasonCode.NOT_NEEDED,
  AccountDeletionReasonCode.TOO_HARD,
  AccountDeletionReasonCode.MISSING_FEATURES,
  AccountDeletionReasonCode.SWITCHED_APP,
  AccountDeletionReasonCode.TOO_EXPENSIVE,
  AccountDeletionReasonCode.OTHER,
];

type Step = 1 | 2 | 3 | 4;

/**
 * Owner closes the current Business workspace + store.
 * Personal Finance and Identity stay; no admin transfer required.
 */
export function BusinessDeleteSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setStep(1);
    setReasonCode('');
    setReasonDetail('');
    setPassword('');
    setConfirmation('');
    setError(null);
    setPending(false);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  const phraseOk = confirmation === BUSINESS_DELETE_CONFIRMATION;
  const reasonOk =
    Boolean(reasonCode) &&
    (reasonCode !== AccountDeletionReasonCode.OTHER || reasonDetail.trim().length > 0);
  const canDelete = phraseOk && password.length > 0 && reasonOk && !pending;

  async function submit() {
    if (!canDelete || !reasonCode) return;
    setError(null);
    setPending(true);
    try {
      await accountService.deleteBusinessAccount({
        password,
        confirmation: BUSINESS_DELETE_CONFIRMATION,
        reasonCode,
        reasonDetail:
          reasonCode === AccountDeletionReasonCode.OTHER ? reasonDetail.trim() : undefined,
      });
      queryClient.setQueryData(authQueryKeys.currentUser, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      navigate(ROUTES.login, { replace: true });
    } catch (caught) {
      setPending(false);
      if (caught instanceof ApiClientError) {
        setError(caught.message || t('settings.deleteBusinessFailed'));
        return;
      }
      setError(t('settings.deleteBusinessFailed'));
    }
  }

  return (
    <SectionCard
      title={t('settings.deleteBusinessTitle')}
      description={t('settings.deleteBusinessHint')}
    >
      <div className="rounded-panel border border-danger-100 bg-danger-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-700" aria-hidden="true" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-danger-800">{t('settings.deleteBusinessTitle')}</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-danger-800">
              <li>{t('settings.deleteBusinessBulletStore')}</li>
              <li>{t('settings.deleteBusinessBulletPersonal')}</li>
              <li>{t('settings.deleteBusinessBulletIdentity')}</li>
              <li>{t('settings.deleteBusinessBulletIrreversible')}</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className="rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white hover:bg-danger-700"
            >
              {t('common.continue')}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={open} title={t('settings.deleteBusinessTitle')} onClose={close}>
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <p className="text-sm text-ink">{t('settings.deleteBusinessConfirmQ')}</p>
              <p className="text-sm text-ink-muted">{t('settings.deleteBusinessConfirmBody')}</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-input px-3 py-2 text-sm text-ink-muted" onClick={close}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => setStep(2)}
                >
                  {t('common.continue')}
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="text-sm font-medium text-ink">{t('settings.deleteAccountReason')}</p>
              <ul className="space-y-2">
                {REASON_ORDER.map((code) => (
                  <li key={code}>
                    <button
                      type="button"
                      onClick={() => setReasonCode(code)}
                      className={
                        reasonCode === code
                          ? 'w-full rounded-input border border-brand-500 bg-brand-50 px-3 py-2 text-left text-sm'
                          : 'w-full rounded-input border border-line px-3 py-2 text-left text-sm hover:bg-surface-hover'
                      }
                    >
                      {ACCOUNT_DELETION_REASON_LABELS[code]}
                    </button>
                  </li>
                ))}
              </ul>
              {reasonCode === AccountDeletionReasonCode.OTHER ? (
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  className={fieldClass}
                  rows={3}
                  placeholder={t('settings.deleteAccountOtherPlaceholder')}
                />
              ) : null}
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-input px-3 py-2 text-sm text-ink-muted" onClick={() => setStep(1)}>
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  disabled={!reasonOk}
                  className="rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={() => setStep(3)}
                >
                  {t('common.continue')}
                </button>
              </div>
            </>
          ) : null}

          {step === 3 || step === 4 ? (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">{t('settings.deleteAccountPassword')}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="current-password"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">
                  {t('settings.deleteBusinessPhrase', { phrase: BUSINESS_DELETE_CONFIRMATION })}
                </span>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className={fieldClass}
                  autoComplete="off"
                />
              </label>
              {error ? <p className="text-sm text-danger-700">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-input px-3 py-2 text-sm text-ink-muted"
                  onClick={() => setStep(2)}
                  disabled={pending}
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  disabled={!canDelete}
                  className="inline-flex items-center gap-2 rounded-input bg-danger-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={() => void submit()}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {t('settings.deleteBusinessTitle')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </Dialog>
    </SectionCard>
  );
}
