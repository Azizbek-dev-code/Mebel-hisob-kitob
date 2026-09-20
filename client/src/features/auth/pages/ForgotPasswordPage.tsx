import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { accountService } from '@/services/account.service';

const fieldClass =
  'w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

type Step = 'email' | 'code' | 'done';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setError(null);
    setPending(true);
    try {
      await accountService.forgotPassword({ email });
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  async function onRequest(event: FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function onReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== newPasswordConfirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setPending(true);
    try {
      await accountService.resetPassword({ email, code, newPassword, newPasswordConfirmation });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-4 rounded-panel border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">{t('auth.forgotPassword')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('auth.forgotPasswordHint')}</p>

          {error ? (
            <div role="alert" className="mt-4 flex gap-2 rounded-input border border-danger-100 bg-danger-50 p-3">
              <AlertCircle className="size-4 shrink-0 text-danger-500" aria-hidden="true" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          ) : null}

          {step === 'email' ? (
            <form onSubmit={onRequest} className="mt-5 space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  required
                  autoComplete="email"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t('auth.sendCode')}
              </button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form onSubmit={onReset} className="mt-5 space-y-3">
              <p className="text-sm text-ink-muted">{t('auth.codeSent')}</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">{t('auth.emailCode')}</span>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={fieldClass}
                  required
                  autoComplete="one-time-code"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">{t('auth.newPassword')}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldClass}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">{t('auth.confirmPassword')}</span>
                <input
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  className={fieldClass}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t('auth.resetPassword')}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void sendCode()}
                className="w-full text-sm font-medium text-brand-700 hover:underline disabled:opacity-60"
              >
                {t('auth.resendCode')}
              </button>
            </form>
          ) : null}

          {step === 'done' ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-emerald-700">{t('auth.passwordResetDone')}</p>
              <button
                type="button"
                onClick={() => navigate(ROUTES.login)}
                className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                {t('auth.login')}
              </button>
            </div>
          ) : null}

          <p className="mt-6 text-center text-sm">
            <Link to={ROUTES.login} className="font-medium text-brand-700 hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
