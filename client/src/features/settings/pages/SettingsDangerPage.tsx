import { UserRole } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

import { AccountDeleteSection } from '../components/AccountDeleteSection';
import { BusinessDeleteSection } from '../components/BusinessDeleteSection';
import { StoreResetSection } from './SettingsPage';

export function SettingsDangerPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const editable = user?.role === UserRole.ADMIN || user?.role === UserRole.PLATFORM_ADMIN;
  const isStoreAdmin = user?.role === UserRole.ADMIN;

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t('settings.hubDanger')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      {editable ? <StoreResetSection /> : null}
      {isStoreAdmin ? <BusinessDeleteSection /> : null}
      <AccountDeleteSection />
    </PageContainer>
  );
}
