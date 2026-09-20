import { type AuthSessionDto } from '@furniture-erp/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ChangePasswordForm } from '@/features/auth/components/AccountSecurityForms';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { accountService } from '@/services/account.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalSecurityPage() {
  const { t } = useTranslation();
  const { data: user, refetch } = useCurrentUser();
  const verified = Boolean(user && 'emailVerified' in user && user.emailVerified);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('auth.security')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('auth.securityHint')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{t('auth.changePassword')}</h2>
        <p className="mt-1 text-xs text-ink-muted">{t('auth.changePasswordHint')}</p>
        <div className="mt-3">
          <ChangePasswordForm />
        </div>
      </section>

      <EmailResetSection />

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{t('auth.verifyEmail')}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {verified ? t('auth.emailVerified') : t('auth.verifyEmailHint')}
        </p>
        {!verified ? <VerifyEmailForm onDone={() => void refetch()} /> : null}
      </section>

      <SessionsSection />

      <section className="rounded-2xl border border-dashed border-line px-4 py-3.5 opacity-70">
        <h2 className="text-sm font-semibold text-ink">{t('auth.verifyPhone')}</h2>
        <p className="mt-1 text-xs text-ink-muted">{t('personal.comingSoon')}</p>
        <button type="button" disabled className="mt-3 rounded-input border border-line px-3 py-2 text-sm">
          {t('personal.comingSoon')}
        </button>
      </section>
    </div>
  );
}

function EmailResetSection() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      await accountService.requestInAppPasswordReset();
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await accountService.confirmInAppPasswordReset({
        code,
        newPassword,
        newPasswordConfirmation: confirm,
      });
      setSaved(true);
      setCode('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <h2 className="text-sm font-semibold text-ink">{t('auth.emailResetTitle')}</h2>
      <p className="mt-1 text-xs text-ink-muted">{t('auth.emailResetHint')}</p>
      {error ? <p className="mt-2 text-sm text-danger-700">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-emerald-700">{t('auth.passwordChanged')}</p> : null}
      {!sent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void requestCode()}
          className="mt-3 rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {t('auth.emailResetCta')}
        </button>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <p className="text-xs text-ink-muted">{t('auth.codeSent')}</p>
          <input className={fieldClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('auth.emailCode')} required />
          <input className={fieldClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('auth.newPassword')} required minLength={8} />
          <input className={fieldClass} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t('auth.confirmPassword')} required minLength={8} />
          <button type="submit" disabled={pending} className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {t('auth.resetPassword')}
          </button>
        </form>
      )}
    </section>
  );
}

function VerifyEmailForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      await accountService.requestEmailVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await accountService.confirmEmailVerification(code);
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {!sent ? (
        <button type="button" disabled={pending} onClick={() => void requestCode()} className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {t('auth.sendCode')}
        </button>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <input className={fieldClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('auth.emailCode')} required />
          <button type="submit" disabled={pending} className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {t('auth.verifyEmail')}
          </button>
        </form>
      )}
    </div>
  );
}

function SessionsSection() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AuthSessionDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await accountService.listSessions();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function revoke(id: string) {
    await accountService.revokeSession(id);
    if (id === items.find((item) => item.isCurrent)?.id) {
      window.location.href = '/login';
      return;
    }
    await load();
  }

  return (
    <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{t('auth.sessionsTitle')}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t('auth.sessionsHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => void accountService.revokeOtherSessions().then(load)}
          className="shrink-0 text-xs font-medium text-danger-700 hover:underline"
        >
          {t('auth.revokeOthers')}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger-700">{error}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((session) => (
          <li key={session.id} className="rounded-xl border border-line px-3 py-2.5">
            <p className="text-sm font-medium text-ink">
              {session.deviceLabel}
              {session.isCurrent ? (
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                  {t('auth.currentSession')}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {session.ipAddress ?? t('auth.unknownIp')} · {new Date(session.lastActiveAt).toLocaleString()}
            </p>
            <button type="button" onClick={() => void revoke(session.id)} className="mt-2 text-xs text-danger-700 hover:underline">
              {t('auth.signOutDevice')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
