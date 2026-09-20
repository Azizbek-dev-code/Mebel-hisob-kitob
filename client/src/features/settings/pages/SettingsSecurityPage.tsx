import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { ChangePasswordForm } from '@/features/auth/components/AccountSecurityForms';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

export function SettingsSecurityPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const verified = Boolean(user && 'emailVerified' in user && user.emailVerified);

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t('settings.hubSecurity')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      <SectionCard title={t('auth.changePassword')} description={t('auth.changePasswordHint')}>
        <ChangePasswordForm />
      </SectionCard>
      <SectionCard title={t('auth.verifyEmail')} description={verified ? t('auth.emailVerified') : t('settings.emailUnverified')}>
        <p className="text-sm text-ink">{user?.email}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {verified ? t('auth.emailVerified') : t('settings.emailUnverified')}
        </p>
      </SectionCard>
    </PageContainer>
  );
}
