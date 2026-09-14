import {
  PersonalEntryType,
  PersonalRecurringDueState,
  PersonalRecurringFrequency,
  formatMoney,
} from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { todayInputDate } from '@/features/expenses/utils/date';
import { usePersonalCategories, usePersonalWallets } from '@/features/personal/ledger/hooks/use-personal-ledger';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import {
  useAcknowledgePersonalRecurring,
  useCreatePersonalRecurring,
  useLogPersonalRecurring,
  usePersonalRecurring,
  useUpdatePersonalRecurring,
} from '../hooks/use-personal-lifecycle';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

const FREQUENCIES = [
  PersonalRecurringFrequency.MONTHLY,
  PersonalRecurringFrequency.WEEKLY,
  PersonalRecurringFrequency.YEARLY,
  PersonalRecurringFrequency.DAILY,
  PersonalRecurringFrequency.CUSTOM,
] as const;

export function PersonalRecurringPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const recurring = usePersonalRecurring();
  const wallets = usePersonalWallets();
  const categories = usePersonalCategories();
  const createRule = useCreatePersonalRecurring();
  const updateRule = useUpdatePersonalRecurring();
  const acknowledge = useAcknowledgePersonalRecurring();
  const logRule = useLogPersonalRecurring();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<typeof PersonalEntryType.EXPENSE | typeof PersonalEntryType.INCOME>(
    PersonalEntryType.EXPENSE,
  );
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]>(PersonalRecurringFrequency.MONTHLY);
  const [nextDueAt, setNextDueAt] = useState(todayInputDate);
  const [intervalDays, setIntervalDays] = useState(14);
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeWallets = (wallets.data?.items ?? []).filter((item) => !item.isArchived);
  const matchingCategories = (categories.data?.items ?? []).filter(
    (item) => item.isActive && item.kind === type,
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createRule.mutateAsync({
        name,
        type,
        amountSom: amount,
        frequency,
        nextDueAt,
        intervalDays: frequency === PersonalRecurringFrequency.CUSTOM ? intervalDays : null,
        walletId: walletId || null,
        categoryId: categoryId || null,
      });
      setName('');
      setAmount(0);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  const items = recurring.data?.items ?? [];
  const active = items.filter((item) => item.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.recurring')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.recurringHint')}</p>
        <p className="mt-1 text-xs text-ink-muted">{t('personal.recurringNoAuto')}</p>
      </div>

      {recurring.isPending && !recurring.data ? (
        <Skeleton className="h-32 w-full" />
      ) : recurring.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void recurring.refetch()}
        />
      ) : active.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.noRecurring')}</p>
      ) : (
        <ul className="space-y-3">
          {active.map((rule) => (
            <li key={rule.id} className="space-y-2 rounded-panel border border-line bg-surface px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{rule.name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatMoney(rule.amountSom)} · {t(`personal.recurringFreq.${rule.frequency}`)} ·{' '}
                    {t('personal.nextDue')}: {formatDate(rule.nextDueAt)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink">
                    {rule.dueState === PersonalRecurringDueState.OVERDUE
                      ? t('personal.recurringOverdue')
                      : rule.dueState === PersonalRecurringDueState.DUE
                        ? t('personal.recurringDue')
                        : t('personal.recurringLater')}
                  </p>
                </div>
                {canWrite ? (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-ink"
                    onClick={() => void updateRule.mutateAsync({ id: rule.id, body: { isActive: false } })}
                  >
                    {t('personal.archive')}
                  </button>
                ) : null}
              </div>
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs"
                    onClick={() => void acknowledge.mutateAsync(rule.id)}
                  >
                    {t('personal.recurringSkip')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs"
                    disabled={!rule.wallet || !rule.category}
                    onClick={() => void logRule.mutateAsync(rule.id)}
                  >
                    {t('personal.recurringLog')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={(event) => void onCreate(event)} className="space-y-3 rounded-panel border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">{t('personal.addRecurring')}</h2>
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('personal.recurringName')} />
          <MoneyField label={t('common.amount')} value={amount} onChange={setAmount} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipClass(type === PersonalEntryType.EXPENSE)} onClick={() => setType(PersonalEntryType.EXPENSE)}>
              {t('personal.tabExpense')}
            </button>
            <button type="button" className={chipClass(type === PersonalEntryType.INCOME)} onClick={() => setType(PersonalEntryType.INCOME)}>
              {t('personal.tabIncome')}
            </button>
          </div>
          <select className={fieldClass} value={frequency} onChange={(event) => setFrequency(event.target.value as (typeof FREQUENCIES)[number])}>
            {FREQUENCIES.map((item) => (
              <option key={item} value={item}>
                {t(`personal.recurringFreq.${item}`)}
              </option>
            ))}
          </select>
          {frequency === PersonalRecurringFrequency.CUSTOM ? (
            <input
              className={fieldClass}
              type="number"
              min={1}
              value={intervalDays}
              onChange={(event) => setIntervalDays(Number(event.target.value))}
            />
          ) : null}
          <input className={fieldClass} type="date" value={nextDueAt} onChange={(event) => setNextDueAt(event.target.value)} />
          <select className={fieldClass} value={walletId} onChange={(event) => setWalletId(event.target.value)}>
            <option value="">{t('personal.walletOptional')}</option>
            {activeWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{t('personal.categoryOptional')}</option>
            {matchingCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <button type="submit" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white">
            {t('personal.addRecurring')}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function chipClass(active: boolean) {
  return active
    ? 'rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700'
    : 'rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted';
}
