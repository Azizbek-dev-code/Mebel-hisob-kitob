import { AppFeedbackKind } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { personalGrowthFriendsService } from '@/services/personal-growth-friends.service';
import { personalGrowthRankingService } from '@/services/personal-growth-ranking.service';

export function PersonalGlobalRankingProfilePage() {
  const { t } = useTranslation();
  const { identityId = '' } = useParams();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ['personal', 'ranking', 'profile', identityId],
    queryFn: ({ signal }) => personalGrowthRankingService.profile(identityId, signal),
    enabled: Boolean(identityId),
  });
  const request = useMutation({
    mutationFn: () => personalGrowthFriendsService.request({ identityId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['personal', 'ranking', 'profile', identityId] }),
  });
  const like = useMutation({
    mutationFn: (id: string) => personalGrowthRankingService.like(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['personal', 'ranking', 'profile', identityId] }),
  });

  if (profile.isPending) return <Skeleton className="h-48 w-full" />;
  if (profile.isError || !profile.data) {
    return (
      <ErrorState
        title={t('personal.rankingLoadFailed')}
        message={t('common.retry')}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const item = profile.data.profile;
  const canRequest = item.friendshipStatus === 'NONE' && item.allowFriendRequests;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface px-4 py-3.5">
        <h1 className="text-lg font-semibold text-ink">{item.displayName}</h1>
        {item.handle ? <p className="text-sm text-ink-muted">@{item.handle}</p> : null}
        <p className="mt-2 text-sm text-ink-muted">
          Level {item.level} · {item.totalXp} XP · {item.currentStreak}d
        </p>
        {canRequest ? (
          <button
            type="button"
            disabled={request.isPending}
            onClick={() => request.mutate()}
            className="mt-3 rounded-input bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t('personal.rankingAddFriend')}
          </button>
        ) : null}
        {item.friendshipStatus === 'FRIENDS' ? (
          <p className="mt-3 text-xs text-ink-muted">{t('personal.rankingAlreadyFriends')}</p>
        ) : null}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">{t('personal.rankingFeedback')}</h2>
        {item.feedback.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('personal.rankingFeedbackEmpty')}</p>
        ) : (
          item.feedback.map((row) => (
            <article key={row.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <p className="text-xs text-ink-muted">
                {row.kind === AppFeedbackKind.ONBOARDING_EXPECTATION
                  ? t('personal.feedbackKindOnboarding')
                  : row.kind === AppFeedbackKind.SUBSCRIPTION_OUTCOME
                    ? t('personal.feedbackKindOutcome')
                    : t('personal.feedbackKindVoluntary')}
                {row.rating ? ` · ${row.rating}★` : ''}
              </p>
              <p className="mt-1 text-sm text-ink">{row.body}</p>
              <div className="mt-2 flex gap-3 text-xs text-ink-muted">
                <button type="button" onClick={() => like.mutate(row.id)}>
                  ♥ {row.likeCount}
                </button>
                <span>👁 {row.viewCount}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
