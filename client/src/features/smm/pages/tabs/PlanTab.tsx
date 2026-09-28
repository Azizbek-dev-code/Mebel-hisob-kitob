import {
  FeatureKey,
  SMM_CONTENT_TYPE_LABELS,
  SMM_CONTENT_TYPES,
  SMM_PLATFORM_LABELS,
  SMM_PLATFORMS,
  SMM_PROGRESS_KPI_LABELS,
  SmmContentType,
  SmmPlatform,
  mapSmmProgressToKpis,
  type CreateSmmContentPlanRequest,
  type SmmContentPlanSlotDto,
  type SmmContentPlanSlotInput,
  type SmmContentType as SmmContentTypeT,
  type SmmPlatform as SmmPlatformT,
} from '@furniture-erp/shared';
import { CalendarRange, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { WriteGuard } from '@/features/subscription/WriteGuard';
import { ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';

import {
  useCreateSmmCampaign,
  useCreateSmmPillar,
  useCreateSmmPlan,
  useCreateSmmPlanSlot,
  useDeleteSmmPlanSlot,
  useSmmCampaigns,
  useSmmPillars,
  useSmmPlan,
  useSmmPlans,
  useSmmProgress,
  useUpdateSmmPlanSlot,
} from '../../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../../utils/ui';
import { useSmmProjectId } from '../project-context';

function emptySlotForm(): SmmContentPlanSlotInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    contentType: SmmContentType.REELS,
    platform: SmmPlatform.INSTAGRAM,
    title: '',
    notes: '',
  };
}

