import type { OnboardingCountBucket } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useOnboardingStats } from '@/features/personal/onboarding/hooks/use-onboarding';

export function PlatformOnboardingPage() {
  const { t } = useTranslation();
  const stats = useOnboardingStats();
  const data = stats.data;
  const rate = data && data.started > 0 ? Math.round((data.completed / data.started) * 100) : 0;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('onboarding.adminTitle')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('onboarding.adminHint')}</p>
      </div>

      {stats.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : stats.isError ? (
        <ErrorState
          title={t('onboarding.adminLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label={t('onboarding.stats.started')} value={String(data?.started ?? 0)} />
            <Kpi label={t('onboarding.stats.completed')} value={String(data?.completed ?? 0)} />
            <Kpi label={t('onboarding.stats.rate')} value={`${rate}%`} />
            <Kpi
              label={t('onboarding.stats.customIncome')}
              value={String(data?.customIncomeEnteredCount ?? 0)}
            />
            <Kpi label={t('onboarding.stats.personal')} value={String(data?.personalCompleted ?? 0)} />
            <Kpi label={t('onboarding.stats.business')} value={String(data?.businessCompleted ?? 0)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BucketCard
              title={t('onboarding.questions.purpose')}
              items={data?.purpose ?? []}
              tKey="onboarding.purpose"
            />
            <BucketCard
              title={t('onboarding.businessTypeTitle')}
              items={data?.businessType ?? []}
              tKey="onboarding.businessTypes"
            />
            <BucketCard
              title={t('onboarding.questions.discovery')}
              items={data?.discoverySource ?? []}
              tKey="onboarding.discovery"
            />
            <BucketCard title={t('onboarding.questions.goals')} items={data?.goals ?? []} tKey="onboarding.goals" />
            <BucketCard title={t('onboarding.questions.help')} items={data?.helpWith ?? []} tKey="onboarding.help" />
            <BucketCard
              title={t('onboarding.questions.income')}
              items={data?.monthlyIncomeBand ?? []}
              tKey="onboarding.income"
            />
            <BucketCard
              title={t('onboarding.questions.firstGoal')}
              items={data?.firstSavingGoal ?? []}
              tKey="onboarding.firstGoal"
            />
            <BucketCard
              title={t('onboarding.admin.needsTitle')}
              items={data?.needs ?? []}
              tKey="onboarding.needs"
            />
          </div>
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
