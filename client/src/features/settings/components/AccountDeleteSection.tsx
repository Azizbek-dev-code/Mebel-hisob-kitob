import {
  ACCOUNT_DELETE_CONFIRMATION,
  ACCOUNT_DELETION_REASON_LABELS,
  AccountDeletionReasonCode,
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
 * Multi-step self-delete. Soft-deletes the signed-in user only.
 * Store data, other users, and financial history stay in PostgreSQL.
 */
export function AccountDeleteSection() {
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

  const phraseOk = confirmation === ACCOUNT_DELETE_CONFIRMATION;
  const reasonOk =
    Boolean(reasonCode) &&
    (reasonCode !== AccountDeletionReasonCode.OTHER || reasonDetail.trim().length > 0);
  const canDelete = phraseOk && password.length > 0 && reasonOk && !pending;

  async function submit() {
    if (!canDelete || !reasonCode) return;
    setError(null);
    setPending(true);
    try {
      await accountService.deleteOwnAccount({
        password,
        confirmation: ACCOUNT_DELETE_CONFIRMATION,
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
        setError(caught.message || t('settings.deleteAccountFailed'));
        return;
      }
      setError(t('settings.deleteAccountFailed'));
    }
  }

  return (
    <SectionCard
      title={t('settings.deleteAccountTitle')}
      description={t('settings.deleteAccountHint')}
    >
      <div className="rounded-panel border border-danger-100 bg-danger-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-700" aria-hidden="true" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-danger-800">{t('settings.deleteAccountTitle')}</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-danger-800">
              <li>{t('settings.deleteAccountBulletLogin')}</li>
              <li>{t('settings.deleteAccountBulletData')}</li>
              <li>{t('settings.deleteAccountBulletRestore')}</li>
              <li>{t('settings.deleteAccountBulletIrreversible')}</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(true);
              }}
              className="mt-2 rounded-input bg-danger-700 px-3 py-2 text-sm font-medium text-white hover:bg-danger-800"
            >
              {t('settings.deleteAccountContinue')}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onClose={close}
        title={t('settings.deleteAccountTitle')}
        description={t('settings.deleteAccountStep', { step: step + 1 })}
        className="max-w-lg"
      >
        <div className="space-y-4 overflow-x-hidden">
          {step === 1 ? (
            <div className="space-y-3 text-sm text-ink">
              <p className="font-medium">{t('settings.deleteAccountWhat')}</p>
              <ul className="list-disc space-y-1 pl-4 text-ink-soft">
                <li>{t('settings.deleteAccountWhatProfile')}</li>
                <li>{t('settings.deleteAccountWhatLogin')}</li>
                <li>{t('settings.deleteAccountWhatPersonal')}</li>
                <li>{t('settings.deleteAccountWhatKeep')}</li>
              </ul>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-ink">{t('settings.deleteAccountWhy')}</p>
              <div className="space-y-2">
                {REASON_ORDER.map((code) => (
                  <label key={code} className="flex items-start gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name="delete-reason"
                      className="mt-1"
                      checked={reasonCode === code}
                      onChange={() => setReasonCode(code)}
                    />
                    <span>{ACCOUNT_DELETION_REASON_LABELS[code]}</span>
                  </label>
                ))}
              </div>
              {reasonCode === AccountDeletionReasonCode.OTHER ? (
                <textarea
                  className={`${fieldClass} resize-y`}
                  rows={3}
                  value={reasonDetail}
                  onChange={(event) => setReasonDetail(event.target.value)}
                  placeholder={t('settings.deleteAccountOtherPlaceholder')}
                />
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <label className="block text-sm" htmlFor="delete-account-password">
                <span className="mb-1 block font-medium text-ink">{t('settings.deleteAccountPassword')}</span>
                <input
                  id="delete-account-password"
                  type="password"
                  className={fieldClass}
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="block text-sm" htmlFor="delete-account-confirmation">
                <span className="mb-1 block font-medium text-ink">
                  {t('settings.deleteAccountTypePhrase', { phrase: ACCOUNT_DELETE_CONFIRMATION })}
                </span>
                <input
                  id="delete-account-confirmation"
                  className={fieldClass}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </label>
              <p className="text-xs text-ink-muted">{t('settings.deleteAccountFinalHint')}</p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            {step > 1 ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
                }}
                className="rounded-input border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover disabled:opacity-60"
              >
                {t('common.back')}
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                disabled={step === 2 && !reasonOk}
                onClick={() => {
                  setError(null);
                  if (step === 1) setStep(2);
                  else if (step === 2 && reasonOk) setStep(3);
                }}
                className="rounded-input bg-danger-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-800 disabled:opacity-60"
              >
                {t('settings.deleteAccountContinue')}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canDelete}
                onClick={() => void submit()}
                className="inline-flex items-center justify-center gap-2 rounded-input bg-danger-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-danger-800 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t('settings.deleteAccountConfirm')}
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </SectionCard>
  );
}
