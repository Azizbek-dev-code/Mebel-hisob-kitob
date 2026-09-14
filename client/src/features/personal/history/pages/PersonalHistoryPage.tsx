import {
  PersonalEntryType,
  PersonalHistoryGroup,
  PersonalHistoryKind,
  PersonalHistoryPeriod,
  formatMoney,
  groupPersonalHistoryByCategory,
  groupPersonalHistoryByDay,
  personalHistoryRange,
  type PersonalActivityItem,
  type PersonalHistoryListQuery,
} from '@furniture-erp/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatDate } from '@/utils/format';

import { usePersonalCategories, usePersonalHistory, usePersonalWallets } from '../../ledger/hooks/use-personal-ledger';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

const PERIODS: PersonalHistoryPeriod[] = [
  PersonalHistoryPeriod.THIS_WEEK,
  PersonalHistoryPeriod.THIS_MONTH,
  PersonalHistoryPeriod.THIS_YEAR,
  PersonalHistoryPeriod.CUSTOM,
];

const KINDS: PersonalHistoryKind[] = [
  PersonalHistoryKind.ALL,
  PersonalHistoryKind.EXPENSE,
  PersonalHistoryKind.INCOME,
  PersonalHistoryKind.TRANSFER,
];

function readEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function PersonalHistoryPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(searchParams.get('q') ?? '');

  const period = readEnum(searchParams.get('period'), PERIODS, PersonalHistoryPeriod.THIS_MONTH);
  const kind = readEnum(searchParams.get('kind'), KINDS, PersonalHistoryKind.ALL);
  const group = readEnum(
    searchParams.get('group'),
    [PersonalHistoryGroup.DAY, PersonalHistoryGroup.CATEGORY] as const,
    PersonalHistoryGroup.DAY,
  );
  const walletId = searchParams.get('walletId') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const customFrom = searchParams.get('from') || undefined;
  const customTo = searchParams.get('to') || undefined;
  const q = searchParams.get('q') || undefined;
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);

  const range = period === PersonalHistoryPeriod.CUSTOM ? { from: customFrom, to: customTo } : personalHistoryRange(period);

  const query: PersonalHistoryListQuery = {
    kind,
    walletId,
    categoryId: kind === PersonalHistoryKind.TRANSFER ? undefined : categoryId,
    from: range.from,
    to: range.to,
    q,
    page,
    pageSize: 50,
  };

  const history = usePersonalHistory(query);
  const wallets = usePersonalWallets();
  const categories = usePersonalCategories();
  const activeWallets = (wallets.data?.items ?? []).filter((item) => !item.isArchived);
  const activeCategories = (categories.data?.items ?? []).filter((item) => item.isActive);

  function patch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (!('page' in next)) params.delete('page');
    setSearchParams(params, { replace: true });
  }

  const grouped = useMemo(() => {
    const items = history.data?.items ?? [];
    return group === PersonalHistoryGroup.CATEGORY
      ? groupPersonalHistoryByCategory(items).map((row) => ({
          key: row.key,
          title: row.name === 'TRANSFER' ? t('personal.transfer') : row.name,
          items: row.items,
        }))
      : groupPersonalHistoryByDay(items).map((row) => ({
          key: row.date,
          title: formatDate(row.date),
          items: row.items,
        }));
  }, [group, history.data?.items, t]);

  const totals = history.data?.totals;
  const meta = history.data?.meta;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.history')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.historyHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <Chip
            key={value}
            pressed={period === value}
            onClick={() => patch({ period: value, from: undefined, to: undefined })}
          >
            {t(`personal.period.${value}`)}
          </Chip>
        ))}
      </div>

      {period === PersonalHistoryPeriod.CUSTOM ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-muted">
            {t('common.from')}
            <input
              type="date"
              value={customFrom ?? ''}
              onChange={(event) => patch({ period: PersonalHistoryPeriod.CUSTOM, from: event.target.value || undefined })}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="text-xs text-ink-muted">
            {t('common.to')}
            <input
              type="date"
              value={customTo ?? ''}
              onChange={(event) => patch({ period: PersonalHistoryPeriod.CUSTOM, to: event.target.value || undefined })}
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {KINDS.map((value) => (
          <Chip key={value} pressed={kind === value} onClick={() => patch({ kind: value === PersonalHistoryKind.ALL ? undefined : value })}>
            {t(`personal.historyKind.${value}`)}
          </Chip>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          patch({ q: draftQuery.trim() || undefined });
        }}
      >
        <div className="flex gap-2">
          <input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder={t('personal.historySearch')}
            className={fieldClass}
          />
          <button
            type="submit"
            className="shrink-0 rounded-input bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {t('common.search')}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={walletId ?? ''}
            onChange={(event) => patch({ walletId: event.target.value || undefined })}
            className={fieldClass}
          >
            <option value="">{t('personal.allWallets')}</option>
            {activeWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
          {kind === PersonalHistoryKind.TRANSFER ? null : (
            <select
              value={categoryId ?? ''}
              onChange={(event) => patch({ categoryId: event.target.value || undefined })}
              className={fieldClass}
            >
              <option value="">{t('common.allCategories')}</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <Chip
          pressed={group === PersonalHistoryGroup.DAY}
          onClick={() => patch({ group: PersonalHistoryGroup.DAY })}
        >
          {t('personal.groupDay')}
        </Chip>
        <Chip
          pressed={group === PersonalHistoryGroup.CATEGORY}
          onClick={() => patch({ group: PersonalHistoryGroup.CATEGORY })}
        >
          {t('personal.groupCategory')}
        </Chip>
      </div>

      {history.isPending && !history.data ? (
        <Skeleton className="h-40 w-full" />
      ) : history.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void history.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Total label={t('personal.monthIncome')} value={formatMoney(totals?.incomeSom ?? 0)} tone="income" />
            <Total label={t('personal.monthExpense')} value={formatMoney(totals?.expenseSom ?? 0)} tone="expense" />
            <Total
              label={t('personal.monthNet')}
              value={formatMoney(totals?.netSom ?? 0)}
              tone={(totals?.netSom ?? 0) < 0 ? 'negative' : 'income'}
            />
            <Total label={t('personal.transfer')} value={formatMoney(totals?.transferSom ?? 0)} />
          </div>
          <p className="text-xs text-ink-muted">{t('personal.historyTotalsHint')}</p>

          {(history.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-ink-muted">{t('personal.noEntries')}</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((section) => (
                <section key={section.key}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{section.title}</h2>
                  <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                    {section.items.map((item) => (
                      <HistoryRow key={item.kind === 'ENTRY' ? item.entry.id : item.transfer.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={!meta.hasPreviousPage}
                className="text-brand-700 disabled:text-ink-subtle"
                onClick={() => patch({ page: String(page - 1) })}
              >
                {t('common.previous')}
              </button>
              <span className="text-ink-muted">{t('common.pageOf', { page: meta.page, total: meta.totalPages })}</span>
              <button
                type="button"
                disabled={!meta.hasNextPage}
                className="text-brand-700 disabled:text-ink-subtle"
                onClick={() => patch({ page: String(page + 1) })}
              >
                {t('common.next')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium',
        pressed
          ? 'border-brand-500 bg-brand-50 text-brand-800'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function Total({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'income' | 'expense' | 'negative';
}) {
  const valueClass =
    tone === 'income'
      ? 'pf-amount-income'
      : tone === 'expense'
        ? 'pf-amount-expense'
        : tone === 'negative'
          ? 'pf-amount-negative'
          : 'text-ink';
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function HistoryRow({ item }: { item: PersonalActivityItem }) {
  const { t } = useTranslation();
  if (item.kind === 'TRANSFER') {
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="min-w-0">
          <p className="truncate text-ink">{t('personal.transfer')}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {item.transfer.fromWallet.name} → {item.transfer.toWallet.name} · {formatDate(item.occurredAt)}
          </p>
        </div>
        <span className="shrink-0 tabular-nums text-ink">{formatMoney(item.transfer.amount)}</span>
      </li>
    );
  }
  const income = item.entry.type === PersonalEntryType.INCOME;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate text-ink">{item.entry.category.name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {item.entry.wallet.name} · {formatDate(item.occurredAt)}
          {item.entry.note ? ` · ${item.entry.note}` : ''}
        </p>
      </div>
      <span className={income ? 'shrink-0 tabular-nums pf-amount-income' : 'shrink-0 tabular-nums pf-amount-expense'}>
        {income ? '+' : '−'}
        {formatMoney(item.entry.amount)}
      </span>
    </li>
  );
}
