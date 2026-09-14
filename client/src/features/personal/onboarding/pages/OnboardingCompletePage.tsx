import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ROUTES } from '@/routes/paths';

type CompleteState = {
  mode?: 'register' | 'authenticated';
  workspaceName?: string;
  email?: string;
};

export function OnboardingCompletePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const state = (location.state ?? {}) as CompleteState;
  const signedIn = state.mode === 'authenticated';

  return (
    <main className="pf-shell flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="flex items-start justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-4 rounded-panel border border-line bg-surface p-6 text-center shadow-card sm:p-8">
          <CheckCircle2 className="mx-auto size-10 text-success-600" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            {t('onboarding.completeTitle')}
          </h1>
          {state.workspaceName ? (
            <p className="mt-2 text-sm font-medium text-ink">{state.workspaceName}</p>
          ) : null}
          <p className="mt-2 text-sm text-ink-muted">
            {signedIn ? t('onboarding.completeSignedIn') : t('onboarding.completeGuest')}
          </p>
          {state.email ? (
            <p className="mt-2 text-sm text-ink-subtle">{state.email}</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to={ROUTES.login}
              className="inline-flex items-center justify-center rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              {t('auth.login')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
