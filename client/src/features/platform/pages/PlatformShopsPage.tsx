import {
  SUBSCRIPTION_STATUS_LABELS,
  formatStoreCreationDate,
  trialDaysRemaining,
  type PlatformShopSummary,
  type SubscriptionStatus,
} from '@furniture-erp/shared';
import { Ban, Clock, Store } from 'lucide-react';
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

import { usePlatformShops } from '../hooks/use-platform-shops';

export type ShopDirectoryFilter = 'all' | 'active' | 'pending-payment' | 'blocked';

export function PlatformShopsPage({ filter }: { filter: ShopDirectoryFilter }) {
  const list = usePlatformShops();
  const items = (list.data?.items ?? []).filter((shop) => {
    if (filter === 'active') return shop.accessStatus === 'ACTIVE' && shop.isActive;
    if (filter === 'blocked') return shop.accessStatus !== 'ACTIVE';
    if (filter === 'pending-payment') return shop.hasPendingPayment;
    return true;
  });

  const title = "Do'konlar";

  const emptyCopy =
    filter === 'pending-payment'
      ? {
          icon: Clock,
          title: "To'lov kutilayotgan do'kon yo'q",
          description: "PENDING yoki OVERDUE billingi bo'lgan do'konlar shu yerda ko'rinadi.",
        }
      : filter === 'blocked'
        ? {
            icon: Ban,
            title: "Bloklangan do'kon yo'q",
            description: "Faol bo'lmagan do'konlar shu yerda ko'rinadi.",
          }
        : {
            icon: Store,
            title: "Do'kon topilmadi",
            description: "Tasdiqlangan do'konlar shu yerda ko'rinadi.",
          };

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Platformadagi do&apos;konlar. Operatsion ma&apos;lumotlar har bir do&apos;konning o&apos;z ADMIN
          hisobida qoladi.
        </p>
      </div>

      <SegmentedNav
        ariaLabel="Do'kon holati"
        items={[
          { to: ROUTES.platformShops, label: 'Barchasi', end: true },
          { to: ROUTES.platformShopsActive, label: 'Faol' },
          { to: ROUTES.platformShopsPendingPayment, label: "To'lov kutilmoqda" },
          { to: ROUTES.platformShopsBlocked, label: 'Bloklangan' },
        ]}
      />

      <SectionCard title="Ro'yxat">
        {list.isPending && !list.data ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : list.isError ? (
          <ErrorState
            title="Do'konlarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void list.refetch()}
            isRetrying={list.isFetching}
          />
        ) : items.length === 0 ? (
          <EmptyState icon={emptyCopy.icon} title={emptyCopy.title} description={emptyCopy.description} />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((shop) => (
              <ShopRow key={shop.id} shop={shop} />
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function subscriptionTone(status: SubscriptionStatus | null) {
  if (status === 'ACTIVE' || status === 'TRIAL') return 'success' as const;
  if (status === 'EXPIRED' || status === 'BLOCKED') return 'danger' as const;
  if (status === 'PENDING_PAYMENT' || status === 'PAST_DUE') return 'warning' as const;
  return 'neutral' as const;
}

function ShopRow({ shop }: { shop: PlatformShopSummary }) {
  const days = trialDaysRemaining(shop.trialEndsAt);
  const periodLabel =
    shop.subscriptionStatus === 'TRIAL' && days != null
      ? `${days} kun qoldi`
      : shop.currentPeriodEnd
        ? `${formatDate(shop.currentPeriodEnd)} gacha`
        : null;

  return (
    <li>
      <Link
        to={ROUTES.platformShopDetail(shop.id)}
        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{shop.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {[shop.ownerName, shop.ownerPhone ?? shop.phone, shop.planName]
              .filter(Boolean)
              .join(' · ') || 'Manzil kiritilmagan'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {shop.subscriptionStatus ? (
            <Badge tone={subscriptionTone(shop.subscriptionStatus)}>
              {SUBSCRIPTION_STATUS_LABELS[shop.subscriptionStatus]}
            </Badge>
          ) : (
            <Badge tone={shop.accessStatus === 'ACTIVE' ? 'success' : 'danger'}>
              {shop.accessStatus === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
            </Badge>
          )}
          {periodLabel ? <span className="text-xs text-ink-muted">{periodLabel}</span> : null}
          <span className="text-xs text-ink-subtle">{formatStoreCreationDate(shop.createdAt)}</span>
        </div>
      </Link>
    </li>
  );
}
