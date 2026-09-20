import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import {
  ChangePasswordForm,
  EmailAddressStatus,
  EmailPasswordResetForm,
  VerifyEmailForm,
} from '@/features/auth/components/AccountSecurityForms';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/routes/paths';

export function SettingsSecurityPage() {
  const { t } = useTranslation();
  const { refetch } = useCurrentUser();

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={t('settings.hubSecurity')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      <SectionCard title={t('auth.changePassword')} description={t('auth.changePasswordHint')}>
        <ChangePasswordForm />
      </SectionCard>
      <SectionCard title={t('auth.emailResetTitle')} description={t('auth.emailResetHint')}>
        <EmailPasswordResetForm />
      </SectionCard>
      <SectionCard title={t('auth.verifyEmail')} description={t('auth.verifyEmailHint')}>
        <EmailAddressStatus />
        <VerifyEmailForm onDone={() => void refetch()} />
      </SectionCard>
    </PageContainer>
  );
}
