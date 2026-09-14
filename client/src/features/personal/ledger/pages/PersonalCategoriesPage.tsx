import { PersonalCategoryKind, type PersonalCategoryDto } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useCreatePersonalCategory,
  usePersonalCategories,
  useUpdatePersonalCategory,
} from '../hooks/use-personal-ledger';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

const COLOR_DOT: Record<string, string> = {
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
  cyan: 'bg-cyan-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
  green: 'bg-emerald-500',
};

export function PersonalCategoriesPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const categories = usePersonalCategories();
  const createCategory = useCreatePersonalCategory();
  const updateCategory = useUpdatePersonalCategory();
  const [kind, setKind] = useState<PersonalCategoryKind>(PersonalCategoryKind.EXPENSE);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = categories.data?.items ?? [];
  const income = items.filter((item) => item.kind === PersonalCategoryKind.INCOME);
  const expense = items.filter((item) => item.kind === PersonalCategoryKind.EXPENSE);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createCategory.mutateAsync({ kind, name });
      setName('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  async function onToggle(item: PersonalCategoryDto) {
    setError(null);
    try {
      await updateCategory.mutateAsync({ id: item.id, body: { isActive: !item.isActive } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.categories')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.categoriesHint')}</p>
        <p className="mt-2 rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          {t('personal.walletsVsCategories')}
        </p>
        <Link to={ROUTES.personalAccounts} className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          {t('personal.goToWallets')}
        </Link>
      </div>

      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {categories.isPending && !categories.data ? (
        <Skeleton className="h-32 w-full" />
      ) : categories.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void categories.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <CategoryList
            title={t('personal.expenses')}
            items={expense}
            canWrite={canWrite}
            onToggle={onToggle}
          />
          <CategoryList
            title={t('personal.income')}
            items={income}
            canWrite={canWrite}
            onToggle={onToggle}
          />
        </div>
      )}

      {canWrite ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">{t('personal.addCategory')}</h2>
          <p className="text-xs text-ink-muted">{t('personal.addCategoryHint')}</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                [PersonalCategoryKind.EXPENSE, t('personal.expenses')],
                [PersonalCategoryKind.INCOME, t('personal.income')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium',
                  kind === value
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('personal.categoryName')}
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={createCategory.isPending}
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

function CategoryList({
  title,
  items,
  canWrite,
  onToggle,
}: {
  title: string;
  items: PersonalCategoryDto[];
  canWrite: boolean;
  onToggle: (item: PersonalCategoryDto) => void;
}) {
  const { t } = useTranslation();
  const active = items.filter((item) => item.isActive);
  const archived = items.filter((item) => !item.isActive);

  return (
    <section className="rounded-panel border border-line bg-surface p-4 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <h3 className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {t('personal.activeCategories')}
      </h3>
      <CategoryRows items={active} empty={t('personal.noActiveCategories')} canWrite={canWrite} onToggle={onToggle} />
      {archived.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {t('personal.archivedCategories')}
          </h3>
          <CategoryRows items={archived} empty="" canWrite={canWrite} onToggle={onToggle} />
        </>
      ) : null}
    </section>
  );
}

function CategoryRows({
  items,
  empty,
  canWrite,
  onToggle,
}: {
  items: PersonalCategoryDto[];
  empty: string;
  canWrite: boolean;
  onToggle: (item: PersonalCategoryDto) => void;
}) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">{empty}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
          <span className={cn('flex min-w-0 items-center gap-2', item.isActive ? 'text-ink' : 'text-ink-muted')}>
            <span className={cn('size-2.5 shrink-0 rounded-full', COLOR_DOT[item.color] ?? 'bg-slate-400')} />
            <span className={cn('truncate', !item.isActive && 'line-through')}>{item.name}</span>
          </span>
          {canWrite ? (
            <button
              type="button"
              className="shrink-0 text-xs text-ink-muted hover:text-ink"
              onClick={() => onToggle(item)}
            >
              {item.isActive ? t('personal.archive') : t('personal.restore')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
