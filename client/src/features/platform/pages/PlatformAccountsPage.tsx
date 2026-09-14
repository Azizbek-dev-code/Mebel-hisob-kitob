import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  PLATFORM_ACCOUNT_DISPLAY_STATUSES,
  PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS,
  PlatformAccountDisplayStatus,
  PlatformAccountSource,
  WorkspaceType,
  type BusinessType,
  type PlatformAccountRow,
} from '@furniture-erp/shared';
import { Inbox } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MetricList, MetricRow } from '@/features/platform/components/MetricList';
import { usePlatformAccounts } from '@/features/platform/hooks/use-platform-accounts';
import { ROUTES } from '@/routes/paths';

export type PlatformAccountsFilter = 'all' | 'personal' | 'business';

function accountHref(row: PlatformAccountRow): string {
  if (row.source === PlatformAccountSource.PENDING_REQUEST && row.requestId) {
    return ROUTES.platformStoreRequestDetail(row.requestId);
  }
  return ROUTES.platformAccountDetail(row.id);
}

function statusTone(status: PlatformAccountDisplayStatus) {
  if (status === PlatformAccountDisplayStatus.ACTIVE || status === PlatformAccountDisplayStatus.TRIAL) {
    return 'success' as const;
  }
  if (status === PlatformAccountDisplayStatus.PENDING) return 'warning' as const;
  if (
    status === PlatformAccountDisplayStatus.EXPIRED ||
    status === PlatformAccountDisplayStatus.BLOCKED ||
    status === PlatformAccountDisplayStatus.CANCELLED
  ) {
    return 'danger' as const;
  }
  return 'neutral' as const;
}

export function PlatformAccountsPage({ filter = 'all' }: { filter?: PlatformAccountsFilter }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') ?? '';
  const status = PLATFORM_ACCOUNT_DISPLAY_STATUSES.includes(
    statusParam as PlatformAccountDisplayStatus,
  )
    ? (statusParam as PlatformAccountDisplayStatus)
    : undefined;
  const businessTypeParam = params.get('businessType') as BusinessType | null;

  const query = useMemo(
    () => ({
      accountType:
        filter === 'personal'
          ? WorkspaceType.PERSONAL
          : filter === 'business'
            ? WorkspaceType.BUSINESS
            : undefined,
      status,
      businessType: filter === 'business' && businessTypeParam ? businessTypeParam : undefined,
    }),
    [filter, status, businessTypeParam],
  );

  const list = usePlatformAccounts(query);
  const data = list.data;
  const items = data?.items ?? [];
  const showBusinessTypeFilter = filter === 'business';

  function setStatus(next: string) {
    const copy = new URLSearchParams(params);
    if (next) copy.set('status', next);
    else copy.delete('status');
    setParams(copy, { replace: true });
  }

  function setBusinessType(next: string) {
    const copy = new URLSearchParams(params);
    if (next) copy.set('businessType', next);
    else copy.delete('businessType');
    setParams(copy, { replace: true });
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('nav.accounts')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.accounts.hint')}</p>
      </div>

      {list.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('platformAdmin.accounts.loadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <>
          <SectionCard title={t('platformAdmin.accounts.overviewTitle')}>
            <MetricList>
              <MetricRow
                label={t('platformAdmin.accounts.total')}
                value={String(data?.summary.total ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.active')}
                value={String(data?.summary.active ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.trial')}
                value={String(data?.summary.trial ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.pending')}
                value={String(data?.summary.pending ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.expired')}
                value={String(data?.summary.expired ?? 0)}
              />
              <MetricRow
                label={t('platformAdmin.accounts.blocked')}
                value={String(data?.summary.blocked ?? 0)}
              />
            </MetricList>
          </SectionCard>

          <SectionCard title={t('platformAdmin.accounts.tableTitle')}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1 text-sm">
                <span className="mb-1 block text-ink-muted">{t('common.status')}</span>
                <select
                  className="w-full rounded-input border border-line px-3 py-2 text-sm"
                  value={status ?? ''}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">{t('common.all')}</option>
                  {PLATFORM_ACCOUNT_DISPLAY_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              {showBusinessTypeFilter ? (
                <label className="min-w-0 flex-1 text-sm">
                  <span className="mb-1 block text-ink-muted">
                    {t('platformAdmin.accounts.businessType')}
                  </span>
                  <select
                    className="w-full rounded-input border border-line px-3 py-2 text-sm"
                    value={businessTypeParam ?? ''}
                    onChange={(event) => setBusinessType(event.target.value)}
                  >
                    <option value="">{t('common.all')}</option>
                    {BUSINESS_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {BUSINESS_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t('platformAdmin.accounts.emptyTitle')}
                description={t('platformAdmin.accounts.emptyHint')}
              />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:-mx-5">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="border-b border-line text-xs text-ink-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium sm:px-5">{t('platformAdmin.accounts.colUser')}</th>
                      <th className="px-4 py-2 font-medium sm:px-5">{t('platformAdmin.accounts.colAccount')}</th>
                      <th className="px-4 py-2 font-medium sm:px-5">{t('platformAdmin.accounts.colType')}</th>
                      <th className="px-4 py-2 font-medium sm:px-5">
                        {t('platformAdmin.accounts.businessType')}
                      </th>
                      <th className="px-4 py-2 font-medium sm:px-5">{t('common.status')}</th>
                      <th className="px-4 py-2 font-medium sm:px-5">{t('platformAdmin.accounts.colPlan')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 sm:px-5">
                          <Link to={accountHref(row)} className="block min-w-0 hover:underline">
                            <span className="block truncate font-medium text-ink">{row.ownerName}</span>
                            {row.ownerEmail ? (
                              <span className="block truncate text-xs text-ink-muted">{row.ownerEmail}</span>
                            ) : null}
                          </Link>
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <Link to={accountHref(row)} className="truncate hover:underline">
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-muted sm:px-5">
                          {row.accountType === WorkspaceType.PERSONAL
                            ? t('platformAdmin.hub.personal')
                            : t('platformAdmin.hub.business')}
                        </td>
                        <td className="px-4 py-3 text-ink-muted sm:px-5">
                          {row.businessType ? BUSINESS_TYPE_LABELS[row.businessType] : '—'}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <Badge tone={statusTone(row.status)}>
                            {PLATFORM_ACCOUNT_DISPLAY_STATUS_LABELS[row.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-ink-muted sm:px-5">{row.planName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}
