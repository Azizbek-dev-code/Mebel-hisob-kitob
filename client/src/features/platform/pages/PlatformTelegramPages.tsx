import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/routes/paths';
import type {
  TelegramBroadcastAudience,
  TelegramMenuButtonAction,
  TelegramMenuScreenDto,
} from '@furniture-erp/shared';

import { composerError, TelegramComposer, validateTelegramComposerFields, type TelegramComposerValue } from '../components/TelegramComposer';
import { MetricList, MetricRow } from '../components/MetricList';
import {
  useCancelTelegramBroadcast,
  useCreateTelegramBroadcast,
  usePlatformTelegramBroadcasts,
  usePlatformTelegramMenu,
  usePlatformTelegramStart,
  usePlatformTelegramStats,
  usePlatformTelegramStatus,
  usePlatformTelegramUsers,
  useUpdateTelegramBotToken,
  useUpdateTelegramMenuScreen,
  useUpdateTelegramStartMessage,
} from '../hooks/use-platform-telegram';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ');
}

export function PlatformTelegramPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramStatus();
  const data = query.data;

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.title')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.telegram.hint')}</p>
      </div>
      {query.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <ErrorState
          title={t('platformAdmin.telegram.title')}
          message={t('common.retry')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <SectionCard title={t('nav.telegram')}>
            <MetricList>
              <MetricRow
                label="Status"
                value={data?.connected ? `🟢 ${t('platformAdmin.telegram.connected')}` : `⚪ ${t('platformAdmin.telegram.notConnected')}`}
              />
              <MetricRow label="Bot" value={data?.botUsername ?? '—'} />
              <MetricRow
                label={t('platformAdmin.telegram.webhook')}
                value={
                  data?.webhook?.active
                    ? `🟢 ${t('platformAdmin.telegram.webhookActive')}`
                    : t('platformAdmin.telegram.webhookInactive')
                }
              />
              <MetricRow
                label={t('platformAdmin.telegram.users')}
                value={String(data?.connectedUsers ?? 0)}
                to={ROUTES.platformTelegramUsers}
              />
            </MetricList>
          </SectionCard>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramBot}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.botSettings')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramStart}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.startMessage')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramMenu}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.menu')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramBroadcast}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.newBroadcast')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramAutomations}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.automations')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramStats}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.stats')}</p>
            </Link>
            <Link className="rounded-panel border border-line bg-surface p-4 hover:bg-surface-hover" to={ROUTES.platformTelegramUsers}>
              <p className="font-medium text-ink">{t('platformAdmin.telegram.users')}</p>
            </Link>
          </div>
        </>
      )}
    </PageContainer>
  );
}

export function PlatformTelegramBotPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramStatus();
  const save = useUpdateTelegramBotToken();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const data = query.data;

  async function onSave() {
    setError(null);
    try {
      await save.mutateAsync({ token });
      setToken('');
    } catch (caught) {
      setError(composerError(caught, t('platformAdmin.telegram.tokenInvalid')));
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.botSettings')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.telegram.tokenHint')}</p>
      </div>
      {query.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <SectionCard title={t('platformAdmin.telegram.tokenLabel')}>
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-ink">
              Bot token: {data?.tokenConfigured ? '••••••••••••' : '—'}
            </p>
            <p className="text-sm text-ink-muted">
              Status: {data?.connected ? t('platformAdmin.telegram.connected') : t('platformAdmin.telegram.notConnected')}
            </p>
            {data?.webhook ? (
              <div className="space-y-1 break-all text-sm text-ink-muted">
                <p>
                  {t('platformAdmin.telegram.webhook')}: {data.webhook.url || data.webhook.configuredUrl}
                </p>
                {data.webhook.url && data.webhook.url !== data.webhook.configuredUrl ? (
                  <p>Expected: {data.webhook.configuredUrl}</p>
                ) : null}
                {typeof data.webhook.pendingUpdateCount === 'number' ? (
                  <p>Pending updates: {data.webhook.pendingUpdateCount}</p>
                ) : null}
                {data.webhook.lastErrorMessage ? (
                  <p className="text-danger-700">{data.webhook.lastErrorMessage}</p>
                ) : null}
                <p>
                  {t('platformAdmin.telegram.lastChecked')}: {formatDate(data.webhook.lastCheckedAt)}
                </p>
              </div>
            ) : null}
            <input
              type="password"
              autoComplete="off"
              className={fieldClass}
              placeholder={t('platformAdmin.telegram.tokenPlaceholder')}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            {error ? <p role="alert" className="text-sm text-danger-700">{error}</p> : null}
            <button
              type="button"
              disabled={save.isPending || token.trim().length < 20}
              onClick={() => void onSave()}
              className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {t('platformAdmin.telegram.save')}
            </button>
          </div>
        </SectionCard>
      )}
    </PageContainer>
  );
}

