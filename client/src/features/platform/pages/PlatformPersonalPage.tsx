import type { OnboardingCountBucket } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePersonalPlatformStats } from '@/features/platform/hooks/use-personal-platform-stats';

export function PlatformPersonalPage() {
  const { t } = useTranslation();
  const stats = usePersonalPlatformStats(true);
  const data = stats.data;
  const onboarding = data?.onboarding;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('personal.adminTitle')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.adminHint')}</p>
      </div>

      {stats.isPending && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : stats.isError ? (
        <ErrorState
          title={t('personal.adminLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Kpi label={t('personal.adminWorkspaces')} value={String(data?.workspaces ?? 0)} />
            <Kpi label={t('personal.adminTrial')} value={String(data?.trial ?? 0)} />
            <Kpi label={t('personal.adminActive')} value={String(data?.active ?? 0)} />
            <Kpi label={t('personal.adminExpired')} value={String(data?.expired ?? 0)} />
            <Kpi label={t('personal.adminCancelled')} value={String(data?.cancelled ?? 0)} />
            <Kpi label={t('personal.adminWithEntries')} value={String(data?.withEntries ?? 0)} />
            <Kpi label={t('personal.adminWithBudgets')} value={String(data?.withBudgets ?? 0)} />
            <Kpi label={t('personal.adminWithGoals')} value={String(data?.withSavingGoals ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BucketCard
              title={t('onboarding.questions.discovery')}
              items={onboarding?.discoverySource ?? []}
              tKey="onboarding.discovery"
            />
            <BucketCard
              title={t('onboarding.questions.goals')}
              items={onboarding?.goals ?? []}
              tKey="onboarding.goals"
            />
            <BucketCard
              title={t('onboarding.questions.help')}
              items={onboarding?.helpWith ?? []}
              tKey="onboarding.help"
            />
            <BucketCard
              title={t('onboarding.questions.income')}
              items={onboarding?.monthlyIncomeBand ?? []}
              tKey="onboarding.income"
            />
          </div>
          <p className="text-xs text-ink-muted">
            {t('onboarding.stats.customIncome')}: {onboarding?.customIncomeEnteredCount ?? 0}
          </p>
        </>
      )}
    </PageContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-panel border border-line bg-surface p-3 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function BucketCard({
  title,
  items,
  tKey,
}: {
  title: string;
  items: OnboardingCountBucket[];
  tKey: string;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('onboarding.adminEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">
                {t(`${tKey}.${item.key}`, { defaultValue: item.key })}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-ink">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
