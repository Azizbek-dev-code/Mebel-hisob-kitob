import type {
  GrowthNotificationDto,
  GrowthNotificationPrefs,
} from '@furniture-erp/shared';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDate } from '@/utils/format';

import {
  useDismissGrowthNotification,
  useGrowthNotifications,
  useMarkGrowthNotificationsRead,
  useUpdateGrowthNotificationPrefs,
} from '../hooks/use-growth-notifications';

const PREF_KEYS = [
  'notifyReminder',
  'notifyAchievement',
  'notifyFriend',
  'notifyFight',
  'notifyStreak',
  'notifyResult',
] as const;

export function PersonalGrowthNotificationsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const list = useGrowthNotifications();
  const markRead = useMarkGrowthNotificationsRead();
  const updatePrefs = useUpdateGrowthNotificationPrefs();
  const prefs = list.data?.prefs;
  const items = list.data?.items ?? [];

  function toggle(key: (typeof PREF_KEYS)[number], value: boolean) {
    void updatePrefs.mutateAsync({ [key]: value });
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <p className="text-xs font-medium text-brand-700">
          <Link to={ROUTES.personalGrowth} className="hover:underline">
            {t('personal.navGrowth')}
          </Link>
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
          {t('personal.growthNotificationsTitle')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.growthNotificationsHint')}</p>
      </div>

      {list.isPending && !list.data ? (
        <Skeleton className="h-40 w-full" />
      ) : list.isError ? (
        <ErrorState
          title={t('personal.growthNotificationsLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void list.refetch()}
        />
      ) : (
        <>
          {prefs ? (
            <ul className="space-y-2 rounded-2xl border border-line bg-surface p-3">
              {PREF_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">{t(`personal.growthPref.${key}`)}</span>
                  <button
                    type="button"
                    disabled={!canWrite || updatePrefs.isPending}
                    className={
                      prefs[key as keyof GrowthNotificationPrefs]
                        ? 'font-medium text-brand-700'
                        : 'text-ink-muted'
                    }
                    onClick={() => toggle(key, !prefs[key as keyof GrowthNotificationPrefs])}
                  >
                    {prefs[key as keyof GrowthNotificationPrefs]
                      ? t('personal.prefOn')
                      : t('personal.prefOff')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">
              {t('personal.growthNotificationsUnread', {
                count: list.data?.unreadCount ?? 0,
              })}
            </p>
            {(list.data?.unreadCount ?? 0) > 0 && canWrite ? (
              <button
                type="button"
                className="text-sm font-medium text-brand-700 disabled:opacity-60"
                disabled={markRead.isPending}
                onClick={() => void markRead.mutateAsync({})}
              >
                {t('personal.growthNotificationsMarkAll')}
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Bell className="size-4" aria-hidden="true" />
              {t('personal.growthNotificationsEmpty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} canWrite={canWrite} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  canWrite,
}: {
  item: GrowthNotificationDto;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const dismiss = useDismissGrowthNotification();
  const unread = !item.readAt;

  const content = (
    <>
      <p className={cn('text-sm text-ink', unread && 'font-medium')}>
        <span className="text-xs uppercase tracking-wide text-ink-muted">
          {t(`personal.growthNotifyKind.${item.kind}`)}
        </span>
        <span className="mt-0.5 block">{item.title}</span>
      </p>
      {item.body ? <p className="mt-0.5 text-xs text-ink-muted">{item.body}</p> : null}
      <p className="mt-1 text-xs text-ink-muted">{formatDate(item.createdAt)}</p>
    </>
  );

  return (
    <li
      className={cn(
        'rounded-2xl border border-line bg-surface p-3',
        unread && 'border-brand-200 bg-brand-50/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {item.href ? (
            <Link to={item.href} className="block hover:opacity-90">
              {content}
            </Link>
          ) : (
            content
          )}
        </div>
        {canWrite ? (
          <button
            type="button"
            className="shrink-0 text-xs text-ink-muted hover:text-ink disabled:opacity-60"
            disabled={dismiss.isPending}
            onClick={() => void dismiss.mutateAsync(item.id)}
          >
            {t('personal.growthNotificationsDismiss')}
          </button>
        ) : null}
      </div>
    </li>
  );
}