export function PlatformTelegramStartPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramStart();
  const save = useUpdateTelegramStartMessage();
  const [value, setValue] = useState<TelegramComposerValue>({
    text: '',
    imageUrl: '',
    buttonText: '',
    buttonUrl: '',
  });
  const [detailButton, setDetailButton] = useState('📚 Batafsil');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setValue({
      text: query.data.text,
      imageUrl: query.data.imageUrl ?? '',
      buttonText: query.data.buttonText ?? query.data.buttons?.[0]?.text ?? '',
      buttonUrl: query.data.buttonUrl ?? query.data.buttons?.[0]?.url ?? '',
    });
    const menuButton = query.data.buttons?.find((button) => button.action === 'MENU');
    if (menuButton?.text) setDetailButton(menuButton.text);
  }, [query.data]);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.startMessage')}</h2>
      </div>
      <SectionCard title={t('platformAdmin.telegram.startMessage')}>
        {query.isPending && !query.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <TelegramComposer
            value={value}
            onChange={setValue}
            submitLabel={t('platformAdmin.telegram.save')}
            pending={save.isPending}
            error={error}
            onSubmit={async () => {
              setError(null);
              const localError = validateTelegramComposerFields(value);
              if (localError) {
                setError(localError);
                return;
              }
              const buttonText = value.buttonText.trim() || null;
              const buttonUrl = value.buttonUrl.trim() || null;
              const imageUrl = value.imageUrl.trim() || null;
              try {
                await save.mutateAsync({
                  text: value.text,
                  mediaKind: imageUrl ? 'IMAGE' : 'NONE',
                  imageUrl,
                  buttonText,
                  buttonUrl,
                  buttons: [
                    {
                      text: buttonText || '🚀 Dasturga kirish',
                      action: 'URL',
                      url: buttonUrl || 'https://www.mebelboshqaruv.uz',
                    },
                    {
                      text: detailButton.trim() || '📚 Batafsil',
                      action: 'MENU',
                      targetSlug: 'details',
                    },
                  ],
                });
              } catch (caught) {
                setError(composerError(caught, t('common.saveFailed') || 'Saqlab bo‘lmadi'));
              }
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t('platformAdmin.telegram.detailButton')}</span>
              <input
                className={fieldClass}
                value={detailButton}
                onChange={(event) => setDetailButton(event.target.value)}
              />
            </label>
          </TelegramComposer>
        )}
      </SectionCard>
    </PageContainer>
  );
}

