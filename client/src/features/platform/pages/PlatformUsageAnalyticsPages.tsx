import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { PlatformUsageUserDetailDto, PlatformUsageUserRowDto } from '@furniture-erp/shared';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { platformUsageAnalyticsService } from '@/services/platform-usage-analytics.service';

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Prefer the API message so missing tables / 403s are not hidden behind a generic retry string. */
function usageErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const detail = error.details?.[0]?.message;
    const primary = detail ?? error.message;
    if (primary && primary.trim()) return primary;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function PlatformUsageOverviewPage() {
  const { t } = useTranslation();
  const overview = useQuery({
    queryKey: ['platform', 'usage', 'overview'],
    queryFn: ({ signal }) => platformUsageAnalyticsService.overview(signal),
  });
  return (
    <PageContainer className="space-y-6">
      <Header />
      {overview.isPending && !overview.data ? (
        <Skeleton className="h-40 w-full" />
      ) : overview.isError ? (
        <ErrorState
          title={t('platformAdmin.usage.loadFailed')}
          message={usageErrorMessage(overview.error, t('common.retry'))}
          onRetry={() => void overview.refetch()}
        />
      ) : overview.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label={t('platformAdmin.usage.totalUsers')} value={overview.data.totalUsers} />
          <Metric label={t('platformAdmin.usage.activeToday')} value={overview.data.activeToday} />
          <Metric label={t('platformAdmin.usage.onlineNow')} value={overview.data.onlineNow} />
          <Metric label="DAU" value={overview.data.dau} />
          <Metric label="WAU" value={overview.data.wau} />
          <Metric label="MAU" value={overview.data.mau} />
          <Metric
            label={t('platformAdmin.usage.avgDaily')}
            value={formatDuration(overview.data.averageDailyUsageSeconds)}
          />
          <Metric
            label={t('platformAdmin.usage.avgSession')}
            value={formatDuration(overview.data.averageSessionSeconds)}
          />
          <Metric label={t('platformAdmin.usage.personalUsers')} value={overview.data.personalUsers} />
          <Metric label={t('platformAdmin.usage.businessUsers')} value={overview.data.businessUsers} />
          <Metric label={t('platformAdmin.usage.newUsers')} value={overview.data.newUsers} />
          <Metric label={t('platformAdmin.usage.returningUsers')} value={overview.data.returningUsers} />
          <Metric label="D1" value={pct(overview.data.d1Retention)} />
          <Metric label="D7" value={pct(overview.data.d7Retention)} />
          <Metric label="D30" value={pct(overview.data.d30Retention)} />
        </div>
      ) : null}
    </PageContainer>
  );
}

export function PlatformUsageUsersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['platform', 'usage', 'users', page],
    queryFn: ({ signal }) => platformUsageAnalyticsService.users(page, signal),
  });
  return (
    <PageContainer className="space-y-6">
      <Header />
      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('platformAdmin.usage.loadFailed')}
          message={usageErrorMessage(list.error, t('common.retry'))}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <ul className="space-y-2">
          {list.data?.items.map((row) => (
            <UserRow key={row.identityId} row={row} />
          ))}
        </ul>
      )}
      {list.data && list.data.totalPages > 1 ? (
        <div className="flex justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.prev', { defaultValue: 'Oldingi' })}
          </button>
          <span>
            {page}/{list.data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= list.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next', { defaultValue: 'Keyingi' })}
          </button>
        </div>
      ) : null}
    </PageContainer>
  );
}

export function PlatformUsageUserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const detail = useQuery({
    queryKey: ['platform', 'usage', 'user', id],
    queryFn: ({ signal }) => platformUsageAnalyticsService.user(String(id), signal),
    enabled: Boolean(id),
  });
  const user = detail.data?.user;
  return (
    <PageContainer className="space-y-6">
      <Header />
      {detail.isPending && !user ? (
        <Skeleton className="h-40 w-full" />
      ) : detail.isError || !user ? (
        <ErrorState
          title={t('platformAdmin.usage.loadFailed')}
          message={usageErrorMessage(detail.error, t('common.retry'))}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <UserDetail user={user} />
      )}
    </PageContainer>
  );
}

export function PlatformUsageFeaturesPage() {
  const { t } = useTranslation();
  const features = useQuery({
    queryKey: ['platform', 'usage', 'features'],
    queryFn: ({ signal }) => platformUsageAnalyticsService.features(signal),
  });
  return (
    <PageContainer className="space-y-6">
      <Header />
      {features.isPending && !features.data ? (
        <Skeleton className="h-40 w-full" />
      ) : features.isError ? (
        <ErrorState
          title={t('platformAdmin.usage.loadFailed')}
          message={usageErrorMessage(features.error, t('common.retry'))}
          onRetry={() => void features.refetch()}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureList title={t('platformAdmin.hub.personal')} rows={features.data?.personal ?? []} />
          <FeatureList title={t('platformAdmin.hub.business')} rows={features.data?.business ?? []} />
        </div>
      )}
    </PageContainer>
  );
}

