import {
  PersonalCategoryKind,
  PersonalEntryType,
  formatMoney,
  type PersonalEntryDto,
} from '@furniture-erp/shared';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';
import { todayInputDate } from '@/features/expenses/utils/date';
import { formatDate } from '@/utils/format';

import {
  entryQuery,
  useCancelPersonalEntry,
  useCreatePersonalEntry,
  usePersonalCategories,
  usePersonalEntries,
  usePersonalWallets,
} from '../hooks/use-personal-ledger';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalEntriesPage({ type }: { type: PersonalEntryType }) {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const isIncome = type === PersonalEntryType.INCOME;
  const title = isIncome ? t('personal.income') : t('personal.expenses');
  const entries = usePersonalEntries(entryQuery(type));
  const wallets = usePersonalWallets();
  const categories = usePersonalCategories(
    isIncome ? PersonalCategoryKind.INCOME : PersonalCategoryKind.EXPENSE,
  );
  const createEntry = useCreatePersonalEntry();
  const cancelEntry = useCancelPersonalEntry();

  const activeWallets = useMemo(
    () => (wallets.data?.items ?? []).filter((wallet) => !wallet.isArchived),
    [wallets.data],
  );
  const activeCategories = useMemo(
    () => (categories.data?.items ?? []).filter((category) => category.isActive),
    [categories.data],
  );

  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayInputDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createEntry.mutateAsync({
        type,
        walletId: walletId || activeWallets[0]?.id || '',
        categoryId: categoryId || activeCategories[0]?.id || '',
        amount,
        occurredAt,
        note: note.trim() || null,
      });
      setAmount(0);
      setNote('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isIncome ? t('personal.incomeHint') : t('personal.expenseHint')}
        </p>
      </div>

      {entries.isPending && !entries.data ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void entries.refetch()}
        />
      ) : (
        <ul className="space-y-2">
          {(entries.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">{t('personal.noEntries')}</p>
          ) : (
            entries.data?.items.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                canWrite={canWrite}
                onCancel={() => cancelEntry.mutate(entry.id)}
              />
            ))
          )}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">{t('personal.addEntry')}</h2>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <select
            value={walletId || activeWallets[0]?.id || ''}
            onChange={(event) => setWalletId(event.target.value)}
            className={fieldClass}
          >
            {activeWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
          <select
            value={categoryId || activeCategories[0]?.id || ''}
            onChange={(event) => setCategoryId(event.target.value)}
            className={fieldClass}
          >
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <MoneyField label={t('common.amount')} value={amount} onChange={setAmount} />
          <input
            type="date"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className={fieldClass}
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('personal.note')}
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={createEntry.isPending}
            className="rounded-input bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {t('common.save')}
          </button>
        </form>
      ) : (
        <p className="text-sm text-danger-700">{t('personal.trialEnded')}</p>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  canWrite,
  onCancel,
}: {
  entry: PersonalEntryDto;
  canWrite: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const cancelled = entry.status === 'CANCELLED';
  return (
    <li className="flex items-center justify-between gap-3 rounded-panel border border-line bg-surface px-4 py-3 text-sm shadow-card">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{entry.category.name}</p>
        <p className="text-xs text-ink-muted">
          {entry.wallet.name} · {formatDate(entry.occurredAt)}
          {cancelled ? ` · ${t('personal.cancelled')}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={cancelled ? 'text-ink-muted line-through' : 'font-semibold text-ink'}>
          {formatMoney(entry.amount)}
        </span>
        {canWrite && !cancelled ? (
          <button type="button" className="text-xs text-danger-700 hover:underline" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        ) : null}
      </div>
    </li>
  );
}
