import {
  PersonalCategoryKind,
  PersonalEntryType,
  formatMoney,
  type PersonalWalletDto,
} from '@furniture-erp/shared';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { todayInputDate } from '@/features/expenses/utils/date';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

import {
  useCreatePersonalEntry,
  useCreatePersonalTransfer,
  usePersonalCategories,
  usePersonalWallets,
} from '../hooks/use-personal-ledger';
import { CategoryPicker } from './CategoryPicker';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500';

type SheetTab = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export function AddMoneySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SheetTab | null>(null);
  const wallets = usePersonalWallets({ enabled: open });
  const categories = usePersonalCategories(
    tab === 'TRANSFER' || tab == null
      ? undefined
      : tab === 'INCOME'
        ? PersonalCategoryKind.INCOME
        : PersonalCategoryKind.EXPENSE,
    { enabled: open },
  );
  const createEntry = useCreatePersonalEntry();
  const createTransfer = useCreatePersonalTransfer();

  const activeWallets = useMemo(
    () => (wallets.data?.items ?? []).filter((wallet) => !wallet.isArchived),
    [wallets.data],
  );
  const activeCategories = useMemo(
    () =>
      (categories.data?.items ?? []).filter(
        (category) =>
          category.isActive &&
          (tab === 'TRANSFER' ||
            category.kind === (tab === 'INCOME' ? PersonalCategoryKind.INCOME : PersonalCategoryKind.EXPENSE)),
      ),
    [categories.data, tab],
  );

  const [walletId, setWalletId] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState(0);
  const [occurredAt, setOccurredAt] = useState(todayInputDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(null);
    setAmount(0);
    setNote('');
    setOccurredAt(todayInputDate());
    setError(null);
    setWalletId('');
    setFromWalletId('');
    setToWalletId('');
    setCategoryId('');
  }, [open]);

  const selectedWalletId = walletId || activeWallets[0]?.id || '';
  const selectedFrom = fromWalletId || activeWallets[0]?.id || '';
  const selectedTo =
    toWalletId && toWalletId !== selectedFrom
      ? toWalletId
      : (activeWallets.find((wallet) => wallet.id !== selectedFrom)?.id ?? '');
  const selectedCategoryId = categoryId || activeCategories[0]?.id || '';
  const pending = createEntry.isPending || createTransfer.isPending;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (tab === 'TRANSFER') {
        if (!selectedFrom || !selectedTo) {
          setError(t('personal.needTwoWallets'));
          return;
        }
        await createTransfer.mutateAsync({
          fromWalletId: selectedFrom,
          toWalletId: selectedTo,
          amount,
          occurredAt,
          note: note.trim() || null,
        });
      } else {
        await createEntry.mutateAsync({
          type: tab === 'INCOME' ? PersonalEntryType.INCOME : PersonalEntryType.EXPENSE,
          walletId: selectedWalletId,
          categoryId: selectedCategoryId,
          amount,
          occurredAt,
          note: note.trim() || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  const title = tab == null ? t('personal.addOperation') : (
    tab === 'INCOME'
      ? t('personal.income')
      : tab === 'EXPENSE'
        ? t('personal.expenses')
        : t('personal.transfer')
  );

  return (
    <Dialog
      open={open}
      title={title}
      description={tab === 'TRANSFER' ? t('personal.transferHint') : undefined}
      onClose={onClose}
    >
      {tab == null ? (
        <div className="grid gap-2">
          {(
            [
              ['INCOME', t('personal.tabIncome')],
              ['EXPENSE', t('personal.tabExpense')],
              ['TRANSFER', t('personal.tabTransfer')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink hover:bg-surface-hover"
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <>
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-input bg-surface-muted p-1">
        {(
          [
            ['EXPENSE', t('personal.tabExpense')],
            ['INCOME', t('personal.tabIncome')],
            ['TRANSFER', t('personal.tabTransfer')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError(null);
              setCategoryId('');
            }}
            className={cn(
              'rounded-input px-2 py-2 text-xs font-medium',
              tab === key ? 'bg-surface text-brand-700' : 'text-ink-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {error ? <p className="text-sm text-danger-700">{error}</p> : null}

        {tab === 'TRANSFER' ? (
          activeWallets.length < 2 ? (
            <p className="text-sm text-ink-muted">{t('personal.needTwoWallets')}</p>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink">{t('personal.fromWallet')}</span>
                <select
                  value={selectedFrom}
                  onChange={(event) => setFromWalletId(event.target.value)}
                  className={fieldClass}
                >
                  {activeWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {walletLabel(wallet)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-ink">{t('personal.toWallet')}</span>
                <select
                  value={selectedTo}
                  onChange={(event) => setToWalletId(event.target.value)}
                  className={fieldClass}
                >
                  {activeWallets
                    .filter((wallet) => wallet.id !== selectedFrom)
                    .map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {walletLabel(wallet)}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )
        ) : (
          <>
            <select
              value={selectedWalletId}
              onChange={(event) => setWalletId(event.target.value)}
              className={fieldClass}
            >
              {activeWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {walletLabel(wallet)}
                </option>
              ))}
            </select>
            <CategoryPicker
              items={activeCategories}
              value={selectedCategoryId}
              onChange={setCategoryId}
            />
          </>
        )}

        {tab !== 'TRANSFER' || activeWallets.length >= 2 ? (
          <>
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
              disabled={pending || amount <= 0}
              className="w-full rounded-input bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </>
        ) : null}
      </form>
        </>
      )}
    </Dialog>
  );
}

function walletLabel(wallet: PersonalWalletDto): string {
  return `${wallet.name} · ${formatMoney(wallet.balanceSom)}`;
}