export function PlatformUsageRetentionPage() {
  const { t } = useTranslation();
  const retention = useQuery({
    queryKey: ['platform', 'usage', 'retention'],
    queryFn: ({ signal }) => platformUsageAnalyticsService.retention(signal),
  });
  return (
    <PageContainer className="space-y-6">
      <Header />
      {retention.isPending && !retention.data ? (
        <Skeleton className="h-24 w-full" />
      ) : retention.isError ? (
        <ErrorState
          title={t('platformAdmin.usage.loadFailed')}
          message={usageErrorMessage(retention.error, t('common.retry'))}
          onRetry={() => void retention.refetch()}
        />
      ) : (
        <div className="space-y-3">
          <Metric label="D1" value={pct(retention.data?.d1 ?? null)} />
          <Metric label="D7" value={pct(retention.data?.d7 ?? null)} />
          <Metric label="D30" value={pct(retention.data?.d30 ?? null)} />
          <p className="text-xs text-ink-muted">{retention.data?.definition.d1}</p>
          <p className="text-xs text-ink-muted">{retention.data?.definition.d7}</p>
          <p className="text-xs text-ink-muted">{retention.data?.definition.d30}</p>
        </div>
      )}
    </PageContainer>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.usage.title')}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.usage.hint')}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function pct(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`;
}

function UserRow({ row }: { row: PlatformUsageUserRowDto }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={ROUTES.platformUsageUser(row.identityId)}
        className="block rounded-2xl border border-line bg-surface px-4 py-3 hover:bg-surface-hover"
      >
        <p className="text-sm font-medium text-ink">{row.displayName}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {row.accountTypes.join(' + ')}
          {row.businessType ? ` · ${row.businessType}` : ''}
          {row.personalSubscriptionStatus
            ? ` · ${t('platformAdmin.usage.personalSub')}: ${row.personalSubscriptionStatus}`
            : ''}
          {row.businessSubscriptionStatus
            ? ` · ${t('platformAdmin.usage.businessSub')}: ${row.businessSubscriptionStatus}`
            : ''}
        </p>
        <p className="mt-1 text-xs tabular-nums text-ink-soft">
          {t('platformAdmin.usage.today')}: {formatDuration(row.todaySeconds)} · 7d:{' '}
          {formatDuration(row.avg7dSeconds)} · 30d: {formatDuration(row.avg30dSeconds)} ·{' '}
          {t('platformAdmin.usage.sessions')}: {row.sessionsCount}
          {row.topFeature ? ` · ${row.topFeature}` : ''}
        </p>
      </Link>
    </li>
  );
}

function UserDetail({ user }: { user: PlatformUsageUserDetailDto }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">{user.displayName}</h3>
        <p className="text-xs text-ink-muted">
          {user.accountTypes.join(' + ')}
          {user.businessType ? ` · ${user.businessType}` : ''}
          {user.personalSubscriptionStatus
            ? ` · ${t('platformAdmin.usage.personalSub')}: ${user.personalSubscriptionStatus}`
            : ''}
          {user.businessSubscriptionStatus
            ? ` · ${t('platformAdmin.usage.businessSub')}: ${user.businessSubscriptionStatus}`
            : ''}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label={t('platformAdmin.usage.sessions')} value={user.totalSessions} />
        <Metric label={t('platformAdmin.usage.avgSession')} value={formatDuration(user.averageSessionSeconds)} />
        <Metric label={t('platformAdmin.usage.today')} value={formatDuration(user.todaySeconds)} />
        <Metric label="7d" value={formatDuration(user.last7dSeconds)} />
        <Metric label="30d" value={formatDuration(user.last30dSeconds)} />
      </div>
      <ul className="space-y-1">
        {user.featureUsage.map((row) => (
          <li key={row.feature} className="flex justify-between text-sm">
            <span>{row.feature}</span>
            <span className="tabular-nums">{row.eventCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureList({
  title,
  rows,
}: {
  title: string;
  rows: { feature: string; adoptionPercent: number; eventCount: number }[];
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.feature} className="flex justify-between text-sm">
            <span>{row.feature}</span>
            <span className="tabular-nums text-ink-muted">{row.adoptionPercent}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
