import {
  BudgetWarningLevel,
  PersonalBudgetKind,
  PersonalCategoryKind,
  formatMoney,
  type PersonalBudgetDto,
} from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { usePersonalCategories } from '@/features/personal/ledger/hooks/use-personal-ledger';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { cn } from '@/lib/cn';
import { ApiClientError } from '@/lib/api-client';

import { BudgetWarningText } from '../components/BudgetWarningText';
import { ProgressBar } from '../components/ProgressBar';
import {
  useCreatePersonalBudget,
  usePersonalBudgets,
  useUpdatePersonalBudget,
} from '../hooks/use-personal-planning';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-500';

export function PersonalBudgetsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const budgets = usePersonalBudgets();
  const categories = usePersonalCategories(PersonalCategoryKind.EXPENSE);
  const createBudget = useCreatePersonalBudget();
  const updateBudget = useUpdatePersonalBudget();
  const [kind, setKind] = useState<PersonalBudgetKind>(PersonalBudgetKind.TOTAL);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = (categories.data?.items ?? []).filter((item) => item.isActive);
  const items = budgets.data?.items ?? [];
  const active = items.filter((item) => item.isActive);
  const archived = items.filter((item) => !item.isActive);
  const overall = active.find((item) => item.kind === PersonalBudgetKind.TOTAL);
  const categoryBudgets = active.filter((item) => item.kind === PersonalBudgetKind.CATEGORY);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createBudget.mutateAsync({
        kind,
        name,
        limitSom: limit,
        categoryId: kind === PersonalBudgetKind.CATEGORY ? categoryId || expenseCategories[0]?.id : null,
      });
      setName('');
      setLimit(0);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('common.retry'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.budgets')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.budgetsHint')}</p>
        <p className="mt-1 text-xs text-ink-muted">{t('personal.budgetTransfersHint')}</p>
      </div>

      {budgets.isPending && !budgets.data ? (
        <Skeleton className="h-32 w-full" />
      ) : budgets.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void budgets.refetch()}
        />
      ) : (
        <>
          {overall ? (
            <OverallBudgetCard
              budget={overall}
              canWrite={canWrite}
              onToggle={() => updateBudget.mutate({ id: overall.id, body: { isActive: false } })}
            />
          ) : (
            <p className="text-sm text-ink-muted">{t('personal.noOverallBudget')}</p>
          )}

          <section>
            <h2 className="text-sm font-semibold text-ink">{t('personal.budgetCategories')}</h2>
            {categoryBudgets.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">{t('personal.noCategoryBudgets')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {categoryBudgets.map((budget) => (
                  <li key={budget.id}>
                    <BudgetCard
                      budget={budget}
                      canWrite={canWrite}
                      onToggle={() =>
                        updateBudget.mutate({ id: budget.id, body: { isActive: !budget.isActive } })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {archived.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold text-ink-muted">{t('personal.archivedBudgets')}</h2>
              <ul className="mt-3 space-y-2">
                {archived.map((budget) => (
                  <li key={budget.id}>
                    <BudgetCard
                      budget={budget}
                      canWrite={canWrite}
                      onToggle={() =>
                        updateBudget.mutate({ id: budget.id, body: { isActive: !budget.isActive } })
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {canWrite ? (
        <form onSubmit={onCreate} className="space-y-3 rounded-panel border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink">{t('personal.addBudget')}</h2>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as PersonalBudgetKind)}
            className={fieldClass}
          >
            <option value={PersonalBudgetKind.TOTAL}>{t('personal.budgetTotal')}</option>
            <option value={PersonalBudgetKind.CATEGORY}>{t('personal.budgetCategory')}</option>
          </select>
          {kind === PersonalBudgetKind.CATEGORY ? (
            <select
              value={categoryId || expenseCategories[0]?.id || ''}
              onChange={(event) => setCategoryId(event.target.value)}
              className={fieldClass}
            >
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('personal.budgetName')}
            className={fieldClass}
          />
          <MoneyField label={t('personal.budgetLimit')} value={limit} onChange={setLimit} />
          <button
            type="submit"
            disabled={createBudget.isPending}
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

function OverallBudgetCard({
  budget,
  canWrite,
  onToggle,
}: {
  budget: PersonalBudgetDto;
  canWrite: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4 rounded-panel border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{t('personal.budgetOverall')}</h2>
          <p className="text-xs text-ink-muted">{budget.name}</p>
        </div>
        {canWrite ? (
          <button type="button" className="text-xs text-ink-muted hover:text-ink" onClick={onToggle}>
            {t('personal.archive')}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Kpi label={t('personal.budgetPlanned')} value={formatMoney(budget.limitSom)} />
        <Kpi
          label={t('personal.budgetSpent')}
          value={formatMoney(budget.spentSom)}
          tone={budget.warningLevel === BudgetWarningLevel.NONE ? 'neutral' : 'alert'}
        />
        <Kpi
          label={t('personal.budgetLeft')}
          value={formatMoney(budget.remainingSom)}
          tone={budget.remainingSom < 0 ? 'alert' : 'ok'}
        />
      </div>
      <ProgressBar percent={budget.percent} warningLevel={budget.warningLevel} />
      <BudgetWarningText budget={budget} />
    </section>
  );
}

function BudgetCard({
  budget,
  canWrite,
  onToggle,
}: {
  budget: PersonalBudgetDto;
  canWrite: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-panel border border-line bg-surface px-4 py-3 text-sm shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{budget.name}</p>
          <p className="text-xs text-ink-muted">
            {budget.category?.name ?? t('personal.budgetTotal')} · {formatMoney(budget.spentSom)} /{' '}
            {formatMoney(budget.limitSom)}
          </p>
        </div>
        {canWrite ? (
          <button type="button" className="text-xs text-ink-muted hover:text-ink" onClick={onToggle}>
            {budget.isActive ? t('personal.archive') : t('personal.restore')}
          </button>
        ) : null}
      </div>
      <ProgressBar percent={budget.percent} warningLevel={budget.warningLevel} />
      <BudgetWarningText budget={budget} />
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'alert' | 'ok';
}) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums tracking-tight',
          tone === 'alert' ? 'text-danger-700' : tone === 'ok' ? 'pf-amount-income' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
