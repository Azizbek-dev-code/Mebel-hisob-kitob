import {
  PLATFORM_BILLING_STATUS_LABELS,
  SUBSCRIPTION_REQUEST_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionRequestStatus,
  formatMoney,
  type SubscriptionRequestDto,
} from '@furniture-erp/shared';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { SegmentedNav } from '@/components/ui/SegmentedNav';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

import { ApproveSubscriptionRequestDialog } from '../components/ApproveSubscriptionRequestDialog';
import { RejectSubscriptionRequestDialog } from '../components/RejectSubscriptionRequestDialog';
import { usePlatformSubscriptionRequests } from '../hooks/use-platform-billing';

type RequestTab = 'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED';

function tone(status: string) {
  if (status === SubscriptionRequestStatus.APPROVED) return 'success' as const;
  if (status === SubscriptionRequestStatus.REJECTED) return 'danger' as const;
  if (status === SubscriptionRequestStatus.PENDING) return 'warning' as const;
  return 'neutral' as const;
}

export function PlatformSubscriptionRequestsPage() {
  const [tab, setTab] = useState<RequestTab>('PENDING');
  const [approving, setApproving] = useState<SubscriptionRequestDto | null>(null);
  const [rejecting, setRejecting] = useState<SubscriptionRequestDto | null>(null);
  const status = tab === 'ALL' ? undefined : tab;
  const requests = usePlatformSubscriptionRequests(status);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Tarif so&apos;rovlari</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Do&apos;konlar tarifni o&apos;zgartirishni so&apos;raganda so&apos;rov shu yerda chiqadi. Qabul qilish
          to&apos;lovni tasdiqlaydi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['PENDING', 'Kutilayotgan'],
            ['ALL', 'Barchasi'],
            ['APPROVED', 'Qabul qilingan'],
            ['REJECTED', 'Rad etilgan'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-input px-3 py-1.5 text-sm ${
              tab === id ? 'bg-brand-600 text-white' : 'border border-line hover:bg-surface-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SegmentedNav
        ariaLabel="Billing bo'limlari"
        items={[
          { to: ROUTES.platformSubscriptionRequests, label: "Tarif so'rovlari", end: true },
          { to: ROUTES.platformPayments, label: "To'lovlar" },
          { to: ROUTES.platformShops, label: "Do'konlar" },
        ]}
      />

      <SectionCard title="Ro'yxat">
        {requests.isPending && !requests.data ? (
          <Skeleton className="h-24 w-full" />
        ) : requests.isError ? (
          <ErrorState
            title="So'rovlarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void requests.refetch()}
            isRetrying={requests.isFetching}
          />
        ) : (requests.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={Inbox}
            title="So'rov yo'q"
            description="Do'kon Tarifni o'zgartirish bosganda so'rov shu yerda chiqadi."
          />
        ) : (
          <ul className="divide-y divide-line">
            {requests.data?.items.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={ROUTES.platformShopDetail(row.storeId)}
                    className="font-medium text-ink hover:underline"
                  >
                    {row.storeName}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {[row.ownerName, row.ownerPhone, row.ownerEmail].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Hozirgi: {row.currentPlanName ?? '—'}
                    {row.currentStatus ? ` (${SUBSCRIPTION_STATUS_LABELS[row.currentStatus]})` : ''}
                    {' → '}
                    So&apos;ralgan: {row.planName} · {formatMoney(row.requestedPriceSnapshot)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDate(row.requestedAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1">
                  <Badge tone={tone(row.status)}>{SUBSCRIPTION_REQUEST_STATUS_LABELS[row.status]}</Badge>
                  {row.status === SubscriptionRequestStatus.PENDING ? (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => setApproving(row)}
                      >
                        Qabul qilish
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-danger-700 hover:underline"
                        onClick={() => setRejecting(row)}
                      >
                        Rad etish
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ApproveSubscriptionRequestDialog request={approving} onClose={() => setApproving(null)} />
      <RejectSubscriptionRequestDialog request={rejecting} onClose={() => setRejecting(null)} />
    </PageContainer>
  );
}
