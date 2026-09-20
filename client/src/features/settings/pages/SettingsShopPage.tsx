import { UserRole } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

import { useStoreSettings } from '../hooks/use-settings';
import { loadErrorMessage, StoreSettingsForm, StoreSubscriptionSettings } from './SettingsPage';

export function SettingsShopPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const settings = useStoreSettings(Boolean(currentUser));
  const editable = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PLATFORM_ADMIN;

  if (settings.isError) {
    return (
      <PageContainer>
        <ErrorState
          title={t('settings.loadFailed')}
          message={loadErrorMessage(settings.error, t)}
          onRetry={() => void settings.refetch()}
        />
      </PageContainer>
    );
  }

  if (settings.isLoading || !settings.data) {
    return (
      <PageContainer>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t('settings.hubShop')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      <StoreSettingsForm store={settings.data} editable={Boolean(editable)} />
      {editable ? <StoreSubscriptionSettings /> : null}
    </PageContainer>
  );
}
