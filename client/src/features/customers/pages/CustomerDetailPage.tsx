import {
  CustomerStatus,
  PAYMENT_METHOD_LABELS,
  SaleStatus,
  UserRole,
  type CustomerDetail,
} from '@furniture-erp/shared';
import { AlertTriangle, ArrowLeft, Pencil, ShoppingBag, Wallet } from 'lucide-react';
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
import { saleStatusLabel, saleStatusTone } from '@/utils/sales';

import { CustomerFormDialog } from '../components/CustomerFormDialog';
import {
  useArchiveCustomer,
  useCustomerDetail,
  useRestoreCustomer,
} from '../hooks/use-customers';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message || 'Qayta urinib ko‘ring.';
  return 'Qayta urinib ko‘ring.';
}

function debtLabel(status: CustomerDetail['debtStatus']): string {
  if (status === 'OVERDUE') return 'Muddati o‘tgan';
  if (status === 'IN_DEBT') return 'Qarzdor';
  return 'Qarzi yo‘q';
}

function debtTone(status: CustomerDetail['debtStatus']): 'success' | 'warning' | 'danger' {
  if (status === 'OVERDUE') return 'danger';
  if (status === 'IN_DEBT') return 'warning';
  return 'success';
}

function installmentLabel(status: string): string {
  if (status === 'PAID') return 'To‘langan';
  if (status === 'PARTIAL') return 'Qisman to‘langan';
  if (status === 'OVERDUE') return 'Muddati o‘tgan';
  return 'To‘lanmagan';
}

function canArchiveRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const detail = useCustomerDetail(id);
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canArchiveRole(currentUser?.role);
  const archiveCustomer = useArchiveCustomer();
  const restoreCustomer = useRestoreCustomer();
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const customer = detail.data;

  async function handleArchive() {
    if (!customer) return;
    if (!window.confirm(`“${customer.fullName}” ni arxivlashni tasdiqlaysizmi?`)) return;
    try {
      await archiveCustomer.mutateAsync(customer.id);
      setMessage('Mijoz arxivlandi.');
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function handleRestore() {
    if (!customer) return;
    try {
      await restoreCustomer.mutateAsync(customer.id);
      setMessage('Mijoz tiklandi.');
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <PageContainer className="space-y-6">
      <div data-testid="customer-detail-page" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to={ROUTES.customers}
              className="mb-2 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              Mijozlar
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {customer?.fullName ?? 'Mijoz'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{customer?.phone ?? '—'}</p>
            {customer?.notes ? (
              <p className="mt-2 max-w-xl text-sm text-ink-soft">{customer.notes}</p>
            ) : null}
            {customer ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone={debtTone(customer.debtStatus)}>{debtLabel(customer.debtStatus)}</Badge>
                {customer.status === CustomerStatus.ARCHIVED ? (
                  <Badge tone="neutral">Arxiv</Badge>
                ) : (
                  <Badge tone="success">Faol</Badge>
                )}
              </div>
            ) : null}
          </div>
          {customer ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <Pencil className="size-4" />
                Tahrirlash
              </button>
              {isAdmin ? (
                customer.status === CustomerStatus.ACTIVE ? (
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
            title="Mijoz topilmadi"
            message={errorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.isLoading || !customer ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Jami xarid"
                value={formatMoney(customer.financial.totalPurchases)}
                context="Faol sotuvlar"
                icon={ShoppingBag}
              />
              <KpiCard
                title="To‘langan"
                value={formatMoney(customer.financial.totalPaid)}
                context="Yig‘ilgan to‘lovlar"
                icon={Wallet}
                tone="success"
              />
              <KpiCard
                title="Qolgan qarz"
                value={formatMoney(customer.financial.outstandingDebt)}
                context="Ochiq qoldiq"
                icon={Wallet}
                tone="warning"
              />
              <KpiCard
                title="Muddati o‘tgan"
                value={formatMoney(customer.financial.overdueAmount)}
                context="Muddat o‘tgan"
                icon={AlertTriangle}
                tone="danger"
              />
            </div>

            <SectionCard title="Sotuvlar tarixi" description="Bekor qilinganlar ham ko‘rinadi">
              {customer.sales.length === 0 ? (
                <p className="text-sm text-ink-muted">Hali sotuv yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">№</th>
                        <th className="px-2 py-2 font-medium">Sana</th>
                        <th className="px-2 py-2 font-medium">Mahsulotlar</th>
                        <th className="px-2 py-2 font-medium">Jami</th>
                        <th className="px-2 py-2 font-medium">To‘langan</th>
                        <th className="px-2 py-2 font-medium">Qoldiq</th>
                        <th className="px-2 py-2 font-medium">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.sales.map((sale) => (
                        <tr
                          key={sale.saleId}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-2 py-2">
                            <Link
                              to={ROUTES.saleDetail(sale.saleId)}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              #{sale.saleNumber}
                            </Link>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatDate(sale.saleDate)}
                          </td>
                          <td className="px-2 py-2 max-w-[14rem] truncate text-ink-soft">
                            {sale.productSummary || '—'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(sale.totalSalePrice)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(sale.paidAmount)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(sale.remainingAmount)}
                          </td>
                          <td className="px-2 py-2">
                            {sale.status === SaleStatus.CANCELLED ? (
                              <Badge tone="danger">Bekor qilingan</Badge>
                            ) : (
                              <Badge tone={saleStatusTone(sale.status)}>
                                {saleStatusLabel(sale.status)}
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

            <SectionCard title="To‘lovlar tarixi" description="Yozilgan to‘lovlar">
              {customer.payments.length === 0 ? (
                <p className="text-sm text-ink-muted">To‘lov yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Sana</th>
                        <th className="px-2 py-2 font-medium">Sotuv</th>
                        <th className="px-2 py-2 font-medium">Summa</th>
                        <th className="px-2 py-2 font-medium">Usul</th>
                        <th className="px-2 py-2 font-medium">Kim</th>
                        <th className="px-2 py-2 font-medium">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.payments.map((p) => (
                        <tr key={p.paymentId} className="border-b border-line last:border-0">
                          <td className="px-2 py-2 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                          <td className="px-2 py-2">
                            <Link
                              to={ROUTES.saleDetail(p.saleId)}
                              className="text-brand-700 hover:underline"
                            >
                              #{p.saleNumber}
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

            <SectionCard title="Bo‘lib to‘lash / qarz" description="Muddatli to‘lovlar">
              {customer.installments.length === 0 ? (
                <p className="text-sm text-ink-muted">Bo‘lib to‘lash rejalari yo‘q.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr>
                        <th className="px-2 py-2 font-medium">Sotuv</th>
                        <th className="px-2 py-2 font-medium">Asl</th>
                        <th className="px-2 py-2 font-medium">To‘langan</th>
                        <th className="px-2 py-2 font-medium">Qoldiq</th>
                        <th className="px-2 py-2 font-medium">Muddat</th>
                        <th className="px-2 py-2 font-medium">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.installments.map((row) => (
                        <tr
                          key={row.installmentPaymentId}
                          className="border-b border-line last:border-0"
                        >
                          <td className="px-2 py-2">
                            <Link
                              to={ROUTES.saleDetail(row.saleId)}
                              className="text-brand-700 hover:underline"
                            >
                              #{row.saleNumber} · {row.sequence}
                            </Link>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">{formatMoney(row.amount)}</td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(row.paidAmount)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatMoney(row.remainingAmount)}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                          <td className="px-2 py-2">
                            <Badge
                              tone={
                                row.displayStatus === 'OVERDUE'
                                  ? 'danger'
                                  : row.displayStatus === 'PAID'
                                    ? 'success'
                                    : row.displayStatus === 'PARTIAL'
                                      ? 'warning'
                                      : 'neutral'
                              }
                            >
                              {installmentLabel(row.displayStatus)}
                            </Badge>
                          </td>
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

      {customer ? (
        <CustomerFormDialog
          mode="edit"
          customer={customer}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setMessage('Mijoz yangilandi.');
            void detail.refetch();
          }}
        />
      ) : null}
    </PageContainer>
  );
}
