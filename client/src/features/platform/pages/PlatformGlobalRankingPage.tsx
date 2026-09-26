import {
  GlobalCompetitionStatus,
  GlobalRewardDeliveryStatus,
  GlobalRewardPlace,
  type GlobalMonthlyCompetitionDto,
  type PlatformGlobalCompetitionDetailDto,
} from '@furniture-erp/shared';
import { Trophy } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { Dialog } from '@/components/ui/Dialog';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { platformGlobalRankingService } from '@/services/platform-global-ranking.service';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400';

function periodKeyNow(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthIsoBounds(periodKey: string): { startsAt: string; endsAt: string } {
  const [y, m] = periodKey.split('-').map(Number);
  const startsAt = new Date(Date.UTC(y!, m! - 1, 1)).toISOString();
  const endsAt = new Date(Date.UTC(y!, m!, 1)).toISOString();
  return { startsAt, endsAt };
}

export function PlatformGlobalRankingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['platform', 'global-ranking', 'competitions'],
    queryFn: ({ signal }) => platformGlobalRankingService.list(signal),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewardOpen, setRewardOpen] = useState<GlobalRewardPlace | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const detail = useQuery({
    queryKey: ['platform', 'global-ranking', 'competition', selectedId],
    queryFn: ({ signal }) => platformGlobalRankingService.get(selectedId!, signal),
    enabled: Boolean(selectedId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform', 'global-ranking'] });
  };

  const upsert = useMutation({
    mutationFn: platformGlobalRankingService.upsert,
    onSuccess: (res) => {
      invalidate();
      setSelectedId(res.competition.id);
      setCreateOpen(false);
    },
  });

  const upsertReward = useMutation({
    mutationFn: ({
      competitionId,
      body,
    }: {
      competitionId: string;
      body: Parameters<typeof platformGlobalRankingService.upsertReward>[1];
    }) => platformGlobalRankingService.upsertReward(competitionId, body),
    onSuccess: () => {
      invalidate();
      setRewardOpen(null);
    },
  });

  const finalize = useMutation({
    mutationFn: (id: string) => platformGlobalRankingService.finalize(id),
    onSuccess: invalidate,
  });

  const delivery = useMutation({
    mutationFn: ({
      winnerId,
      deliveryStatus,
    }: {
      winnerId: string;
      deliveryStatus: GlobalRewardDeliveryStatus;
    }) => platformGlobalRankingService.updateDelivery(winnerId, { deliveryStatus }),
    onSuccess: invalidate,
  });

  const selected = detail.data?.competition ?? null;
  const items = list.data?.items ?? [];

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('platformAdmin.globalRanking.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.globalRanking.hint')}</p>
        </div>
        <button
          type="button"
          className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          onClick={() => setCreateOpen(true)}
        >
          {t('platformAdmin.globalRanking.create')}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <SectionCard title={t('platformAdmin.globalRanking.competitions')}>
          {list.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : list.isError ? (
            <ErrorState
              title={t('platformAdmin.globalRanking.loadFailed')}
              message={t('common.retry')}
              onRetry={() => void list.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState icon={Trophy} title={t('platformAdmin.globalRanking.empty')} />
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-input px-3 py-2 text-left text-sm ${
                      selectedId === item.id
                        ? 'bg-brand-50 font-semibold text-brand-800'
                        : 'hover:bg-surface-hover'
                    }`}
                  >
                    <span className="block">{item.periodKey}</span>
                    <span className="text-xs text-ink-muted">{item.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          {!selectedId ? (
            <p className="text-sm text-ink-muted">{t('platformAdmin.globalRanking.select')}</p>
          ) : detail.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : !selected ? (
            <ErrorState
              title={t('platformAdmin.globalRanking.loadFailed')}
              message={t('common.retry')}
              onRetry={() => void detail.refetch()}
            />
          ) : (
            <>
              <CompetitionDetail
                competition={selected}
                onFinalize={() => void finalize.mutateAsync(selected.id)}
                finalizePending={finalize.isPending}
                onEditReward={(place) => setRewardOpen(place)}
                onDelivery={(winnerId, deliveryStatus) =>
                  void delivery.mutateAsync({ winnerId, deliveryStatus })
                }
              />
              {finalize.isError ? (
                <p className="text-sm text-danger-700">
                  {finalize.error instanceof ApiClientError
                    ? finalize.error.message
                    : t('common.retry')}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        title={t('platformAdmin.globalRanking.create')}
        onClose={() => setCreateOpen(false)}
      >
        <CreateCompetitionForm
          pending={upsert.isPending}
          onSubmit={(body) => void upsert.mutateAsync(body)}
        />
      </Dialog>

      <Dialog
        open={Boolean(rewardOpen && selected)}
        title={t('platformAdmin.globalRanking.editReward')}
        onClose={() => setRewardOpen(null)}
      >
        {rewardOpen && selected ? (
          <RewardForm
            place={rewardOpen}
            existing={selected.rewards.find((r) => r.place === rewardOpen)}
            pending={upsertReward.isPending}
            onSubmit={(body) =>
              void upsertReward.mutateAsync({ competitionId: selected.id, body })
            }
          />
        ) : null}
      </Dialog>
    </PageContainer>
  );
}

function CompetitionDetail({
  competition,
  onFinalize,
  finalizePending,
  onEditReward,
  onDelivery,
}: {
  competition: PlatformGlobalCompetitionDetailDto;
  onFinalize: () => void;
  finalizePending: boolean;
  onEditReward: (place: GlobalRewardPlace) => void;
  onDelivery: (winnerId: string, status: GlobalRewardDeliveryStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <SectionCard title={competition.title}>
        <p className="text-sm text-ink-muted">
          {competition.periodKey} · {competition.status}
        </p>
        {competition.description ? (
          <p className="mt-2 text-sm text-ink">{competition.description}</p>
        ) : null}
        {competition.status !== GlobalCompetitionStatus.FINALIZED ? (
          <button
            type="button"
            disabled={finalizePending}
            onClick={onFinalize}
            className="mt-3 rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t('platformAdmin.globalRanking.finalize')}
          </button>
        ) : null}
      </SectionCard>

      <SectionCard title={t('platformAdmin.globalRanking.rewards')}>
        <ul className="space-y-2">
          {([GlobalRewardPlace.FIRST, GlobalRewardPlace.SECOND, GlobalRewardPlace.THIRD] as const).map(
            (place) => {
              const reward = competition.rewards.find((r) => r.place === place);
              return (
                <li
                  key={place}
                  className="flex items-center justify-between gap-2 rounded-input border border-line px-3 py-2 text-sm"
                >
                  <span>
                    {place}: {reward?.title ?? t('platformAdmin.globalRanking.rewardEmpty')}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-brand-700 hover:underline"
                    onClick={() => onEditReward(place)}
                  >
                    {t('common.edit')}
                  </button>
                </li>
              );
            },
          )}
        </ul>
      </SectionCard>

      <SectionCard title={t('platformAdmin.globalRanking.winners')}>
        {competition.winners.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('platformAdmin.globalRanking.noWinners')}</p>
        ) : (
          <ul className="space-y-2">
            {competition.winners.map((winner) => (
              <li
                key={winner.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-line px-3 py-2 text-sm"
              >
                <span>
                  #{winner.place} {winner.displayName} · {winner.periodXp} XP
                </span>
                <select
                  className={fieldClass + ' max-w-[10rem]'}
                  value={winner.deliveryStatus}
                  onChange={(e) =>
                    onDelivery(winner.id, e.target.value as GlobalRewardDeliveryStatus)
                  }
                >
                  {Object.values(GlobalRewardDeliveryStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function CreateCompetitionForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (body: {
    periodKey: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    status: typeof GlobalCompetitionStatus.ACTIVE;
  }) => void;
}) {
  const { t } = useTranslation();
  const defaultKey = useMemo(() => periodKeyNow(), []);
  const [periodKey, setPeriodKey] = useState(defaultKey);
  const [title, setTitle] = useState(`Monthly Competition · ${defaultKey}`);
  const [description, setDescription] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const bounds = monthIsoBounds(periodKey);
    onSubmit({
      periodKey,
      title,
      description: description.trim() || null,
      startsAt: bounds.startsAt,
      endsAt: bounds.endsAt,
      status: GlobalCompetitionStatus.ACTIVE,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>{t('platformAdmin.globalRanking.periodKey')}</span>
        <input
          className={fieldClass}
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          pattern="\d{4}-\d{2}"
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('platformAdmin.globalRanking.competitionTitle')}</span>
        <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t('platformAdmin.globalRanking.description')}</span>
        <textarea
          className={fieldClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <button type="submit" disabled={pending} className="pf-btn-primary w-full disabled:opacity-60">
        {t('common.save')}
      </button>
    </form>
  );
}

function RewardForm({
  place,
  existing,
  pending,
  onSubmit,
}: {
  place: GlobalRewardPlace;
  existing?: GlobalMonthlyCompetitionDto['rewards'][number];
  pending: boolean;
  onSubmit: (body: {
    place: GlobalRewardPlace;
    title: string;
    description: string | null;
    valueText: string | null;
    imageUrl: string | null;
  }) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [valueText, setValueText] = useState(existing?.valueText ?? '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? '');

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          place,
          title,
          description: description.trim() || null,
          valueText: valueText.trim() || null,
          imageUrl: imageUrl.trim() || null,
        });
      }}
    >
      <p className="text-sm text-ink-muted">{place}</p>
      <input
        className={fieldClass}
        placeholder={t('platformAdmin.globalRanking.rewardTitle')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        className={fieldClass}
        rows={2}
        placeholder={t('platformAdmin.globalRanking.description')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className={fieldClass}
        placeholder={t('platformAdmin.globalRanking.rewardValue')}
        value={valueText}
        onChange={(e) => setValueText(e.target.value)}
      />
      <input
        className={fieldClass}
        placeholder={t('platformAdmin.globalRanking.rewardImage')}
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <button type="submit" disabled={pending} className="pf-btn-primary w-full disabled:opacity-60">
        {t('common.save')}
      </button>
    </form>
  );
}
