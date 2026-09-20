import { PresenceVisibility } from '@furniture-erp/shared';
import { type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import {
  useGrowthFriendsPrivacy,
  useUpdateFriendsPrivacy,
} from '@/features/personal/growth/hooks/use-growth-friends';
import { ApiClientError } from '@/lib/api-client';
import { ROUTES } from '@/routes/paths';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const VISIBILITY_OPTIONS = [
  PresenceVisibility.EVERYONE,
  PresenceVisibility.FRIENDS,
  PresenceVisibility.NOBODY,
] as const;

export function PersonalPrivacyPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const privacy = useGrowthFriendsPrivacy();
  const updatePrivacy = useUpdateFriendsPrivacy();

  async function onSave(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalProfile} className="hover:underline">
            {t('personal.navProfile')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.privacyTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.privacyHint')}</p>
      </div>

      {privacy.isPending && !privacy.data ? (
        <Skeleton className="h-40 w-full" />
      ) : privacy.isError ? (
        <ErrorState
          title={t('personal.friendsPrivacyFailed')}
          message={t('common.retry')}
          onRetry={() => void privacy.refetch()}
        />
      ) : (
        <form className="space-y-4 rounded-2xl border border-line bg-surface p-4" onSubmit={(e) => void onSave(e)}>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.privacyOnline')}</span>
            <select
              className={fieldClass}
              disabled={!canWrite}
              value={privacy.data?.onlineStatusVisibility ?? PresenceVisibility.FRIENDS}
              onChange={(e) =>
                void updatePrivacy.mutateAsync({
                  onlineStatusVisibility: e.target.value as (typeof VISIBILITY_OPTIONS)[number],
                })
              }
            >
              {VISIBILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`personal.privacyVisibility.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.privacyLastSeen')}</span>
            <select
              className={fieldClass}
              disabled={!canWrite}
              value={privacy.data?.lastSeenVisibility ?? PresenceVisibility.FRIENDS}
              onChange={(e) =>
                void updatePrivacy.mutateAsync({
                  lastSeenVisibility: e.target.value as (typeof VISIBILITY_OPTIONS)[number],
                })
              }
            >
              {VISIBILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`personal.privacyVisibility.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={privacy.data?.showInGlobalRanking ?? true}
              disabled={!canWrite}
              onChange={(e) => void updatePrivacy.mutateAsync({ showInGlobalRanking: e.target.checked })}
            />
            {t('personal.privacyShowRanking')}
          </label>
          {updatePrivacy.isError ? (
            <p className="text-sm text-danger-700" role="alert">
              {updatePrivacy.error instanceof ApiClientError
                ? updatePrivacy.error.message
                : t('personal.friendsPrivacyFailed')}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
