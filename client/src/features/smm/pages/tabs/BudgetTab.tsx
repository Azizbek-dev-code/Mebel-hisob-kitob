import { FeatureKey } from '@furniture-erp/shared';
import { Plus, Wallet } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { useWorkerLookup } from '@/features/sales/hooks/use-sales';
import { ApiClientError } from '@/lib/api-client';
import { formatDate, formatMoney, parseMoneyInput } from '@/utils/format';

import {
  useCreateSmmCost,
  useDeleteSmmCost,
  useSmmContentList,
  useSmmCosts,
  useSmmProgress,
} from '../../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

export function BudgetTab() {
  const projectId = useSmmProjectId();
  const costs = useSmmCosts(projectId, { pageSize: 100 });
  const progress = useSmmProgress(projectId);
  const create = useCreateSmmCost(projectId);
  const remove = useDeleteSmmCost(projectId);
  const workers = useWorkerLookup('');
  const contentList = useSmmContentList(projectId, { pageSize: 100 }, true);

  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [costDate, setCostDate] = useState('');
  const [contentItemId, setContentItemId] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => (costs.data?.items ?? []).reduce((sum, item) => sum + item.amount, 0),
    [costs.data?.items],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const money = parseMoneyInput(amount);
    if (!label.trim() || money === null || money < 0 || !costDate) {
      setError('Maydonlarni to‘ldiring');
      return;
    }
    try {
      await create.mutateAsync({
        label: label.trim(),
        amount: money,
        costDate,
        contentItemId: contentItemId || null,
        userId: userId || null,
      });
      setFormOpen(false);
      setLabel('');
      setAmount('');
      setCostDate('');
      setContentItemId('');
      setUserId('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  if (costs.isError && costs.error instanceof ApiClientError && costs.error.isForbidden) {
    return (
      <EmptyState
        icon={Wallet}
        title="Ruxsat yo‘q"
        description="Byudjet bo‘limiga kirish cheklangan"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-input border border-line bg-surface px-4 py-3">
          <p className="text-xs text-ink-muted">Jami xarajat</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
            {costs.isLoading ? '—' : formatMoney(progress.data?.totalCost ?? total)}
          </p>
        </div>
        <div className="flex items-end justify-end">
          <WriteGuard
            feature={FeatureKey.SMM_PROJECTS}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" />
            Xarajat
          </WriteGuard>
        </div>
      </div>

      {costs.isError ? (
        <ErrorState
          title="Xarajatlar yuklanmadi"
          message={costs.error instanceof ApiClientError ? costs.error.message : 'Qayta urinib ko‘ring'}
          onRetry={() => void costs.refetch()}
        />
      ) : costs.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (costs.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Wallet} title="Xarajat yo‘q" description="Loyiha xarajatlarini kiriting" />
      ) : (
        <SectionCard title="Xarajatlar">
          <ul className="divide-y divide-line">
            {(costs.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(item.costDate)}
                    {item.user ? ` · ${item.user.fullName}` : ''}
                    {item.contentItemId ? ' · kontent' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => {
                      if (window.confirm('O‘chirasizmi?')) void remove.mutateAsync(item.id);
                    }}
                  >
                    O‘chirish
                  </WriteGuard>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Yangi xarajat">
        <form className="space-y-3" onSubmit={(e) => void handleCreate(e)}>
          <input className={FIELD_CLASS} placeholder="Nomi" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className={FIELD_CLASS} inputMode="numeric" placeholder="Summa" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input type="date" className={FIELD_CLASS} value={costDate} onChange={(e) => setCostDate(e.target.value)} />
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Kontent (ixtiyoriy)</span>
            <select className={FIELD_CLASS} value={contentItemId} onChange={(e) => setContentItemId(e.target.value)}>
              <option value="">—</option>
              {(contentList.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Xodim (ixtiyoriy)</span>
            <select className={FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">—</option>
              {(workers.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>{w.fullName}</option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setFormOpen(false)}>Bekor</button>
            <button type="submit" className={BTN_PRIMARY} disabled={create.isPending}>Saqlash</button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
