import { AccountProfileForm } from '@/features/auth/components/AccountSecurityForms';
import { useTranslation } from 'react-i18next';

export function PersonalProfileEditPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('auth.profileDetails')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('auth.profileDetailsHint')}</p>
      </div>
      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <AccountProfileForm />
      </section>
    </div>
  );
}
