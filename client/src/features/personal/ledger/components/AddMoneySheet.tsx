import {
  PersonalCategoryKind,
  PersonalEntryType,
  formatMoney,
  type PersonalWalletDto,
} from '@furniture-erp/shared';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { todayInputDate } from '@/features/expenses/utils/date';
import { showPersonalToast } from '@/features/personal/feedback/personal-toast';
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
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100';

type SheetTab = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export function AddMoneySheet({
  open,
  onClose,
  initialTab = null,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, skip the type chooser and open that tab. */
  initialTab?: SheetTab | null;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SheetTab | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
    setTab(initialTab);
    setAmount(0);
    setNote('');
    setOccurredAt(todayInputDate());
    setError(null);
    setWalletId('');
    setFromWalletId('');
    setToWalletId('');
    setCategoryId('');
    setDetailsOpen(false);
  }, [open, initialTab]);

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
        showPersonalToast({ message: t('personal.toastTransferSaved'), tone: 'success' });
      } else {
        await createEntry.mutateAsync({
          type: tab === 'INCOME' ? PersonalEntryType.INCOME : PersonalEntryType.EXPENSE,
          walletId: selectedWalletId,
          categoryId: selectedCategoryId,
          amount,
          occurredAt,
          note: note.trim() || null,
        });
        showPersonalToast({
          message:
            tab === 'INCOME' ? t('personal.toastIncomeSaved') : t('personal.toastExpenseSaved'),
          tone: 'success',
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  const title =
    tab == null
      ? t('personal.addOperation')
      : tab === 'INCOME'
        ? t('personal.income')
        : tab === 'EXPENSE'
          ? t('personal.expenses')
          : t('personal.transfer');

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
              ['EXPENSE', t('personal.tabExpense'), 'pf-sheet-choice--expense'],
              ['INCOME', t('personal.tabIncome'), 'pf-sheet-choice--income'],
              ['TRANSFER', t('personal.tabTransfer'), ''],
            ] as const
          ).map(([key, label, tone]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn('pf-sheet-choice', tone)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
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
                  setDetailsOpen(false);
                }}
                className={cn(
                  'rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
                  tab === key ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {error ? <p className="text-sm text-danger-700">{error}</p> : null}

            {tab !== 'TRANSFER' || activeWallets.length >= 2 ? (
              <div className="pf-amount-field">
                <MoneyField label={t('common.amount')} value={amount} onChange={setAmount} />
              </div>
            ) : null}

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
                <CategoryPicker
                  items={activeCategories}
                  value={selectedCategoryId}
                  onChange={setCategoryId}
                />
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-xs font-medium text-ink-muted hover:text-ink"
                  onClick={() => setDetailsOpen((open) => !open)}
                  aria-expanded={detailsOpen}
                >
                  <span>{t('personal.formMoreDetails')}</span>
                  <ChevronDown
                    className={cn('size-4 transition-transform', detailsOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
                {detailsOpen ? (
                  <div className="space-y-3">
                    <select
                      value={selectedWalletId}
                      onChange={(event) => setWalletId(event.target.value)}
                      className={fieldClass}
                      aria-label={t('personal.wallets')}
                    >
                      {activeWallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {walletLabel(wallet)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={occurredAt}
                      onChange={(event) => setOccurredAt(event.target.value)}
                      className={fieldClass}
                      aria-label={t('common.date')}
                    />
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('personal.note')}
                      className={fieldClass}
                    />
                  </div>
                ) : null}
              </>
            )}

            {tab === 'TRANSFER' && activeWallets.length >= 2 ? (
              <>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className={fieldClass}
                  aria-label={t('common.date')}
                />
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('personal.note')}
                  className={fieldClass}
                />
              </>
            ) : null}

            {tab !== 'TRANSFER' || activeWallets.length >= 2 ? (
              <button type="submit" disabled={pending || amount <= 0} className="pf-btn-primary w-full">
                {t('common.save')}
              </button>
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
