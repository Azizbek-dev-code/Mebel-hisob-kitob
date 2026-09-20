import type { BusinessNotificationDto, BusinessNotificationPrefs } from '@furniture-erp/shared';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { TelegramConnectionPanel } from '@/features/telegram/components/TelegramConnectionPanel';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { formatDateTime } from '@/utils/format';

import {
  useBusinessNotifications,
  useMarkBusinessNotificationsRead,
  useUpdateBusinessNotificationPrefs,
} from './use-business-notifications';

const PREF_KEYS = [
  'notifySales',
  'notifyInventory',
  'notifyDelivery',
  'notifyAssembly',
  'notifyWorkers',
  'notifyBilling',
  'notifyImportant',
] as const;

export function BusinessNotificationsPage() {
  const { t } = useTranslation();
  const query = useBusinessNotifications();
  const updatePrefs = useUpdateBusinessNotificationPrefs();
  const markRead = useMarkBusinessNotificationsRead();

  useEffect(() => {
    if (query.data && query.data.unreadCount > 0) {
      void markRead.mutateAsync({});
    }
    // Mark once per successful load of unread items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.unreadCount]);

  return (
    <PageContainer className="space-y-5">
      <PageHeader title={t('settings.hubNotifications')} backTo={ROUTES.settings} backLabel={t('nav.profile')} />
      <p className="text-sm text-ink-muted">{t('settings.hubNotificationsHint')}</p>

      {query.isPending && !query.data ? (
        <Skeleton className="h-32 w-full" />
      ) : query.isError ? (
        <ErrorState
          title={t('settings.notifyLoadFailed')}
          message={t('common.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <TelegramConnectionPanel surface="business" />

          {query.data?.prefs ? <PrefsList prefs={query.data.prefs} onToggle={(key) => void updatePrefs.mutateAsync({ [key]: !query.data.prefs[key] })} /> : null}

          {(query.data?.items.length ?? 0) === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Bell className="size-4" aria-hidden="true" />
              {t('settings.noNotifications')}
            </p>
          ) : (
            <ul className="space-y-2">
              {(query.data?.items ?? []).map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}

function PrefsList({
  prefs,
  onToggle,
}: {
  prefs: BusinessNotificationPrefs;
  onToggle: (key: (typeof PREF_KEYS)[number]) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-ink">{t('settings.notifyPrefs')}</h2>
      <ul className="space-y-2 rounded-panel border border-line bg-surface p-4">
        {PREF_KEYS.map((key) => (
          <li key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">{t(`settings.pref.${key}`)}</span>
            <button
              type="button"
              className={prefs[key] ? 'font-medium text-brand-700' : 'text-ink-muted'}
              onClick={() => onToggle(key)}
            >
              {prefs[key] ? t('settings.prefOn') : t('settings.prefOff')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationRow({ item }: { item: BusinessNotificationDto }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={item.href}
        className={cn(
          'block rounded-panel border border-line bg-surface px-4 py-3 text-sm hover:bg-surface-hover',
          !item.read && 'border-brand-200 bg-brand-50/30',
        )}
      >
        <p className="font-medium text-ink">{item.title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {t(`settings.notifyCategory.${item.category}`)}
          {item.body ? ` · ${item.body}` : ''}
          {item.createdAt ? ` · ${formatDateTime(item.createdAt)}` : ''}
        </p>
      </Link>
    </li>
  );
}
