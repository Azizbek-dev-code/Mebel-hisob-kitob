import {
  STORE_CREATION_STATUS_LABELS,
  StoreCreationRequestStatus,
  applicantFullName,
  formatStoreCreationDate,
  type StoreCreationRequestAdmin,
} from '@furniture-erp/shared';
import { Inbox, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';

import { useStoreRequestList } from '../hooks/use-store-creation';

export function PlatformStoreRequestsPage() {
  const list = useStoreRequestList({ status: StoreCreationRequestStatus.PENDING, pageSize: 50 });
  const items = list.data?.items ?? [];
  const pendingCount = list.data?.pendingCount ?? 0;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">Do&apos;kon so&apos;rovlari</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Yangi do&apos;kon ochish arizalari. Tasdiqlanmaguncha faol do&apos;kon ochilmaydi.
        </p>
      </div>

      <SectionCard
        title="Kutilayotgan so'rovlar"
        action={
          <Badge tone={pendingCount > 0 ? 'warning' : 'neutral'}>
            Yangi do&apos;kon ochish so&apos;rovi: {pendingCount}
          </Badge>
        }
      >
        {list.isPending && !list.data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : list.isError ? (
          <ErrorState
            title="So'rovlarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void list.refetch()}
            isRetrying={list.isFetching}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Kutilayotgan ariza yo'q"
            description="Yangi do'kon ochish so'rovlari shu yerda ko'rinadi."
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <RequestRow key={item.id} request={item} />
            ))}
          </ul>
        )}
        {list.isFetching && list.data ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Yangilanmoqda…
          </p>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}

function RequestRow({ request }: { request: StoreCreationRequestAdmin }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <dl className="grid min-w-0 flex-1 grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <Row label="Do'kon" value={request.storeName} />
        <Row
          label="Ariza beruvchi"
          value={applicantFullName(request.applicantFirstName, request.applicantLastName)}
        />
        <Row label="Telefon" value={request.phone} />
        <Row label="Hudud" value={`${request.region} / ${request.district}`} />
        <Row label="Manzil" value={request.address} />
        <Row label="Sana" value={formatStoreCreationDate(request.createdAt)} />
        <div className="flex items-center gap-2 sm:col-span-2">
          <dt className="text-ink-muted">Status</dt>
          <dd>
            <Badge tone="warning">{STORE_CREATION_STATUS_LABELS[request.status]}</Badge>
          </dd>
        </div>
      </dl>
      <Link
        to={ROUTES.platformStoreRequestDetail(request.id)}
        className="inline-flex shrink-0 items-center justify-center rounded-input border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-hover hover:text-ink"
      >
        Ko&apos;rish
      </Link>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="truncate font-medium text-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}
