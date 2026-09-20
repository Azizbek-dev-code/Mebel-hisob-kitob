import { GlobalLeaderboardPeriod, type GlobalRankingEntryDto } from '@furniture-erp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';
import { personalGrowthRankingService } from '@/services/personal-growth-ranking.service';

const PERIODS = [
  GlobalLeaderboardPeriod.ALL,
  GlobalLeaderboardPeriod.MONTHLY,
  GlobalLeaderboardPeriod.WEEKLY,
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

export function PersonalGlobalRankingPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(GlobalLeaderboardPeriod.ALL);
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['personal', 'ranking', period, page],
    queryFn: ({ signal }) => personalGrowthRankingService.list(period, page, signal),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.rankingTitle')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.rankingHint')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPeriod(value);
              setPage(1);
            }}
            className={
              period === value
                ? 'rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                : 'rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted'
            }
          >
            {t(`personal.rankingPeriod.${value}`)}
          </button>
        ))}
      </div>
      {list.data?.myEntry ? <RankRow entry={list.data.myEntry} highlight /> : null}
      {list.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.rankingLoadFailed')}
          message={rankingErrorMessage(list.error, t('common.retry'))}
          onRetry={() => void list.refetch()}
        />
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
            {t('common.prev', { defaultValue: 'Oldingi' })}
          </button>
          <span>
            {page}/{list.data.totalPages}
          </span>
          <button type="button" disabled={page >= list.data.totalPages} onClick={() => setPage((p) => p + 1)}>
            {t('common.next', { defaultValue: 'Keyingi' })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RankRow({ entry, highlight }: { entry: GlobalRankingEntryDto; highlight?: boolean }) {
  return (
    <Link
      to={ROUTES.personalRankingProfile(entry.identityId)}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 ${
        highlight || entry.isMe ? 'border-brand-200 bg-brand-50' : 'border-line bg-surface'
      }`}
    >
      <span className="min-w-0">
        <span className="mr-2 tabular-nums text-xs text-ink-muted">#{entry.rank}</span>
        <span className="text-sm font-medium text-ink">{entry.displayName}</span>
        {entry.handle ? <span className="ml-1 text-xs text-ink-muted">@{entry.handle}</span> : null}
      </span>
      <span className="shrink-0 text-right text-xs text-ink-muted">
        Lv {entry.level} · {entry.periodXp} XP · {entry.currentStreak}d
      </span>
    </Link>
  );
}