export function PlanTab() {
  const projectId = useSmmProjectId();
  const plans = useSmmPlans(projectId);
  const progress = useSmmProgress(projectId);
  const pillars = useSmmPillars(projectId);
  const campaigns = useSmmCampaigns(projectId);
  const createPlan = useCreateSmmPlan(projectId);
  const createPillar = useCreateSmmPillar(projectId);
  const createCampaign = useCreateSmmCampaign(projectId);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SmmContentPlanSlotDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [platforms, setPlatforms] = useState<SmmPlatformT[]>([SmmPlatform.INSTAGRAM]);
  const [contentTypes, setContentTypes] = useState<SmmContentTypeT[]>([SmmContentType.REELS]);
  const [frequencyNotes, setFrequencyNotes] = useState('');
  const [goals, setGoals] = useState('');
  const [notes, setNotes] = useState('');

  const [slotForm, setSlotForm] = useState<SmmContentPlanSlotInput>(emptySlotForm);

  const planDetail = useSmmPlan(projectId, selectedPlanId, Boolean(selectedPlanId));
  const createSlot = useCreateSmmPlanSlot(projectId, selectedPlanId ?? '');
  const updateSlot = useUpdateSmmPlanSlot(projectId, selectedPlanId ?? '');
  const deleteSlot = useDeleteSmmPlanSlot(projectId, selectedPlanId ?? '');

  const kpis = useMemo(
    () => (progress.data ? mapSmmProgressToKpis(progress.data) : null),
    [progress.data],
  );

  useEffect(() => {
    if (!selectedPlanId && (plans.data?.items ?? []).length > 0) {
      setSelectedPlanId(plans.data!.items[0]!.id);
    }
  }, [plans.data, selectedPlanId]);

  function togglePlatform(p: SmmPlatformT) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function toggleContentType(t: SmmContentTypeT) {
    setContentTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function handleCreatePlan(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !periodStart || !periodEnd) {
      setError('Nom va davr majburiy');
      return;
    }
    if (platforms.length === 0 || contentTypes.length === 0) {
      setError('Kamida bitta platforma va kontent turi tanlang');
      return;
    }
    const body: CreateSmmContentPlanRequest = {
      name: name.trim(),
      periodStart,
      periodEnd,
      platforms,
      contentTypes,
      frequencyNotes: frequencyNotes.trim() || null,
      goals: goals.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      const plan = await createPlan.mutateAsync(body);
      setSelectedPlanId(plan.id);
      setPlanFormOpen(false);
      setName('');
      setPeriodStart('');
      setPeriodEnd('');
      setFrequencyNotes('');
      setGoals('');
      setNotes('');
      setPlatforms([SmmPlatform.INSTAGRAM]);
      setContentTypes([SmmContentType.REELS]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Saqlab bo‘lmadi');
    }
  }

  function openCreateSlot() {
    setEditingSlot(null);
    setSlotForm(emptySlotForm());
    setSlotFormOpen(true);
  }

  function openEditSlot(slot: SmmContentPlanSlotDto) {
    setEditingSlot(slot);
    setSlotForm({
      date: slot.date.slice(0, 10),
      contentType: slot.contentType,
      platform: slot.platform,
      title: slot.title ?? '',
      notes: slot.notes ?? '',
    });
    setSlotFormOpen(true);
  }

  async function handleSaveSlot(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlanId) return;
    setError(null);
    const body: SmmContentPlanSlotInput = {
      date: slotForm.date,
      contentType: slotForm.contentType,
      platform: slotForm.platform || null,
      title: slotForm.title?.trim() || null,
      notes: slotForm.notes?.trim() || null,
    };
    try {
      if (editingSlot) {
        await updateSlot.mutateAsync({ slotId: editingSlot.id, body });
      } else {
        await createSlot.mutateAsync(body);
      }
      setSlotFormOpen(false);
      setEditingSlot(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Slot saqlanmadi');
    }
  }

  async function handleCreatePillar() {
    const pillarName = window.prompt('Pillar nomi');
    if (!pillarName?.trim()) return;
    try {
      await createPillar.mutateAsync({ name: pillarName.trim() });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Pillar yaratilmadi');
    }
  }

  async function handleCreateCampaign() {
    const campaignName = window.prompt('Kampaniya nomi');
    if (!campaignName?.trim()) return;
    try {
      await createCampaign.mutateAsync({ name: campaignName.trim() });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Kampaniya yaratilmadi');
    }
  }

  if (plans.isError) {
    return (
      <ErrorState
        title="Rejalar yuklanmadi"
        message={plans.error instanceof ApiClientError ? plans.error.message : 'Qayta urinib ko‘ring'}
        onRetry={() => void plans.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      {kpis ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(
            ['planned', 'inProgress', 'completed', 'published', 'overdue'] as const
          ).map((key) => (
              <div key={key} className="rounded-input border border-line bg-surface-muted px-3 py-2">
                <p className="text-xs text-ink-muted">{SMM_PROGRESS_KPI_LABELS[key]}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{kpis[key]}</p>
              </div>
            ))}
        </div>
      ) : progress.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">Kontent rejalari va slotlar</p>
        <WriteGuard
          feature={FeatureKey.SMM_PROJECTS}
          className="inline-flex items-center gap-1.5 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setPlanFormOpen(true)}
        >
          <Plus className="size-4" />
          Reja
        </WriteGuard>
      </div>

      {plans.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (plans.data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Reja yo‘q"
          description="Davr, platforma va chastota bilan kontent rejasini yarating"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <SectionCard title="Rejalar">
            <ul className="divide-y divide-line">
              {(plans.data?.items ?? []).map((plan) => (
                <li key={plan.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-0.5 px-1 py-2.5 text-left hover:bg-surface-hover ${
                      selectedPlanId === plan.id ? 'bg-brand-50/60' : ''
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <span className="text-sm font-medium text-ink">{plan.name}</span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(plan.periodStart)} — {formatDate(plan.periodEnd)} · {plan.slotCount}{' '}
                      slot
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="space-y-3 lg:col-span-2">
            <SectionCard
              title={planDetail.data?.name ?? 'Reja tafsiloti'}
              action={
                selectedPlanId ? (
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={openCreateSlot}
                  >
                    <Plus className="size-4" />
                    Slot
                  </WriteGuard>
                ) : null
              }
            >
              {!selectedPlanId ? (
                <p className="text-sm text-ink-muted">Rejani tanlang</p>
              ) : planDetail.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : planDetail.data ? (
                <div className="space-y-3">
                  <div className="text-sm text-ink-soft">
                    <p>
                      {formatDate(planDetail.data.periodStart)} —{' '}
                      {formatDate(planDetail.data.periodEnd)}
                    </p>
                    <p className="mt-1">
                      {planDetail.data.platforms.map((p) => SMM_PLATFORM_LABELS[p]).join(', ')}
                      {' · '}
                      {planDetail.data.contentTypes.map((t) => SMM_CONTENT_TYPE_LABELS[t]).join(', ')}
                    </p>
                    {planDetail.data.frequencyNotes ? (
                      <p className="mt-1">{planDetail.data.frequencyNotes}</p>
                    ) : null}
                    {planDetail.data.goals ? <p className="mt-1">Maqsad: {planDetail.data.goals}</p> : null}
                  </div>
                  {(planDetail.data.slots ?? []).length === 0 ? (
                    <p className="text-sm text-ink-muted">Slot yo‘q</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {planDetail.data.slots.map((slot) => (
                        <li
                          key={slot.id}
                          className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">
                              {slot.title || SMM_CONTENT_TYPE_LABELS[slot.contentType]}
                            </p>
                            <p className="text-xs text-ink-muted">
                              {formatDate(slot.date)} · {SMM_CONTENT_TYPE_LABELS[slot.contentType]}
                              {slot.platform ? ` · ${SMM_PLATFORM_LABELS[slot.platform]}` : ''}
                            </p>
                            {slot.notes ? <p className="text-xs text-ink-soft">{slot.notes}</p> : null}
                          </div>
                          <div className="flex gap-2">
                            <WriteGuard
                              feature={FeatureKey.SMM_PROJECTS}
                              className={BTN_SECONDARY}
                              onClick={() => openEditSlot(slot)}
                            >
                              Tahrirlash
                            </WriteGuard>
                            <WriteGuard
                              feature={FeatureKey.SMM_PROJECTS}
                              className={BTN_SECONDARY}
                              onClick={() => {
                                if (window.confirm('Slot o‘chirilsinmi?')) {
                                  void deleteSlot.mutateAsync(slot.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </WriteGuard>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-danger-700">Reja yuklanmadi</p>
              )}
            </SectionCard>

            <div className="grid gap-3 sm:grid-cols-2">
              <SectionCard
                title="Pillarlar"
                action={
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => void handleCreatePillar()}
                  >
                    <Plus className="size-4" />
                  </WriteGuard>
                }
              >
                {(pillars.data ?? []).length === 0 ? (
                  <p className="text-sm text-ink-muted">Pillar yo‘q</p>
                ) : (
                  <ul className="space-y-1">
                    {(pillars.data ?? []).map((p) => (
                      <li key={p.id} className="text-sm text-ink">
                        {p.name}
                        <span className="text-ink-muted"> · {p.contentCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
              <SectionCard
                title="Kampaniyalar"
                action={
                  <WriteGuard
                    feature={FeatureKey.SMM_PROJECTS}
                    className={BTN_SECONDARY}
                    onClick={() => void handleCreateCampaign()}
                  >
                    <Plus className="size-4" />
                  </WriteGuard>
                }
              >
                {(campaigns.data?.items ?? []).length === 0 ? (
                  <p className="text-sm text-ink-muted">Kampaniya yo‘q</p>
                ) : (
                  <ul className="space-y-1">
                    {(campaigns.data?.items ?? []).map((c) => (
                      <li key={c.id} className="text-sm text-ink">
                        {c.name}
                        <span className="text-ink-muted"> · {c.contentCount}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      <Dialog open={planFormOpen} onClose={() => setPlanFormOpen(false)} title="Yangi kontent rejasi" className="sm:max-w-xl">
        <form className="space-y-3" onSubmit={(e) => void handleCreatePlan(e)}>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Nomi *</span>
            <input className={FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Boshlanish *</span>
              <input type="date" className={FIELD_CLASS} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Tugash *</span>
              <input type="date" className={FIELD_CLASS} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </label>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm text-ink-soft">Platformalar</legend>
            <div className="flex flex-wrap gap-2">
              {SMM_PLATFORMS.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                  />
                  {SMM_PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm text-ink-soft">Kontent turlari</legend>
            <div className="flex flex-wrap gap-2">
              {SMM_CONTENT_TYPES.map((t) => (
                <label key={t} className="inline-flex items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={contentTypes.includes(t)}
                    onChange={() => toggleContentType(t)}
                  />
                  {SMM_CONTENT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Chastota izohi</span>
            <textarea className={FIELD_CLASS} rows={2} value={frequencyNotes} onChange={(e) => setFrequencyNotes(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Maqsadlar</span>
            <textarea className={FIELD_CLASS} rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Izoh</span>
            <textarea className={FIELD_CLASS} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setPlanFormOpen(false)}>
              Bekor
            </button>
            <button type="submit" className={BTN_PRIMARY} disabled={createPlan.isPending}>
              {createPlan.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Saqlash
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={slotFormOpen}
        onClose={() => setSlotFormOpen(false)}
        title={editingSlot ? 'Slotni tahrirlash' : 'Yangi slot'}
      >
        <form className="space-y-3" onSubmit={(e) => void handleSaveSlot(e)}>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Sana *</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={slotForm.date}
              onChange={(e) => setSlotForm((s) => ({ ...s, date: e.target.value }))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Tur</span>
              <select
                className={FIELD_CLASS}
                value={slotForm.contentType}
                onChange={(e) =>
                  setSlotForm((s) => ({ ...s, contentType: e.target.value as SmmContentTypeT }))
                }
              >
                {SMM_CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SMM_CONTENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-soft">Platforma</span>
              <select
                className={FIELD_CLASS}
                value={slotForm.platform ?? ''}
                onChange={(e) =>
                  setSlotForm((s) => ({
                    ...s,
                    platform: (e.target.value || null) as SmmPlatformT | null,
                  }))
                }
              >
                <option value="">—</option>
                {SMM_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {SMM_PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Sarlavha</span>
            <input
              className={FIELD_CLASS}
              value={slotForm.title ?? ''}
              onChange={(e) => setSlotForm((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Izoh</span>
            <textarea
              className={FIELD_CLASS}
              rows={2}
              value={slotForm.notes ?? ''}
              onChange={(e) => setSlotForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECONDARY} onClick={() => setSlotFormOpen(false)}>
              Bekor
            </button>
            <button
              type="submit"
              className={BTN_PRIMARY}
              disabled={createSlot.isPending || updateSlot.isPending}
            >
              {(createSlot.isPending || updateSlot.isPending) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Saqlash
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
