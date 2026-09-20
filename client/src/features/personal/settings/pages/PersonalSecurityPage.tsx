import { type AuthSessionDto } from '@furniture-erp/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ChangePasswordForm,
  EmailAddressStatus,
  EmailPasswordResetForm,
  VerifyEmailForm,
} from '@/features/auth/components/AccountSecurityForms';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { accountService } from '@/services/account.service';

export function PersonalSecurityPage() {
  const { t } = useTranslation();
  const { refetch } = useCurrentUser();

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

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{t('auth.emailResetTitle')}</h2>
        <p className="mt-1 text-xs text-ink-muted">{t('auth.emailResetHint')}</p>
        <EmailPasswordResetForm />
      </section>

      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{t('auth.verifyEmail')}</h2>
        <div className="mt-2">
          <EmailAddressStatus />
        </div>
        <VerifyEmailForm onDone={() => void refetch()} />
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
