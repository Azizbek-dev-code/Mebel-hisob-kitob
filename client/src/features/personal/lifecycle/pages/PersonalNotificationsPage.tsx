import { formatMoney, type PersonalNotificationPrefs } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { formatDate } from '@/utils/format';

import { usePersonalNotifications, useUpdatePersonalNotificationPrefs } from '../hooks/use-personal-lifecycle';

const PREF_KEYS = ['notifyBudget', 'notifyGoals', 'notifyRecurring', 'notifyDebts'] as const;

export function PersonalNotificationsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const canWrite = Boolean(user?.subscription?.canWrite);
  const notifications = usePersonalNotifications();
  const updatePrefs = useUpdatePersonalNotificationPrefs();
  const prefs = notifications.data?.prefs;
  const items = notifications.data?.items ?? [];

  function toggle(key: (typeof PREF_KEYS)[number], value: boolean) {
    void updatePrefs.mutateAsync({ [key]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('personal.notifications')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('personal.notificationsHint')}</p>
      </div>

      {notifications.isPending && !notifications.data ? (
        <Skeleton className="h-32 w-full" />
      ) : notifications.isError ? (
        <ErrorState
          title={t('personal.ledgerLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void notifications.refetch()}
        />
      ) : (
        <>
          {prefs ? (
            <ul className="space-y-2 rounded-panel border border-line bg-surface p-4">
              {PREF_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">{t(`personal.pref.${key}`)}</span>
                  <button
                    type="button"
                    disabled={!canWrite}
                    className={prefs[key as keyof PersonalNotificationPrefs] ? 'font-medium text-brand-700' : 'text-ink-muted'}
                    onClick={() => toggle(key, !prefs[key as keyof PersonalNotificationPrefs])}
                  >
                    {prefs[key as keyof PersonalNotificationPrefs] ? t('personal.prefOn') : t('personal.prefOff')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('personal.noNotifications')}</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
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
