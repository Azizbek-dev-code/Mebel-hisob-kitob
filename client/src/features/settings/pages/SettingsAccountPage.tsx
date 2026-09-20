import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { AccountProfileForm } from '@/features/auth/components/AccountSecurityForms';
import { ROUTES } from '@/routes/paths';

export function SettingsAccountPage() {
  const { t } = useTranslation();
  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t('settings.hubAccount')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      <SectionCard title={t('auth.profile')} description={t('settings.userProfileHint')}>
        <AccountProfileForm />
      </SectionCard>
    </PageContainer>
  );
}