export function PlatformTelegramBroadcastPage() {
  const { t } = useTranslation();
  const history = usePlatformTelegramBroadcasts(1);
  const create = useCreateTelegramBroadcast();
  const cancel = useCancelTelegramBroadcast();
  const [value, setValue] = useState<TelegramComposerValue>({
    text: '',
    imageUrl: '',
    buttonText: '',
    buttonUrl: '',
  });
  const [name, setName] = useState('');
  const [audience, setAudience] = useState<TelegramBroadcastAudience>('ALL');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.broadcast')}</h2>
      </div>
      <SectionCard title={t('platformAdmin.telegram.newBroadcast')}>
        <TelegramComposer
          value={value}
          onChange={setValue}
          submitLabel={sendNow ? t('platformAdmin.telegram.sendAll') : t('platformAdmin.telegram.schedule')}
          pending={create.isPending}
          error={error}
          onSubmit={async () => {
            setError(null);
            const localError = validateTelegramComposerFields(value);
            if (localError) {
              setError(localError);
              return;
            }
            try {
              await create.mutateAsync({
                name: name || null,
                text: value.text,
                mediaKind: value.imageUrl.trim() ? 'IMAGE' : 'NONE',
                imageUrl: value.imageUrl.trim() || null,
                buttonText: value.buttonText.trim() || null,
                buttonUrl: value.buttonUrl.trim() || null,
                audience,
                timezone: 'Asia/Tashkent',
                sendNow,
                scheduledAt: sendNow || !scheduledLocal ? null : new Date(scheduledLocal).toISOString(),
              });
              setValue({ text: '', imageUrl: '', buttonText: '', buttonUrl: '' });
              setName('');
            } catch (caught) {
              setError(composerError(caught, 'Yuborib bo‘lmadi'));
            }
          }}
        >
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('platformAdmin.telegram.broadcastName')}</span>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('platformAdmin.telegram.audience')}</span>
            <select
              className={fieldClass}
              value={audience}
              onChange={(event) => setAudience(event.target.value as TelegramBroadcastAudience)}
            >
              <option value="ALL">{t('platformAdmin.telegram.audienceAll')}</option>
              <option value="PERSONAL">{t('platformAdmin.telegram.audiencePersonal')}</option>
              <option value="BUSINESS">{t('platformAdmin.telegram.audienceBusiness')}</option>
              <option value="PERSONAL_AND_BUSINESS">{t('platformAdmin.telegram.audienceBoth')}</option>
            </select>
          </label>
          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium">{t('platformAdmin.telegram.sendWhen')}</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} />
              {t('platformAdmin.telegram.sendNow')}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} />
              {t('platformAdmin.telegram.sendLater')}
            </label>
            {!sendNow ? (
              <input
                type="datetime-local"
                className={fieldClass}
                value={scheduledLocal}
                onChange={(event) => setScheduledLocal(event.target.value)}
              />
            ) : null}
          </fieldset>
        </TelegramComposer>
      </SectionCard>
      <SectionCard title={t('platformAdmin.telegram.history')}>
        {history.data?.items.length ? (
          <div className="divide-y divide-line">
            {history.data.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{item.name || item.title || item.preview}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(item.createdAt)}
                    {item.scheduledAt ? ` · ${formatDate(item.scheduledAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-ink-muted">
                    {t('platformAdmin.telegram.sent')}: {item.sentCount} · {t('platformAdmin.telegram.failed')}: {item.failedCount} · {item.status}
                  </p>
                  {item.status === 'DRAFT' || item.status === 'SCHEDULED' || item.status === 'PENDING' ? (
                    <button
                      type="button"
                      className="text-sm text-danger"
                      onClick={() => void cancel.mutateAsync(item.id)}
                    >
                      {t('platformAdmin.telegram.cancel')}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t('platformAdmin.telegram.emptyBroadcasts')}</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}

export function PlatformTelegramUsersPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramUsers(1);
  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.users')}</h2>
      </div>
      <SectionCard title={t('platformAdmin.telegram.users')}>
        {query.data?.items.length ? (
          <div className="divide-y divide-line">
            {query.data.items.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{user.identityName}</p>
                  <p className="text-xs text-ink-muted">
                    {user.username ? `@${user.username}` : user.firstName} · {user.identityEmail}
                  </p>
                </div>
                <p className="text-xs text-ink-muted">{formatDate(user.connectedAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t('platformAdmin.telegram.emptyUsers')}</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}

export function PlatformTelegramMenuPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramMenu();
  const save = useUpdateTelegramMenuScreen();
  const [selected, setSelected] = useState<string>('details');
  const [draft, setDraft] = useState<TelegramMenuScreenDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const screen = query.data?.find((item) => item.slug === selected) ?? query.data?.[0];
    if (screen) {
      setSelected(screen.slug);
      setDraft(screen);
    }
  }, [query.data, selected]);

  if (!draft) {
    return (
      <PageContainer>
        <Skeleton className="h-40 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.menu')}</h2>
      </div>
      <SectionCard title={t('platformAdmin.telegram.menu')}>
        <div className="mb-4 flex flex-wrap gap-2">
          {(query.data ?? []).map((screen) => (
            <button
              key={screen.slug}
              type="button"
              className={`rounded-input px-3 py-1.5 text-sm ${
                screen.slug === draft.slug ? 'bg-brand-600 text-white' : 'border border-line'
              }`}
              onClick={() => {
                setSelected(screen.slug);
                setDraft(screen);
              }}
            >
              {screen.title || screen.slug}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('platformAdmin.telegram.title')}</span>
            <input
              className={fieldClass}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('platformAdmin.telegram.text')}</span>
            <textarea
              className={fieldClass}
              rows={8}
              value={draft.text}
              onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('platformAdmin.telegram.imageUrl')}</span>
            <input
              className={fieldClass}
              value={draft.imageUrl ?? ''}
              onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value || null })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            />
            {t('platformAdmin.telegram.active')}
          </label>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('platformAdmin.telegram.buttons')}</p>
            {draft.buttons.map((button, index) => (
              <div key={button.id || index} className="grid gap-2 rounded-panel border border-line p-3 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  value={button.text}
                  onChange={(event) => {
                    const buttons = [...draft.buttons];
                    buttons[index] = { ...button, text: event.target.value };
                    setDraft({ ...draft, buttons });
                  }}
                />
                <select
                  className={fieldClass}
                  value={button.action}
                  onChange={(event) => {
                    const buttons = [...draft.buttons];
                    buttons[index] = { ...button, action: event.target.value as TelegramMenuButtonAction };
                    setDraft({ ...draft, buttons });
                  }}
                >
                  <option value="URL">URL</option>
                  <option value="MENU">MENU</option>
                  <option value="BACK">BACK</option>
                </select>
                <input
                  className={fieldClass}
                  placeholder="https://"
                  value={button.url ?? ''}
                  onChange={(event) => {
                    const buttons = [...draft.buttons];
                    buttons[index] = { ...button, url: event.target.value || null };
                    setDraft({ ...draft, buttons });
                  }}
                />
                <input
                  className={fieldClass}
                  placeholder="targetSlug"
                  value={button.targetSlug ?? ''}
                  onChange={(event) => {
                    const buttons = [...draft.buttons];
                    buttons[index] = { ...button, targetSlug: event.target.value || null };
                    setDraft({ ...draft, buttons });
                  }}
                />
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-danger-700">{error}</p> : null}
          <button
            type="button"
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={save.isPending}
            onClick={() => {
              setError(null);
              void save
                .mutateAsync({
                  slug: draft.slug,
                  body: {
                    title: draft.title,
                    text: draft.text,
                    imageUrl: draft.imageUrl,
                    categoryKey: draft.categoryKey,
                    isActive: draft.isActive,
                    sortOrder: draft.sortOrder,
                    buttons: draft.buttons.map((button) => ({
                      ...button,
                      action: button.action as TelegramMenuButtonAction,
                    })),
                  },
                })
                .catch((caught) => setError(composerError(caught, 'Saqlab bo‘lmadi')));
            }}
          >
            {t('platformAdmin.telegram.save')}
          </button>
        </div>
      </SectionCard>
    </PageContainer>
  );
}

export { PlatformTelegramAutomationsPage } from './PlatformTelegramAutoMessagesPage';

export function PlatformTelegramStatsPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramStats();
  const data = query.data;
  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{t('platformAdmin.telegram.stats')}</h2>
      </div>
      {query.isPending && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <SectionCard title={t('platformAdmin.telegram.stats')}>
          <MetricList>
            <MetricRow label={t('platformAdmin.telegram.users')} value={String(data?.connectedUsers ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.inactiveUsers')} value={String(data?.inactiveUsers ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.audiencePersonal')} value={String(data?.personalConnected ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.audienceBusiness')} value={String(data?.businessConnected ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.audienceBoth')} value={String(data?.bothConnected ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.broadcast')} value={String(data?.broadcastsTotal ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.scheduled')} value={String(data?.broadcastsScheduled ?? 0)} />
            <MetricRow label={t('platformAdmin.telegram.automations')} value={String(data?.automationsEnabled ?? 0)} />
          </MetricList>
        </SectionCard>
      )}
    </PageContainer>
  );
}
