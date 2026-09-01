import {
  CustomerStatus,
  PAYMENT_METHOD_LABELS,
  SaleStatus,
  UserRole,
  type CustomerDetail,
} from '@furniture-erp/shared';
import { AlertTriangle, ArrowLeft, Pencil, ShoppingBag, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function errorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiClientError) return error.message || t('common.retry');
  return t('common.retry');
}

function debtTone(status: CustomerDetail['debtStatus']): 'success' | 'warning' | 'danger' {
  if (status === 'OVERDUE') return 'danger';
  if (status === 'IN_DEBT') return 'warning';
  return 'success';
}

function canArchiveRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const detail = useCustomerDetail(id);
  const { data: currentUser } = useCurrentUser();
  const isAdmin = canArchiveRole(currentUser?.role);
  const archiveCustomer = useArchiveCustomer();
  const restoreCustomer = useRestoreCustomer();
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const customer = detail.data;

  function debtLabel(status: CustomerDetail['debtStatus']): string {
    if (status === 'OVERDUE') return t('customers.overdue');
    if (status === 'IN_DEBT') return t('customers.debtor');
    return t('customers.clear');
  }

  function installmentLabel(status: string): string {
    if (status === 'PAID') return t('status.payment.PAID');
    if (status === 'PARTIAL') return t('customers.partial');
    if (status === 'OVERDUE') return t('customers.overdue');
    return t('status.payment.UNPAID');
  }

  async function handleArchive() {
    if (!customer) return;
    if (!window.confirm(t('customers.archiveConfirm', { name: customer.fullName }))) return;
    try {
      await archiveCustomer.mutateAsync(customer.id);
      setMessage(t('customers.archivedShort'));
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error, t));
    }
  }

  async function handleRestore() {
    if (!customer) return;
    try {
      await restoreCustomer.mutateAsync(customer.id);
      setMessage(t('customers.restoredShort'));
      void detail.refetch();
    } catch (error) {
      setMessage(errorMessage(error, t));
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
              {t('customers.title')}
            </Link>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {customer?.fullName ?? t('customers.singular')}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{customer?.phone ?? '—'}</p>
            {customer?.notes ? (
              <p className="mt-2 max-w-xl text-sm text-ink-soft">{customer.notes}</p>
            ) : null}
            {customer ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone={debtTone(customer.debtStatus)}>{debtLabel(customer.debtStatus)}</Badge>
                {customer.status === CustomerStatus.ARCHIVED ? (
                  <Badge tone="neutral">{t('common.archived')}</Badge>
                ) : (
                  <Badge tone="success">{t('common.active')}</Badge>
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
                {t('common.edit')}
              </button>
              {isAdmin ? (
                customer.status === CustomerStatus.ACTIVE ? (
                  <button
                    type="button"
                    onClick={() => void handleArchive()}
                    className="rounded-input border border-line px-3 py-2 text-sm text-danger-700 hover:bg-danger-50"
                  >
                    {t('customers.archiveAction')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleRestore()}
                    className="rounded-input border border-line px-3 py-2 text-sm hover:bg-surface-hover"
                  >
                    {t('common.restore')}
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
            title={t('customers.notFound')}
            message={errorMessage(detail.error, t)}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.isLoading || !customer ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title={t('customers.totalPurchases')}
                value={formatMoney(customer.financial.totalPurchases)}
                context={t('customers.totalPurchasesHint')}
                icon={ShoppingBag}
              />
              <KpiCard
                title={t('customers.paid')}
                value={formatMoney(customer.financial.totalPaid)}
                context={t('customers.paidHint')}
                icon={Wallet}
                tone="success"
              />
              <KpiCard
                title={t('customers.remainingDebt')}
                value={formatMoney(customer.financial.outstandingDebt)}
                context={t('customers.remainingDebtHint')}
                icon={Wallet}
                tone="warning"
              />
              <KpiCard
                title={t('customers.overdueAmount')}
                value={formatMoney(customer.financial.overdueAmount)}
                context={t('customers.overdueAmountHint')}
                icon={AlertTriangle}
                tone="danger"
              />
            </div>

            <SectionCard
              title={t('customers.salesHistory')}
              description={t('customers.salesHistoryHint')}
            >
              {customer.sales.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('customers.noSales')}</p>
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
                              <Badge tone="danger">{t('status.sale.CANCELLED')}</Badge>
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

            <SectionCard
              title={t('customers.paymentsHistory')}
              description={t('customers.paymentsHistoryHint')}
            >
              {customer.payments.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('customers.noPayments')}</p>
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

            <SectionCard
              title={t('customers.installments')}
              description={t('customers.installmentsHint')}
            >
              {customer.installments.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('customers.noInstallments')}</p>
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
            setMessage(t('customers.updatedMessage'));
            void detail.refetch();
          }}
        />
      ) : null}
    </PageContainer>
  );
}
