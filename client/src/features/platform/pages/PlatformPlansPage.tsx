import {
  FEATURE_CATALOG,
  LIMIT_CATALOG,
  PERSONAL_PLANS,
  formatMoney,
  type CreateSubscriptionPlanBody,
  type FeatureDto,
  type PlanLimitInput,
  type SubscriptionPlanDto,
} from '@furniture-erp/shared';
import { Loader2, Plus, Tags } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { MoneyField } from '@/features/sales/components/MoneyField';
import { ApiClientError } from '@/lib/api-client';

import {
  useCreatePlan,
  usePlatformFeatures,
  usePlatformPlans,
  useUpdatePlan,
} from '../hooks/use-platform-billing';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export function PlatformPlansPage() {
  const { t } = useTranslation();
  const list = usePlatformPlans();
  const [editing, setEditing] = useState<SubscriptionPlanDto | null | 'new'>(null);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Tariflar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Nom, narx, funksiyalar va limitlar. Ishlatilayotgan tarif o&apos;chirilmaydi — faqat
            deaktiv qilinadi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="size-4" />
          Tarif
        </button>
      </div>

      <SectionCard title="Ro'yxat">
        {list.isPending && !list.data ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : list.isError ? (
          <ErrorState
            title="Tariflarni yuklab bo'lmadi"
            message="Qayta urinib ko'ring."
            onRetry={() => void list.refetch()}
            isRetrying={list.isFetching}
          />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={Tags}
            title="Tarif yo'q"
            description="Birinchi platforma tarifini yarating."
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.data?.items.map((plan) => (
              <li
                key={plan.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{plan.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {plan.description || 'Tavsif yo‘q'} · {formatMoney(plan.monthlyPrice)} / oy
                    {plan.trialDays > 0 ? ` · ${plan.trialDays} kun sinov` : ''}
                    {` · daraja ${plan.rank ?? 0}`}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-subtle">
                    {plan.enabledFeatures?.length
                      ? `${plan.enabledFeatures
                          .slice(0, 6)
                          .map((item) => item.name)
                          .join(' · ')}${plan.enabledFeatures.length > 6 ? '…' : ''}`
                      : plan.featuresRestricted
                        ? 'Funksiya yo‘q'
                        : 'Barcha funksiyalar'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={plan.isActive ? 'success' : 'neutral'}>
                    {plan.isActive ? 'Faol' : 'O‘chirilgan'}
                  </Badge>
                  <button
                    type="button"
                    className="rounded-input border border-line px-2 py-1 text-xs font-medium hover:bg-surface-hover"
                    onClick={() => setEditing(plan)}
                  >
                    Tahrirlash
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={t('platformAdmin.subscriptions.personalPlansTitle')}
        description={t('platformAdmin.subscriptions.personalPlansHint')}
      >
        <ul className="divide-y divide-line">
          {PERSONAL_PLANS.map((plan) => (
            <li key={plan.key} className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-ink">{t(`personal.plans.${plan.key}`)}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {plan.trialDays > 0
                    ? t('platformAdmin.subscriptions.personalPlanTrial', { days: plan.trialDays })
                    : t('platformAdmin.subscriptions.personalPlanPrice', {
                        price: formatMoney(plan.monthlyPriceSom),
                      })}
                </p>
              </div>
              <p className="shrink-0 tabular-money text-sm font-medium text-ink">
                {formatMoney(plan.monthlyPriceSom)}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {editing ? (
        <PlanDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </PageContainer>
  );
}

function PlanDialog({ plan, onClose }: { plan: SubscriptionPlanDto | null; onClose: () => void }) {
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const catalog = usePlatformFeatures(true);
  const features = catalog.data?.items ?? FEATURE_CATALOG.map(toFallbackFeature);
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [monthlyPrice, setMonthlyPrice] = useState(plan?.monthlyPrice ?? 0);
  const [trialDays, setTrialDays] = useState(plan ? String(plan.trialDays) : '0');
  const [rank, setRank] = useState(plan ? String(plan.rank ?? 0) : '1');
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [isDefaultTrial, setIsDefaultTrial] = useState(plan?.isDefaultTrial ?? false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(plan?.featureKeys ?? FEATURE_CATALOG.map((item) => item.key)),
  );
  const [limits, setLimits] = useState<Record<string, { unlimited: boolean; value: string }>>(() =>
    Object.fromEntries(
      LIMIT_CATALOG.map((item) => {
        const existing = plan?.limits.find((row) => row.resourceKey === item.key);
        return [
          item.key,
          {
            unlimited: existing ? existing.unlimited : true,
            value: existing?.limitValue != null ? String(existing.limitValue) : '',
          },
        ];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureDto[]>();
    for (const feature of features) {
      const list = map.get(feature.category) ?? [];
      list.push(feature);
      map.set(feature.category, list);
    }
    return [...map.entries()];
  }, [features]);

  function toggleFeature(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const limitPayload: PlanLimitInput[] = LIMIT_CATALOG.map((item) => {
      const row = limits[item.key];
      const unlimited = row?.unlimited ?? true;
      return {
        resourceKey: item.key,
        unlimited,
        limitValue: unlimited ? null : Number(row?.value || 0) || null,
      };
    });
    const body: CreateSubscriptionPlanBody = {
      name,
      description,
      monthlyPrice,
      trialDays: Number(trialDays) || 0,
      isDefaultTrial,
      rank: Number(rank) || 0,
      featureKeys: [...selectedKeys],
      limits: limitPayload,
    };
    try {
      if (plan) {
        await update.mutateAsync({ id: plan.id, body: { ...body, isActive } });
      } else {
        await create.mutateAsync(body);
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : 'Saqlab bo‘lmadi');
    }
  }

  return (
    <Dialog
      open
      title={plan ? 'Tarifni tahrirlash' : 'Yangi tarif'}
      onClose={onClose}
      className="sm:max-w-2xl"
    >
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Nomi</span>
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Tavsif</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <MoneyField label="Oylik narx" value={monthlyPrice} onChange={setMonthlyPrice} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Sinov kunlari</span>
          <input
            className={fieldClass}
            inputMode="numeric"
            value={trialDays}
            onChange={(event) => setTrialDays(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">Daraja (upgrade tartibi)</span>
          <input
            className={fieldClass}
            inputMode="numeric"
            value={rank}
            onChange={(event) => setRank(event.target.value)}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Funksiyalar</legend>
          {catalog.isPending && !catalog.data ? <Skeleton className="h-24 w-full" /> : null}
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-input border border-line p-3">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {category}
                </p>
                <ul className="space-y-1.5">
                  {items.map((feature) => (
                    <li key={feature.key}>
                      <label className="flex items-start gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedKeys.has(feature.key)}
                          onChange={() => toggleFeature(feature.key)}
                        />
                        <span>
                          <span className="font-medium">{feature.name}</span>
                          {feature.description ? (
                            <span className="block text-xs text-ink-muted">{feature.description}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Limitlar</legend>
          <div className="space-y-2">
            {LIMIT_CATALOG.map((item) => {
              const row = limits[item.key] ?? { unlimited: true, value: '' };
              return (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-2 rounded-input border border-line p-3 sm:grid-cols-[1fr_auto_7rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-ink-muted">{item.description}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={row.unlimited}
                      onChange={(event) =>
                        setLimits((current) => ({
                          ...current,
                          [item.key]: { ...row, unlimited: event.target.checked },
                        }))
                      }
                    />
                    Cheksiz
                  </label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder="Son"
                    disabled={row.unlimited}
                    value={row.unlimited ? '' : row.value}
                    onChange={(event) =>
                      setLimits((current) => ({
                        ...current,
                        [item.key]: { ...row, value: event.target.value, unlimited: false },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isDefaultTrial}
            onChange={(event) => setIsDefaultTrial(event.target.checked)}
          />
          Yangi do‘konlar uchun sinov tarifi
        </label>
        {plan ? (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Faol
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-input px-3 py-2 text-sm" onClick={onClose}>
            Bekor
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function toFallbackFeature(entry: (typeof FEATURE_CATALOG)[number], index: number): FeatureDto {
  return {
    id: entry.key,
    key: entry.key,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    isActive: true,
    sortOrder: index,
  };
}
