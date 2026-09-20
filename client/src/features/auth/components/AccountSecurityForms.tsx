import { isEmailVerified, splitFullName } from '@furniture-erp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { accountService } from '@/services/account.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

const primaryBtn =
  'rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60';

export function EmailStatusBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={
        verified
          ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800'
          : 'rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800'
      }
    >
      {verified ? t('auth.emailVerifiedBadge') : t('auth.emailUnverifiedBadge')}
    </span>
  );
}

export function EmailAddressStatus() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const verified = isEmailVerified(user);

  if (!user) return null;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">{user.email}</p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <EmailStatusBadge verified={verified} />
        <span>{verified ? t('auth.emailVerified') : t('auth.verifyEmailHint')}</span>
      </p>
    </div>
  );
}

export function VerifyEmailForm({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const { data: user, refetch } = useCurrentUser();
  const verified = isEmailVerified(user);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      await accountService.requestEmailVerification();
      setSent(true);
      setCooldown(60);
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
      setCode('');
      await refetch();
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  if (verified) return null;

  return (
    <div className="mt-3 space-y-3">
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {!sent ? (
        <button type="button" disabled={pending} onClick={() => void requestCode()} className={primaryBtn}>
          {t('auth.verifyEmail')}
        </button>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <p className="text-xs text-ink-muted">{t('auth.codeSent')}</p>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('auth.emailCode')}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || code.length !== 6} className={primaryBtn}>
              {t('auth.verifyEmail')}
            </button>
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => void requestCode()}
              className="rounded-input border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {cooldown > 0 ? t('auth.resendWait', { seconds: cooldown }) : t('auth.resendCode')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ChangeEmailForm() {
  const { t } = useTranslation();
  const { data: user, refetch } = useCurrentUser();
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await accountService.requestEmailChange({ newEmail });
      setSent(true);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sent) {
      await requestCode();
      return;
    }
    setPending(true);
    setError(null);
    try {
      await accountService.confirmEmailChange({ code });
      setCode('');
      setNewEmail('');
      setSent(false);
      setSaved(true);
      await refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">{t('auth.emailChanged')}</p> : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">{t('auth.newEmail')}</span>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className={fieldClass}
          required
          autoComplete="email"
        />
      </label>
      {sent ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">{t('auth.emailCode')}</span>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('auth.emailCode')}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primaryBtn}>
          {sent ? t('auth.verifyEmail') : t('auth.sendCode')}
        </button>
        {sent ? (
          <button
            type="button"
            disabled={pending || cooldown > 0}
            onClick={() => void requestCode()}
            className="rounded-input border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {cooldown > 0 ? t('auth.resendWait', { seconds: cooldown }) : t('auth.resendCode')}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function EmailPasswordResetForm() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setError(null);
    setPending(true);
    try {
      await accountService.requestInAppPasswordReset();
      setSent(true);
      setCooldown(60);
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
    if (newPassword !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
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
    <div>
      {error ? <p className="mt-2 text-sm text-danger-700">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-emerald-700">{t('auth.passwordChanged')}</p> : null}
      {!sent ? (
        <button type="button" disabled={pending} onClick={() => void requestCode()} className={`mt-3 ${primaryBtn}`}>
          {t('auth.emailResetCta')}
        </button>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <p className="text-xs text-ink-muted">{t('auth.codeSent')}</p>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('auth.emailCode')}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <input
            className={fieldClass}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('auth.newPassword')}
            required
            minLength={8}
          />
          <input
            className={fieldClass}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('auth.confirmPassword')}
            required
            minLength={8}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={primaryBtn}>
              {t('auth.resetPassword')}
            </button>
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => void requestCode()}
              className="rounded-input border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {cooldown > 0 ? t('auth.resendWait', { seconds: cooldown }) : t('auth.resendCode')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AccountProfileForm() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const parts = splitFullName(user?.fullName ?? '');
  const [firstName, setFirstName] = useState(parts.firstName);
  const [lastName, setLastName] = useState(parts.lastName);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const showPhone = Boolean(user && !('kind' in user && user.kind === 'PERSONAL'));

  useEffect(() => {
    const next = splitFullName(user?.fullName ?? '');
    setFirstName(next.firstName);
    setLastName(next.lastName);
    setPhone(user?.phone ?? '');
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await accountService.updateProfile({
        firstName,
        lastName,
        ...(showPhone ? { phone: phone.trim() || null } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3">
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">{t('settings.saved')}</p> : null}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">{t('auth.firstName')}</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">{t('auth.lastName')}</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
        </label>
        {showPhone ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">{t('common.phone')}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {t('common.save')}
        </button>
      </form>

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink">{t('common.email', { defaultValue: 'Email' })}</h3>
        <EmailAddressStatus />
        <VerifyEmailForm />
        <div>
          <h4 className="text-sm font-medium text-ink">{t('auth.changeEmail')}</h4>
          <p className="mt-1 text-xs text-ink-muted">{t('auth.changeEmailHint')}</p>
          <div className="mt-3">
            <ChangeEmailForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== newPasswordConfirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setPending(true);
    try {
      await accountService.changePassword({ currentPassword, newPassword, newPasswordConfirmation });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">{t('auth.passwordChanged')}</p> : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">{t('auth.currentPassword')}</span>
        <input
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={fieldClass}
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">{t('auth.newPassword')}</span>
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={fieldClass}
          required
          minLength={8}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">{t('auth.confirmPassword')}</span>
        <input
          type="password"
          autoComplete="new-password"
          value={newPasswordConfirmation}
          onChange={(e) => setNewPasswordConfirmation(e.target.value)}
          className={fieldClass}
          required
          minLength={8}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {t('auth.changePassword')}
      </button>
    </form>
  );
}
