import { formatMoney, type GrowthNotificationPrefs, type PersonalNotificationPrefs } from '@furniture-erp/shared';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { TelegramConnectionPanel } from '@/features/telegram/components/TelegramConnectionPanel';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import {
  useDismissGrowthNotification,
  useGrowthNotifications,
  useMarkGrowthNotificationsRead,
  useUpdateGrowthNotificationPrefs,
} from '@/features/personal/growth/hooks/use-growth-notifications';
import { cn } from '@/lib/cn';
import { formatDate } from '@/utils/format';

import { usePersonalNotifications, useUpdatePersonalNotificationPrefs } from '../hooks/use-personal-lifecycle';

const FINANCE_PREF_KEYS = ['notifyDebts', 'notifyRecurring', 'notifyBudget', 'notifyGoals'] as const;
const GROWTH_PREF_KEYS = [
  'notifyReminder',
  'notifyStreak',
  'notifyAchievement',
  'notifyFight',
  'notifyFriend',
  'notifyResult',
] as const;

export function PersonalNotificationsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user && 'subscription' in user && user.subscription?.canWrite);
  const finance = usePersonalNotifications();
  const growth = useGrowthNotifications();
  const updateFinancePrefs = useUpdatePersonalNotificationPrefs();
  const updateGrowthPrefs = useUpdateGrowthNotificationPrefs();
  const markRead = useMarkGrowthNotificationsRead();

  const pending = (finance.isPending && !finance.data) || (growth.isPending && !growth.data);
  const failed = finance.isError || growth.isError;
  const financeItems = finance.data?.items ?? [];
  const growthItems = growth.data?.items ?? [];
  const unread = (finance.data?.unreadCount ?? 0) + (growth.data?.unreadCount ?? 0);

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div>
        <h1 className="pf-page-title">{t('personal.notifications')}</h1>
        <p className="pf-page-hint">{t('personal.notificationsHint')}</p>
      </div>

      {pending ? (
        <Skeleton className="h-32 w-full" />
      ) : failed ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => {
            void finance.refetch();
            void growth.refetch();
          }}
        />
      ) : (
        <>
          <TelegramConnectionPanel surface="personal" />

          {growth.data?.prefs ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">{t('personal.notifySectionGrowth')}</h2>
              <ul className="space-y-2 rounded-panel border border-line bg-surface p-4">
                {GROWTH_PREF_KEYS.map((key) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink">{t(`personal.growthPref.${key}`)}</span>
                    <button
                      type="button"
                      disabled={!canWrite}
                      className={
                        growth.data.prefs[key as keyof GrowthNotificationPrefs]
                          ? 'font-medium text-brand-700'
                          : 'text-ink-muted'
                      }
                      onClick={() =>
                        void updateGrowthPrefs.mutateAsync({
                          [key]: !growth.data.prefs[key as keyof GrowthNotificationPrefs],
                        })
                      }
                    >
                      {growth.data.prefs[key as keyof GrowthNotificationPrefs]
                        ? t('personal.prefOn')
                        : t('personal.prefOff')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {finance.data?.prefs ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">{t('personal.notifySectionFinance')}</h2>
              <ul className="space-y-2 rounded-panel border border-line bg-surface p-4">
                {FINANCE_PREF_KEYS.map((key) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink">{t(`personal.pref.${key}`)}</span>
                    <button
                      type="button"
                      disabled={!canWrite}
                      className={
                        finance.data.prefs[key as keyof PersonalNotificationPrefs]
                          ? 'font-medium text-brand-700'
                          : 'text-ink-muted'
                      }
                      onClick={() =>
                        void updateFinancePrefs.mutateAsync({
                          [key]: !finance.data.prefs[key as keyof PersonalNotificationPrefs],
                        })
                      }
                    >
                      {finance.data.prefs[key as keyof PersonalNotificationPrefs]
                        ? t('personal.prefOn')
                        : t('personal.prefOff')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">
              {t('personal.growthNotificationsUnread', { count: unread })}
            </p>
            {(growth.data?.unreadCount ?? 0) > 0 && canWrite ? (
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

          {financeItems.length === 0 && growthItems.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Bell className="size-4" aria-hidden="true" />
              {t('personal.noNotifications')}
            </p>
          ) : (
            <ul className="space-y-2">
              {growthItems.map((item) => (
                <GrowthRow key={item.id} item={item} canWrite={canWrite} />
              ))}
              {financeItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="block rounded-panel border border-line bg-surface px-4 py-3 text-sm hover:bg-surface-hover"
                  >
                    <p className="font-medium text-ink">{t(`personal.notifyKind.${item.kind}`, { name: item.title })}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {item.title}
                      {item.amountSom != null ? ` · ${formatMoney(item.amountSom)}` : ''}
                      {item.dueAt ? ` · ${formatDate(item.dueAt)}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function GrowthRow({
  item,
  canWrite,
}: {
  item: {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: string | null;
    createdAt: string;
  };
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const dismiss = useDismissGrowthNotification();
  const unread = !item.readAt;
  return (
    <li className={cn('rounded-2xl border border-line bg-surface p-3', unread && 'border-brand-200 bg-brand-50/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {item.href ? (
            <Link to={item.href} className="block hover:opacity-90">
              <p className={cn('text-sm text-ink', unread && 'font-medium')}>
                <span className="text-xs uppercase tracking-wide text-ink-muted">
                  {t(`personal.growthNotifyKind.${item.kind}`)}
                </span>
                <span className="mt-0.5 block">{item.title}</span>
              </p>
              {item.body ? <p className="mt-0.5 text-xs text-ink-muted">{item.body}</p> : null}
              <p className="mt-1 text-xs text-ink-muted">{formatDate(item.createdAt)}</p>
            </Link>
          ) : (
            <>
              <p className={cn('text-sm text-ink', unread && 'font-medium')}>{item.title}</p>
              {item.body ? <p className="mt-0.5 text-xs text-ink-muted">{item.body}</p> : null}
            </>
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
