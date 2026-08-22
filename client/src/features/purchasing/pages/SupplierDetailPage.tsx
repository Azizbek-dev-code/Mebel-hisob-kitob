import {
  PAYMENT_METHOD_LABELS,
  PurchaseStatus,
  SupplierStatus,
  UserRole,
} from '@furniture-erp/shared';
import { ArrowLeft, Pencil, ShoppingBag, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { formatDate, formatMoney } from '@/utils/format';
import {
  purchasePaymentStatusLabel,
  purchasePaymentStatusTone,
} from '@/utils/purchasing';

import { SupplierFormDialog } from '../components/SupplierFormDialog';
import {
  useArchiveSupplier,
  useRestoreSupplier,
  useSupplierDetail,
} from '../hooks/use-purchasing';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message || 'Qayta urinib ko‘ring.';
  return 'Qayta urinib ko‘ring.';
}

function canArchiveRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function SupplierDetailPage() {
  const { id = '' } = useParams();
  const detail = useSupplierDetail(id);
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canArchiveRole(currentUser?.role);
  const archiveSupplier = useArchiveSupplier();
  const restoreSupplier = useRestoreSupplier();
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supplier = detail.data;

  async function handleArchive() {
    if (!supplier) return;
    if (!window.confirm(`“${supplier.name}” ni arxivlashni tasdiqlaysizmi?`)) return;
    try {
      await archiveSupplier.mutateAsync(supplier.id);
      setMessage('Yetkazuvchi arxivlandi.');
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function handleRestore() {
    if (!supplier) return;
    try {
      await restoreSupplier.mutateAsync(supplier.id);
      setMessage('Yetkazuvchi tiklandi.');
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="supplier-detail-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to={ROUTES.suppliers}
              className="mb-2 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              Yetkazuvchilar
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {supplier?.name ?? 'Yetkazuvchi'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{supplier?.phone ?? '—'}</p>
            {supplier?.notes ? (
              <p className="mt-2 max-w-xl text-sm text-ink-soft">{supplier.notes}</p>
            ) : null}
            {supplier ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {supplier.outstandingDebt > 0 ? (
                  <Badge tone="warning">Qarzimiz bor</Badge>
                ) : (
                  <Badge tone="success">Qarzi yo‘q</Badge>
                )}
                {supplier.status === SupplierStatus.ARCHIVED ? (
                  <Badge tone="neutral">Arxiv</Badge>
                ) : (
                  <Badge tone="success">Faol</Badge>
                )}
              </div>
            ) : null}
          </div>
          {supplier ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`${ROUTES.purchaseNew}?supplierId=${supplier.id}`}
                className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Yangi kirim
              </Link>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <Pencil className="size-4" />
                Tahrirlash
              </button>
              {isAdmin ? (
                supplier.status === SupplierStatus.ACTIVE ? (
                  <button
                    type="button"
                    onClick={() => void handleArchive()}
                    className="rounded-input border border-line px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
                  >
                    Arxivlash
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRestore()}
                    className="rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
                  >
                    Tiklash
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? (
          <p className="rounded-input border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
            {message}
          </p>
        ) : null}

        {detail.isError ? (
          <ErrorState
            title="Yetkazuvchi topilmadi"
            message={errorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.isLoading || !supplier ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Jami kirim"
                value={formatMoney(supplier.financial.totalPurchases)}
                context="Faol kirimlar"
                icon={ShoppingBag}
              />
              <KpiCard
                title="To‘langan"
                value={formatMoney(supplier.financial.totalPaid)}
                context="Yig‘ilgan to‘lovlar"
                icon={Wallet}
                tone="success"
              />
              <KpiCard
                title="Qolgan qarz"
                value={formatMoney(supplier.financial.outstandingDebt)}
                context="Ochiq qoldiq"
                icon={Wallet}
                tone="warning"
              />
              <KpiCard
                title="Ochiq kirimlar"
                value={String(supplier.financial.openPurchaseCount)}
                context={`${supplier.financial.cancelledPurchaseCount} bekor`}
                icon={ShoppingBag}
              />
            </div>

            <SectionCard title="Kirimlar tarixi" description="Bekor qilinganlar ham ko‘rinadi">
              {supplier.purchases.length === 0 ? (
                <p className="text-sm text-ink-muted">Hali kirim yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">№</th>
                        <th className="px-2 py-2 font-medium">Sana</th>
                        <th className="px-2 py-2 font-medium">Jami</th>
                        <th className="px-2 py-2 font-medium">To‘langan</th>
                        <th className="px-2 py-2 font-medium">Qoldiq</th>
                        <th className="px-2 py-2 font-medium">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.purchases.map((purchase) => (
                        <tr
                          key={purchase.purchaseId}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-2 py-2">
                            <Link
                              to={ROUTES.purchaseDetail(purchase.purchaseId)}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              #{purchase.purchaseNumber}
                            </Link>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatDate(purchase.purchaseDate)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(purchase.totalCost)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(purchase.paidAmount)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(purchase.remainingAmount)}
                          </td>
                          <td className="px-2 py-2">
                            {purchase.status === PurchaseStatus.CANCELLED ? (
                              <Badge tone="danger">Bekor</Badge>
                            ) : (
                              <Badge tone={purchasePaymentStatusTone(purchase.paymentStatus)}>
                                {purchasePaymentStatusLabel(purchase.paymentStatus)}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="To‘lovlar tarixi" description="Yetkazuvchiga yozilgan to‘lovlar">
              {supplier.payments.length === 0 ? (
                <p className="text-sm text-ink-muted">To‘lov yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Sana</th>
                        <th className="px-2 py-2 font-medium">Kirim</th>
                        <th className="px-2 py-2 font-medium">Summa</th>
                        <th className="px-2 py-2 font-medium">Usul</th>
                        <th className="px-2 py-2 font-medium">Kim</th>
                        <th className="px-2 py-2 font-medium">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.payments.map((p) => (
                        <tr key={p.paymentId} className="border-b border-line last:border-0">
                          <td className="px-2 py-2 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                          <td className="px-2 py-2">
                            <Link
                              to={ROUTES.purchaseDetail(p.purchaseId)}
                              className="text-brand-700 hover:underline"
                            >
                              #{p.purchaseNumber}
                            </Link>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">{formatMoney(p.amount)}</td>
                          <td className="px-2 py-2">
                            {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                          </td>
                          <td className="px-2 py-2 text-ink-soft">{p.recordedByName ?? '—'}</td>
                          <td className="px-2 py-2 text-ink-soft">{p.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>

      {supplier ? (
        <SupplierFormDialog
          mode="edit"
          supplier={supplier}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setMessage('Yetkazuvchi yangilandi.');
            void detail.refetch();
          }}
        />
      ) : null}
    </PageContainer>
  );
}
