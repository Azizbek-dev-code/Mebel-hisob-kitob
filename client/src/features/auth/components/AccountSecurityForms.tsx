import { splitFullName } from '@furniture-erp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { authQueryKeys, useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { accountService } from '@/services/account.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

export function AccountProfileForm() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const parts = splitFullName(user?.fullName ?? '');
  const [firstName, setFirstName] = useState(parts.firstName);
  const [lastName, setLastName] = useState(parts.lastName);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const showPhone = Boolean(user && !('kind' in user && user.kind === 'PERSONAL'));

  useEffect(() => {
    const next = splitFullName(user?.fullName ?? '');
    setFirstName(next.firstName);
    setLastName(next.lastName);
    setEmail(user?.email ?? '');
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
        email,
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
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">{t('common.email', { defaultValue: 'Email' })}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} required />
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
