import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import {
  useTelegramLinkStart,
  useTelegramStatus,
  useTelegramUnlink,
  useUpdateTelegramPrefs,
} from '@/features/telegram/hooks/use-telegram';
import { cn } from '@/lib/cn';

type Surface = 'business' | 'personal';

/**
 * Simple Telegram link/unlink + channel prefs for Settings → Notifications.
 * Never asks for Chat ID / User ID — only opens a deep-link.
 */
export function TelegramConnectionPanel({ surface }: { surface: Surface }) {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const status = useTelegramStatus();
  const startLink = useTelegramLinkStart();
  const unlink = useTelegramUnlink();
  const updatePrefs = useUpdateTelegramPrefs();
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const data = status.data;
  const connected = Boolean(data?.connected);
  const currentAccount = data?.accounts?.find((account) =>
    surface === 'personal' ? account.type === 'PERSONAL' : account.storeId === user?.storeId,
  );
  const displayName =
    data?.username != null && data.username.length > 0
      ? `@${data.username}`
      : data?.firstName || null;

  async function onLink() {
    setActionError(null);
    setFallbackLink(null);
    try {
      const result = await startLink.mutateAsync();
      const opened = window.open(result.deepLink, '_blank', 'noopener,noreferrer');
      if (!opened) {
        setFallbackLink(result.deepLink);
      }
    } catch {
      setActionError(t('telegram.linkFailed'));
    }
  }

  async function onUnlink() {
    setActionError(null);
    try {
      await unlink.mutateAsync();
      setFallbackLink(null);
    } catch {
      setActionError(t('telegram.unlinkFailed'));
    }
  }

  const busy = startLink.isPending || unlink.isPending || updatePrefs.isPending;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{t('telegram.title')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('telegram.hint')}</p>
      </div>

      {status.isPending && !data ? (
        <p className="text-sm text-ink-muted">{t('app.loading')}</p>
      ) : status.isError ? (
        <p className="text-sm text-danger">{t('telegram.statusFailed')}</p>
      ) : (
        <div className="space-y-3 rounded-panel border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {connected ? t('telegram.connected') : t('telegram.disconnected')}
              </p>
              {connected && displayName ? (
                <p className="truncate text-sm text-ink-muted">{displayName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {connected ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-hover disabled:opacity-60"
                    onClick={() => void onLink()}
                  >
                    {t('telegram.relink')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger disabled:opacity-60"
                    onClick={() => void onUnlink()}
                  >
                    {t('telegram.unlink')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  onClick={() => void onLink()}
                >
                  {t('telegram.link')}
                </button>
              )}
            </div>
          </div>

          {fallbackLink ? (
            <p className="text-sm text-ink-muted">
              {t('telegram.openFallback')}{' '}
              <a
                href={fallbackLink}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-700 underline"
              >
                {t('telegram.openInTelegram')}
              </a>
            </p>
          ) : null}

          {actionError ? <p className="text-sm text-danger">{actionError}</p> : null}

          {connected && data ? (
            <ul className="space-y-2 border-t border-line pt-3">
              {surface === 'business' ? (
                <PrefRow
                  label={currentAccount?.name || t('telegram.pref.notifyBusiness')}
                  on={currentAccount ? currentAccount.notifyEnabled : data.notifyBusiness}
                  disabled={busy}
                  onToggle={() => {
                    if (currentAccount) {
                      void updatePrefs.mutateAsync({
                        accountPrefs: [
                          {
                            workspaceId: currentAccount.workspaceId,
                            notifyEnabled: !currentAccount.notifyEnabled,
                          },
                        ],
                      });
                      return;
                    }
                    void updatePrefs.mutateAsync({ notifyBusiness: !data.notifyBusiness });
                  }}
                />
              ) : (
                <PrefRow
                  label={currentAccount?.name || t('telegram.pref.notifyPersonal')}
                  on={currentAccount ? currentAccount.notifyEnabled : data.notifyPersonal}
                  disabled={busy}
                  onToggle={() => {
                    if (currentAccount) {
                      void updatePrefs.mutateAsync({
                        accountPrefs: [
                          {
                            workspaceId: currentAccount.workspaceId,
                            notifyEnabled: !currentAccount.notifyEnabled,
                          },
                        ],
                      });
                      return;
                    }
                    void updatePrefs.mutateAsync({ notifyPersonal: !data.notifyPersonal });
                  }}
                />
              )}
              {surface === 'business' ? (
                <PrefRow
                  label={t('telegram.pref.notifyDailySummaryBusiness')}
                  on={data.notifyDailySummaryBusiness}
                  disabled={busy || !data.notifyBusiness}
                  onToggle={() =>
                    void updatePrefs.mutateAsync({
                      notifyDailySummaryBusiness: !data.notifyDailySummaryBusiness,
                    })
                  }
                />
              ) : (
                <PrefRow
                  label={t('telegram.pref.notifyDailySummaryPersonal')}
                  on={data.notifyDailySummaryPersonal}
                  disabled={busy || !data.notifyPersonal}
                  onToggle={() =>
                    void updatePrefs.mutateAsync({
                      notifyDailySummaryPersonal: !data.notifyDailySummaryPersonal,
                    })
                  }
                />
              )}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PrefRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink">{label}</span>
      <button
        type="button"
        disabled={disabled}
        className={cn(on ? 'font-medium text-brand-700' : 'text-ink-muted', 'disabled:opacity-60')}
        onClick={onToggle}
      >
        {on ? t('settings.prefOn') : t('settings.prefOff')}
      </button>
    </li>
  );
}
