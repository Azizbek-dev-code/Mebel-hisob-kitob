import {
  STORE_CREATION_STATUS_LABELS,
  applicantFullName,
  formatStoreCreationDate,
} from '@furniture-erp/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { ROUTES } from '@/routes/paths';

import {
  useApproveStoreRequest,
  useRejectStoreRequest,
  useStoreRequestDetail,
} from '../hooks/use-store-creation';

export function PlatformStoreRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useStoreRequestDetail(id);
  const approve = useApproveStoreRequest();
  const reject = useRejectStoreRequest();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const request = detail.data?.request;
  const isPending = request?.status === 'PENDING';

  function onConfirmApprove() {
    if (!id) return;
    setActionError(null);
    approve.mutate(id, {
      onSuccess: () => {
        setApproveOpen(false);
        navigate(ROUTES.platformStoreRequests);
      },
      onError: (error) => setActionError(mutationErrorMessage(error)),
    });
  }

  function onConfirmReject() {
    if (!id) return;
    setActionError(null);
    reject.mutate(
      { id, reason },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setReason('');
          navigate(ROUTES.platformStoreRequests);
        },
        onError: (error) => setActionError(mutationErrorMessage(error)),
      },
    );
  }

  return (
    <PageContainer className="space-y-6">
      <div>
        <Link to={ROUTES.platformStoreRequests} className="text-sm font-medium text-brand-700 hover:underline">
          ← Do&apos;kon so&apos;rovlari
        </Link>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">Do&apos;kon ochish so&apos;rovi</h2>
      </div>

      {detail.isPending && !request ? (
        <SectionCard title="Ma'lumot">
          <Skeleton className="h-40 w-full" />
        </SectionCard>
      ) : detail.isError || !request ? (
        <SectionCard title="Xatolik">
          <ErrorState
            title="So'rovni yuklab bo'lmadi"
            message={
              detail.error instanceof ApiClientError && detail.error.isForbidden
                ? "Faqat Platform Admin bu so'rovni ko'ra oladi."
                : "Qayta urinib ko'ring."
            }
            onRetry={() => void detail.refetch()}
            isRetrying={detail.isFetching}
          />
        </SectionCard>
      ) : (
        <SectionCard
          title={request.storeName}
          action={
            <Badge
              tone={
                request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'
              }
            >
              {STORE_CREATION_STATUS_LABELS[request.status]}
            </Badge>
          }
        >
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Detail label="Ariza beruvchi" value={applicantFullName(request.applicantFirstName, request.applicantLastName)} />
            <Detail label="Telefon" value={request.phone} />
            <Detail label="Email" value={request.email} />
            <Detail label="Login" value={request.username} />
            <Detail label="Do'kon" value={request.storeName} />
            <Detail label="Hudud" value={`${request.region}, ${request.district}`} />
            <Detail label="Manzil" value={request.address} />
            <Detail label="Submitted" value={formatStoreCreationDate(request.createdAt)} />
            {request.rejectionReason ? (
              <Detail label="Rad etish sababi" value={request.rejectionReason} />
            ) : null}
          </dl>

          {actionError ? (
            <p role="alert" className="mt-4 text-sm text-danger-700">
              {actionError}
            </p>
          ) : null}

          {isPending ? (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="inline-flex items-center justify-center rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Qabul qilish
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center justify-center rounded-input border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover"
              >
                Rad etish
              </button>
            </div>
          ) : null}
        </SectionCard>
      )}

      <Dialog
        open={approveOpen}
        title="Do'konni ochishni tasdiqlaysizmi?"
        description="Tasdiqlangandan so'ng faol do'kon va ADMIN hisobi yaratiladi."
        onClose={() => setApproveOpen(false)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setApproveOpen(false)}
            className="rounded-input border border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirmApprove}
            disabled={approve.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {approve.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Qabul qilish
          </button>
        </div>
      </Dialog>

      <Dialog
        open={rejectOpen}
        title="Rad etish sababi"
        description="Sababsiz rad etib bo'lmaydi. Faol do'kon ochilmaydi."
        onClose={() => setRejectOpen(false)}
      >
        <label htmlFor="rejection-reason" className="block text-sm font-medium text-ink-soft">
          Rad etish sababi
        </label>
        <textarea
          id="rejection-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          className="mt-1.5 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setRejectOpen(false)}
            className="rounded-input border border-line-strong px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={onConfirmReject}
            disabled={reject.isPending || reason.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 rounded-input bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-60"
          >
            {reject.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Rad etish
          </button>
        </div>
      </Dialog>
    </PageContainer>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}
