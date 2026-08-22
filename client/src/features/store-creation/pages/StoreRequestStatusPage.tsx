import {
  STORE_CREATION_STATUS_LABELS,
  formatStoreCreationDate,
  type StoreCreationRequestStatus,
} from '@furniture-erp/shared';
import { CheckCircle2, Clock, Loader2, LogIn, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ROUTES } from '@/routes/paths';

import { usePublicStoreRequest } from '../hooks/use-store-creation';

const STATUS_TONE: Record<StoreCreationRequestStatus, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const STATUS_ICON = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export function StoreRequestStatusPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePublicStoreRequest(id);

  const request = query.data?.request;

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
        {query.isPending ? (
          <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Ariza holati yuklanmoqda…
          </p>
        ) : query.isError || !request ? (
          <ErrorState
            title="Ariza topilmadi"
            message="Havola eskirgan yoki noto‘g‘ri. Yangi ariza yuborishingiz mumkin."
            retryLabel="Qayta urinish"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : (
          <StatusBody
            status={request.status}
            storeName={request.storeName}
            rejectionReason={request.rejectionReason}
            createdAt={request.createdAt}
          />
        )}
      </div>
    </main>
  );
}

function StatusBody({
  status,
  storeName,
  rejectionReason,
  createdAt,
}: {
  status: StoreCreationRequestStatus;
  storeName: string;
  rejectionReason: string | null;
  createdAt: string;
}) {
  const Icon = STATUS_ICON[status];
  const isPending = status === 'PENDING';
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  return (
    <div className="text-center">
      <div
        className={`mx-auto flex size-12 items-center justify-center rounded-card ${
          isApproved ? 'bg-success-50 text-success-700' : isRejected ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-700'
        }`}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-ink">
        {isPending ? 'Arizangiz yuborildi' : isApproved ? 'Arizangiz qabul qilindi' : 'Arizangiz rad etildi'}
      </h1>
      {isPending ? (
        <p className="mt-2 text-sm text-ink-muted">
          Do&apos;kon ochish so&apos;rovingiz Platform Admin tomonidan ko&apos;rib chiqiladi.
        </p>
      ) : isApproved ? (
        <p className="mt-2 text-sm text-ink-muted">
          {storeName} ochildi. Login va parolingiz bilan kiring.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Faol do&apos;kon ochilmadi.</p>
      )}

      <dl className="mt-6 space-y-3 text-left text-sm">
        <Row label="Do'kon" value={storeName} />
        <Row label="Sana" value={formatStoreCreationDate(createdAt)} />
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Status</dt>
          <dd>
            <Badge tone={STATUS_TONE[status]}>{STORE_CREATION_STATUS_LABELS[status]}</Badge>
          </dd>
        </div>
        {isRejected && rejectionReason ? (
          <div>
            <dt className="text-ink-muted">Rad etish sababi</dt>
            <dd className="mt-1 rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-danger-700">
              {rejectionReason}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-col gap-2">
        {isApproved ? (
          <Link
            to={ROUTES.login}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Kirish
          </Link>
        ) : (
          <Link to={ROUTES.login} className="text-sm font-medium text-brand-700 hover:underline">
            Kirish sahifasiga qaytish
          </Link>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
