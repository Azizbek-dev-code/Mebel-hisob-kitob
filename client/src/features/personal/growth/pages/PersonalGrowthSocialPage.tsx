import {
  GrowthLeaderboardMetric,
  GrowthLeaderboardPeriod,
  type GrowthFriendStreakDto,
  type GrowthLeaderboardEntryDto,
  type GrowthLeaderboardMetric as Metric,
  type GrowthLeaderboardPeriod as Period,
} from '@furniture-erp/shared';
import { Flame, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';

import {
  useGrowthFriendStreaks,
  useGrowthLeaderboard,
} from '../hooks/use-growth-social';

const PERIODS = [GrowthLeaderboardPeriod.WEEKLY, GrowthLeaderboardPeriod.MONTHLY] as const;
const METRICS = [
  GrowthLeaderboardMetric.XP,
  GrowthLeaderboardMetric.FOCUS_MINUTES,
  GrowthLeaderboardMetric.TASKS_COMPLETED,
  GrowthLeaderboardMetric.LEVEL,
] as const;

export function PersonalGrowthSocialPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>(GrowthLeaderboardPeriod.WEEKLY);
  const [metric, setMetric] = useState<Metric>(GrowthLeaderboardMetric.XP);
  const board = useGrowthLeaderboard(period, metric);
  const streaks = useGrowthFriendStreaks();

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.socialTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.socialHint')}</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink">{t('personal.leaderboardTitle')}</h2>
        </div>
        <p className="text-xs text-ink-muted">{t('personal.leaderboardPrivacy')}</p>

        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-input px-3 py-1.5 text-sm font-medium',
                period === p
                  ? 'bg-brand-600 text-white'
                  : 'border border-line text-ink',
              )}
            >
              {t(`personal.leaderboardPeriod.${p}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                'rounded-input px-3 py-1.5 text-xs font-medium',
                metric === m
                  ? 'bg-brand-100 text-brand-800'
                  : 'border border-line text-ink-muted',
              )}
            >
              {t(`personal.leaderboardMetric.${m}`)}
            </button>
          ))}
        </div>

        {board.isPending && !board.data ? (
          <Skeleton className="h-40 w-full" />
        ) : board.isError || !board.data ? (
          <ErrorState
            title={t('personal.leaderboardLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void board.refetch()}
          />
        ) : board.data.entries.length <= 1 ? (
          <p className="rounded-2xl border border-line bg-surface p-3 text-sm text-ink-muted">
            {t('personal.leaderboardNeedFriends')}{' '}
            <Link to={ROUTES.personalGrowthFriends} className="text-brand-700 hover:underline">
              {t('personal.friendsTitle')}
            </Link>
          </p>
        ) : (
          <ol className="space-y-2">
            {board.data.entries.map((entry) => (
              <LeaderboardRow key={entry.identityId} entry={entry} metric={metric} />
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-brand-700" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink">{t('personal.friendStreakTitle')}</h2>
        </div>
        <p className="text-xs text-ink-muted">{t('personal.friendStreakHint')}</p>

        {streaks.isPending && !streaks.data ? (
          <Skeleton className="h-28 w-full" />
        ) : streaks.isError || !streaks.data ? (
          <ErrorState
            title={t('personal.friendStreakLoadFailed')}
            message={t('common.retry')}
            onRetry={() => void streaks.refetch()}
          />
        ) : streaks.data.items.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('personal.friendStreakEmpty')}</p>
        ) : (
          <ul className="space-y-2">
            {streaks.data.items.map((item) => (
              <FriendStreakRow key={item.pairKey} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LeaderboardRow({
  entry,
  metric,
}: {
  entry: GrowthLeaderboardEntryDto;
  metric: Metric;
}) {
  const { t } = useTranslation();
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5',
        entry.isMe && 'border-brand-300 bg-brand-50/40',
      )}
    >
      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-ink-muted">
        {entry.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {entry.fullName}
          {entry.isMe ? ` · ${t('personal.leaderboardYou')}` : ''}
        </p>
        <p className="text-xs text-ink-muted">
          {entry.handle ? `@${entry.handle}` : '—'}
          {entry.level != null ? ` · Lv ${entry.level}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
        {entry.scoreVisible ? (entry.score ?? 0) : t('personal.leaderboardHidden')}
        {entry.scoreVisible && metric === GrowthLeaderboardMetric.XP ? ' XP' : ''}
      </span>
    </li>
  );
}

function FriendStreakRow({ item }: { item: GrowthFriendStreakDto }) {
  const { t } = useTranslation();
  return (
    <li className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.friend.fullName}</p>
          <p className="text-xs text-ink-muted">
            {item.friend.handle ? `@${item.friend.handle}` : '—'}
            {item.bothActiveToday
              ? ` · ${t('personal.friendStreakBothToday')}`
              : ` · ${t('personal.friendStreakNeedToday')}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-ink">
            {item.currentStreak}
            <span className="font-normal text-ink-muted">
              {' '}
              {t('personal.friendStreakDays')}
            </span>
          </p>
          <p className="text-xs text-ink-muted">
            {t('personal.friendStreakBest', { count: item.bestStreak })}
          </p>
        </div>
      </div>
    </li>
  );
}
