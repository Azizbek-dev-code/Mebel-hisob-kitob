import {
  GlobalLeaderboardPeriod,
  type GlobalMonthlyRewardDto,
  type GlobalRankingEntryDto,
} from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { personalGrowthRankingService } from '@/services/personal-growth-ranking.service';

const PERIODS = [
  GlobalLeaderboardPeriod.MONTHLY,
  GlobalLeaderboardPeriod.WEEKLY,
  GlobalLeaderboardPeriod.ALL,
] as const;

function rankingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const detail = error.details?.[0]?.message;
    const primary = detail ?? error.message;
    if (primary && primary.trim()) return primary;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function PersonalGlobalRankingPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(GlobalLeaderboardPeriod.MONTHLY);
  const [page, setPage] = useState(1);

  const competition = useQuery({
    queryKey: ['personal', 'monthly-competition'],
    queryFn: ({ signal }) => personalGrowthRankingService.monthlyCompetition(signal),
  });
  const history = useQuery({
    queryKey: ['personal', 'monthly-competition', 'history'],
    queryFn: ({ signal }) => personalGrowthRankingService.winnersHistory(signal),
  });
  const list = useQuery({
    queryKey: ['personal', 'ranking', period, page],
    queryFn: ({ signal }) => personalGrowthRankingService.list(period, page, signal),
  });

  const top3 =
    period === GlobalLeaderboardPeriod.MONTHLY && competition.data?.top3.length
      ? competition.data.top3
      : (list.data?.items.filter((row) => row.rank <= 3) ?? []);
  const rewards = competition.data?.competition?.rewards ?? [];
  const myEntry =
    period === GlobalLeaderboardPeriod.MONTHLY
      ? (competition.data?.myEntry ?? list.data?.myEntry)
      : list.data?.myEntry;
  const xpToTop3 = competition.data?.xpToTop3 ?? null;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="pf-page-title">{t('personal.rankingTitle')}</h1>
        <p className="pf-page-hint">{t('personal.rankingHint')}</p>
      </div>

      {competition.data?.competition ? (
        <section className="pf-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
            {t('personal.rankingMonthlyCompetition')}
          </p>
          <h2 className="mt-1 pf-section-title">{competition.data.competition.title}</h2>
          <p className="mt-1 text-xs text-ink-muted">
            {competition.data.competition.periodKey}
            {' · '}
            {t(`personal.competitionStatus.${competition.data.competition.status}`)}
          </p>
          {competition.data.competition.description ? (
            <p className="mt-2 text-sm text-ink-muted">{competition.data.competition.description}</p>
          ) : null}
          {rewards.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-line/70 pt-3">
              {rewards.map((reward) => (
                <RewardRow key={reward.id} reward={reward} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">{t('personal.rankingNoRewards')}</p>
          )}
        </section>
      ) : competition.isPending ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : (
        <p className="text-sm text-ink-muted">{t('personal.rankingNoCompetition')}</p>
      )}

      {top3.length > 0 ? (
        <section className="grid grid-cols-3 items-end gap-2">
          {[top3.find((e) => e.rank === 2), top3.find((e) => e.rank === 1), top3.find((e) => e.rank === 3)].map(
            (entry, slot) =>
              entry ? (
                <PodiumCard
                  key={entry.identityId}
                  entry={entry}
                  elevated={slot === 1}
                  reward={rewards.find((r) =>
                    entry.rank === 1
                      ? r.place === 'FIRST'
                      : entry.rank === 2
                        ? r.place === 'SECOND'
                        : r.place === 'THIRD',
                  )}
                />
              ) : (
                <div key={slot} />
              ),
          )}
        </section>
      ) : null}

      {myEntry && myEntry.rank > 0 ? (
        <section className="pf-card border-brand-200 bg-brand-50/40 p-4">
          <p className="text-xs font-medium text-brand-700">{t('personal.rankingYourPosition')}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">#{myEntry.rank}</p>
          <p className="mt-1 text-sm font-medium text-ink">{myEntry.displayName}</p>
          <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
            Lv {myEntry.level} · {myEntry.periodXp} XP
          </p>
          {xpToTop3 != null && xpToTop3 > 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              {t('personal.rankingXpToTop3', { count: xpToTop3 })}
            </p>
          ) : myEntry.rank <= 3 ? (
            <p className="mt-2 text-xs font-medium text-success-600">{t('personal.rankingInTop3')}</p>
          ) : null}
        </section>
      ) : list.data && !list.data.showMeInRanking ? (
        <p className="text-sm text-ink-muted">{t('personal.rankingOptedOut')}</p>
      ) : (
        <p className="text-sm text-ink-muted">{t('personal.rankingNoRankYet')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPeriod(value);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              period === value
                ? 'bg-brand-600 text-white'
                : 'border border-line text-ink-muted hover:bg-surface-hover',
            )}
          >
            {t(`personal.rankingPeriod.${value}`)}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.rankingLoadFailed')}
          message={rankingErrorMessage(list.error, t('common.retry'))}
          onRetry={() => void list.refetch()}
        />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-ink-muted">{t('personal.rankingEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {list.data?.items.map((entry) => (
            <li key={entry.identityId}>
              <RankRow entry={entry} />
            </li>
          ))}
        </ul>
      )}

      {list.data && list.data.totalPages > 1 ? (
        <div className="flex justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.previous')}
          </button>
          <span className="tabular-nums">
            {page}/{list.data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= list.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next')}
          </button>
        </div>
      ) : null}

      {(history.data?.items.length ?? 0) > 0 ? (
        <section className="space-y-3">
          <h2 className="pf-section-title">{t('personal.rankingPreviousWinners')}</h2>
          {history.data?.items.map((item) => (
            <div key={item.competition.id} className="pf-card p-4">
              <p className="text-sm font-semibold text-ink">{item.competition.periodKey}</p>
              <ul className="mt-2 space-y-1.5">
                {item.winners.map((winner) => (
                  <li key={winner.id} className="flex justify-between gap-2 text-sm">
                    <span>
                      {medal(winner.place)} {winner.displayName}
                    </span>
                    <span className="tabular-nums text-xs text-ink-muted">{winner.periodXp} XP</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function RewardRow({ reward }: { reward: GlobalMonthlyRewardDto }) {
  const { t } = useTranslation();
  const placeLabel =
    reward.place === 'FIRST' ? '🥇' : reward.place === 'SECOND' ? '🥈' : '🥉';
  return (
    <li className="text-sm">
      <span className="font-medium text-ink">
        {placeLabel} {reward.title}
      </span>
      {reward.valueText ? (
        <span className="ml-2 text-xs text-ink-muted">{reward.valueText}</span>
      ) : null}
      {reward.description ? (
        <p className="mt-0.5 text-xs text-ink-muted">{reward.description}</p>
      ) : (
        <p className="mt-0.5 text-xs text-ink-muted">{t(`personal.rewardPlace.${reward.place}`)}</p>
      )}
    </li>
  );
}

function PodiumCard({
  entry,
  elevated,
  reward,
}: {
  entry: GlobalRankingEntryDto;
  elevated?: boolean;
  reward?: GlobalMonthlyRewardDto;
}) {
  return (
    <Link
      to={ROUTES.personalRankingProfile(entry.identityId)}
      className={cn(
        'pf-card block px-2 py-3 text-center',
        elevated && 'pb-5 pt-4 shadow-raised',
        entry.isMe && 'border-brand-200 bg-brand-50/50',
      )}
    >
      <p className="text-lg">{medal(entry.rank)}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{entry.displayName}</p>
      <p className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
        Lv {entry.level} · {entry.periodXp} XP
      </p>
      {reward ? (
        <p className="mt-1 truncate text-[10px] text-brand-700">{reward.title}</p>
      ) : null}
    </Link>
  );
}

function RankRow({ entry }: { entry: GlobalRankingEntryDto }) {
  return (
    <Link
      to={ROUTES.personalRankingProfile(entry.identityId)}
      className={cn(
        'flex items-center justify-between rounded-2xl border px-3 py-2.5',
        entry.isMe ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface',
      )}
    >
      <span className="min-w-0">
        <span className="mr-2 tabular-nums text-xs text-ink-muted">#{entry.rank}</span>
        <span className="text-sm font-medium text-ink">{entry.displayName}</span>
        {entry.handle ? <span className="ml-1 text-xs text-ink-muted">@{entry.handle}</span> : null}
      </span>
      <span className="shrink-0 text-right text-xs tabular-nums text-ink-muted">
        Lv {entry.level} · {entry.periodXp} XP
      </span>
    </Link>
  );
}
