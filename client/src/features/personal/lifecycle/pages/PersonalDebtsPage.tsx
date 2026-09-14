import { PersonalDebtDirection, PersonalDebtStatus, formatMoney } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { todayInputDate } from '@/features/expenses/utils/date';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import {
  useCreatePersonalDebt,
  usePayPersonalDebt,
  usePersonalDebts,
  useUpdatePersonalDebt,
} from '../hooks/use-personal-lifecycle';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalDebtsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const debts = usePersonalDebts();
  const createDebt = useCreatePersonalDebt();
  const updateDebt = useUpdatePersonalDebt();
  const payDebt = usePayPersonalDebt();
  const [direction, setDirection] = useState<(typeof PersonalDebtDirection)[keyof typeof PersonalDebtDirection]>(
    PersonalDebtDirection.LENT,
  );
  const [personName, setPersonName] = useState('');
  const [principal, setPrincipal] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayInputDate);
  const [dueAt, setDueAt] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payId, setPayId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createDebt.mutateAsync({
        direction,
        personName,
        principalSom: principal,
        occurredAt,
        dueAt: dueAt || null,
      });
      setPersonName('');
      setPrincipal(0);
      setDueAt('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  async function onPay(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const id = payId || debts.data?.items.find((item) => item.status !== PersonalDebtStatus.PAID)?.id;
    if (!id) return;
    try {
      await payDebt.mutateAsync({
        id,
        body: { amountSom: payAmount, occurredAt: todayInputDate() },
      });
      setPayAmount(0);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  const items = (debts.data?.items ?? []).filter((item) => !item.isArchived);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.debts')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.debtsHint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label={t('personal.lentOutstanding')} value={formatMoney(debts.data?.lentOutstandingSom ?? 0)} />
        <Kpi label={t('personal.borrowedOutstanding')} value={formatMoney(debts.data?.borrowedOutstandingSom ?? 0)} />
      </div>

      {debts.isPending && !debts.data ? (
        <Skeleton className="h-32 w-full" />
      ) : debts.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void debts.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.noDebts')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((debt) => (
            <li key={debt.id} className="space-y-1 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{debt.personName}</p>
                  <p className="text-xs text-ink-muted">
                    {t(`personal.debtDirection.${debt.direction}`)} · {formatMoney(debt.remainingSom)} /{' '}
                    {formatMoney(debt.principalSom)}
                    {debt.dueAt ? ` · ${formatDate(debt.dueAt)}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink">{t(`personal.debtStatus.${debt.status}`)}</p>
                </div>
                {canWrite && debt.status !== PersonalDebtStatus.PAID ? (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-ink"
                    onClick={() => void updateDebt.mutateAsync({ id: debt.id, body: { isArchived: true } })}
                  >
                    {t('personal.archive')}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <>
          <form onSubmit={(event) => void onCreate(event)} className="space-y-3 rounded-panel border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">{t('personal.addDebt')}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chipClass(direction === PersonalDebtDirection.LENT)}
                onClick={() => setDirection(PersonalDebtDirection.LENT)}
              >
                {t('personal.debtDirection.LENT')}
              </button>
              <button
                type="button"
                className={chipClass(direction === PersonalDebtDirection.BORROWED)}
                onClick={() => setDirection(PersonalDebtDirection.BORROWED)}
              >
                {t('personal.debtDirection.BORROWED')}
              </button>
            </div>
            <input className={fieldClass} value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder={t('personal.debtPerson')} />
            <MoneyField label={t('common.amount')} value={principal} onChange={setPrincipal} />
            <input className={fieldClass} type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
            <input className={fieldClass} type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            {error ? <p className="text-sm text-danger-700">{error}</p> : null}
            <button type="submit" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white">
              {t('personal.addDebt')}
            </button>
          </form>

          {items.some((item) => item.status !== PersonalDebtStatus.PAID) ? (
            <form onSubmit={(event) => void onPay(event)} className="space-y-3 rounded-panel border border-line bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">{t('personal.addDebtPayment')}</h2>
              <p className="text-xs text-ink-muted">{t('personal.debtPayHint')}</p>
              <select className={fieldClass} value={payId} onChange={(event) => setPayId(event.target.value)}>
                {items
                  .filter((item) => item.status !== PersonalDebtStatus.PAID)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.personName} · {formatMoney(item.remainingSom)}
                    </option>
                  ))}
              </select>
              <MoneyField label={t('common.amount')} value={payAmount} onChange={setPayAmount} />
              <button type="submit" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white">
                {t('personal.addDebtPayment')}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function chipClass(active: boolean) {
  return active
    ? 'rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700'
    : 'rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted';
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-ink">{value}</p>
    </div>
  );
}
