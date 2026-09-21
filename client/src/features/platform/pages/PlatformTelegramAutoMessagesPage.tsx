import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_TELEGRAM_TIMEZONE,
  TelegramAutoMessageAccountType,
  TelegramAutoMessageRecurrence,
  TELEGRAM_APP_PATHS,
  type TelegramAutoMessageDto,
  type TelegramAutoMessageResultCatalogItem,
  type TelegramAutoMessageThresholdConfig,
  type UpsertTelegramAutoMessageRequest,
} from '@furniture-erp/shared';

import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

import {
  useCreateTelegramAutoMessage,
  useDeleteTelegramAutoMessage,
  useDuplicateTelegramAutoMessage,
  usePlatformTelegramAutoMessageCatalog,
  usePlatformTelegramAutoMessages,
  usePreviewTelegramAutoMessage,
  useTestSendTelegramAutoMessage,
  useUpdateTelegramAutoMessage,
} from '../hooks/use-platform-telegram';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const RECURRENCE_LABEL: Record<string, string> = {
  EVERY_DAY: 'Every day',
  EVERY_WEEK: 'Every week',
  EVERY_MONTH: 'Every month',
  EVERY_15_DAYS: 'Every 15 days',
  ONE_TIME: 'One time',
};

const WEEKDAY_LABEL: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

const CTA_OPTIONS = [
  { label: 'Personal dashboard', path: TELEGRAM_APP_PATHS.personalDashboard },
  { label: 'Personal analytics', path: TELEGRAM_APP_PATHS.personalAnalytics },
  { label: 'Business dashboard', path: TELEGRAM_APP_PATHS.dashboard },
  { label: 'Reports', path: TELEGRAM_APP_PATHS.reports },
  { label: 'Home', path: TELEGRAM_APP_PATHS.home },
];

type FormState = UpsertTelegramAutoMessageRequest;

function emptyForm(accountType: TelegramAutoMessageAccountType = TelegramAutoMessageAccountType.PERSONAL): FormState {
  return {
    title: '',
    accountType,
    enabled: false,
    recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
    hour: 8,
    minute: 0,
    timezone: DEFAULT_TELEGRAM_TIMEZONE,
    weekday: 1,
    monthDay: 1,
    startDate: null,
    messageBody: '',
    resultKeys: [],
    thresholdConfig: null,
    ctaEnabled: false,
    ctaLabel: null,
    ctaPath: null,
  };
}

function fromDto(row: TelegramAutoMessageDto): FormState {
  return {
    title: row.title,
    accountType: row.accountType,
    enabled: row.enabled,
    recurrence: row.recurrence,
    hour: row.hour,
    minute: row.minute,
    timezone: row.timezone,
    weekday: row.weekday,
    monthDay: row.monthDay,
    startDate: row.startDate,
    messageBody: row.messageBody,
    resultKeys: row.resultKeys,
    thresholdConfig: row.thresholdConfig,
    ctaEnabled: row.ctaEnabled,
    ctaLabel: row.ctaLabel,
    ctaPath: row.ctaPath,
  };
}

function formatSchedule(row: TelegramAutoMessageDto): string {
  const time = `${String(row.hour).padStart(2, '0')}:${String(row.minute).padStart(2, '0')}`;
  if (row.recurrence === 'EVERY_WEEK') {
    return `${RECURRENCE_LABEL.EVERY_WEEK} — ${WEEKDAY_LABEL[row.weekday ?? 1] ?? 'Monday'} ${time}`;
  }
  if (row.recurrence === 'EVERY_MONTH') {
    return `${RECURRENCE_LABEL.EVERY_MONTH} — day ${row.monthDay ?? 1} ${time}`;
  }
  if (row.recurrence === 'EVERY_15_DAYS') {
    return `${RECURRENCE_LABEL.EVERY_15_DAYS} — from ${row.startDate ?? '—'} ${time}`;
  }
  if (row.recurrence === 'ONE_TIME') {
    return `${RECURRENCE_LABEL.ONE_TIME} — ${row.startDate ?? '—'} ${time}`;
  }
  return `${RECURRENCE_LABEL.EVERY_DAY} — ${time}`;
}

function AutoMessageForm({
  initial,
  editingId,
  onCancel,
  onSaved,
}: {
  initial: FormState | null;
  editingId: string | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm());
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const catalogQuery = usePlatformTelegramAutoMessageCatalog(form.accountType);
  const catalog = catalogQuery.data ?? [];
  const createMut = useCreateTelegramAutoMessage();
  const updateMut = useUpdateTelegramAutoMessage();
  const previewMut = usePreviewTelegramAutoMessage();
  const testMut = useTestSendTelegramAutoMessage();

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const catalogByKey = useMemo(() => {
    const map = new Map<string, TelegramAutoMessageResultCatalogItem>();
    for (const item of catalog) map.set(item.key, item);
    return map;
  }, [catalog]);

  function setAccountType(next: TelegramAutoMessageAccountType) {
    if (next === form.accountType) return;
    const incompatible = form.resultKeys.length > 0;
    if (
      incompatible &&
      !window.confirm("Account type o‘zgarsa mos kelmaydigan natijalar tozalanadi. Davom etasizmi?")
    ) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      accountType: next,
      resultKeys: [],
      thresholdConfig: null,
    }));
  }

  function addResult(key: string) {
    if (form.resultKeys.includes(key)) return;
    setForm((prev) => ({ ...prev, resultKeys: [...prev.resultKeys, key] }));
  }

  function removeResult(key: string) {
    setForm((prev) => ({
      ...prev,
      resultKeys: prev.resultKeys.filter((k) => k !== key),
      thresholdConfig: prev.thresholdConfig?.resultKey === key ? null : prev.thresholdConfig,
    }));
  }

  function moveResult(from: number, to: number) {
    if (to < 0 || to >= form.resultKeys.length) return;
    setForm((prev) => {
      const next = [...prev.resultKeys];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return { ...prev, resultKeys: next };
    });
  }

  async function submit() {
    setFormError(null);
    try {
      if (editingId) await updateMut.mutateAsync({ id: editingId, body: form });
      else await createMut.mutateAsync(form);
      onSaved();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Saqlashda xatolik');
    }
  }

  const availableResults = catalog.filter((item) => !form.resultKeys.includes(item.key));
  const threshold = form.thresholdConfig;

  return (
    <SectionCard title={editingId ? 'Edit Auto Message' : '+ Auto Message'}>
      <div className="space-y-4">
        <label className="block text-sm">
          Account Type
          <select
            className={fieldClass}
            value={form.accountType}
            onChange={(e) => setAccountType(e.target.value as TelegramAutoMessageAccountType)}
          >
            <option value="PERSONAL">Personal</option>
            <option value="BUSINESS">Business</option>
          </select>
        </label>

        <label className="block text-sm">
          Title
          <input
            className={fieldClass}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Xayrli tong"
          />
        </label>

        <label className="block text-sm">
          Recurrence
          <select
            className={fieldClass}
            value={form.recurrence}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                recurrence: e.target.value as FormState['recurrence'],
              }))
            }
          >
            {Object.entries(RECURRENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {form.recurrence === 'EVERY_WEEK' && (
            <label className="block text-sm">
              Weekday
              <select
                className={fieldClass}
                value={form.weekday ?? 1}
                onChange={(e) => setForm((p) => ({ ...p, weekday: Number(e.target.value) }))}
              >
                {Object.entries(WEEKDAY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {form.recurrence === 'EVERY_MONTH' && (
            <label className="block text-sm">
              Day of month (1–31)
              <input
                className={fieldClass}
                type="number"
                min={1}
                max={31}
                value={form.monthDay ?? 1}
                onChange={(e) => setForm((p) => ({ ...p, monthDay: Number(e.target.value) }))}
              />
            </label>
          )}
          {(form.recurrence === 'EVERY_15_DAYS' || form.recurrence === 'ONE_TIME') && (
            <label className="block text-sm">
              {form.recurrence === 'ONE_TIME' ? 'Date' : 'Start date'}
              <input
                className={fieldClass}
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value || null }))}
              />
            </label>
          )}
          <label className="block text-sm">
            Time
            <input
              className={fieldClass}
              type="time"
              value={`${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`}
              onChange={(e) => {
                const [hour, minute] = e.target.value.split(':').map(Number);
                setForm((p) => ({ ...p, hour: hour ?? 0, minute: minute ?? 0 }));
              }}
            />
          </label>
          <label className="block text-sm">
            Timezone
            <input
              className={fieldClass}
              value={form.timezone ?? DEFAULT_TELEGRAM_TIMEZONE}
              onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">Natijalar</p>
            <select
              className={`${fieldClass} max-w-[220px]`}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addResult(e.target.value);
                e.target.value = '';
              }}
            >
              <option value="">+ Natija qo‘shish</option>
              {availableResults.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <ul className="space-y-2">
            {form.resultKeys.map((key, index) => (
              <li
                key={key}
                className="flex items-center gap-2 rounded-panel border border-line bg-surface px-3 py-2 text-sm"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex == null || dragIndex === index) return;
                  moveResult(dragIndex, index);
                  setDragIndex(null);
                }}
              >
                <span className="cursor-grab text-ink-muted">☰</span>
                <span className="flex-1">{catalogByKey.get(key)?.label ?? key}</span>
                <button type="button" className="text-danger" onClick={() => removeResult(key)}>
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className="block text-sm">
          Message body
          <textarea
            className={fieldClass}
            rows={6}
            value={form.messageBody}
            onChange={(e) => setForm((p) => ({ ...p, messageBody: e.target.value }))}
            placeholder={'Assalomu alaykum\n\n{{balance}}\n{{income}}'}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Placeholder: {'{{key}}'} — tanlangan natija kalitlari
          </span>
        </label>

        <details className="rounded-panel border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium">Optional threshold message</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Result
              <select
                className={fieldClass}
                value={threshold?.resultKey ?? ''}
                onChange={(e) => {
                  const resultKey = e.target.value;
                  setForm((p) => ({
                    ...p,
                    thresholdConfig: resultKey
                      ? ({ ...(p.thresholdConfig ?? {}), resultKey } as TelegramAutoMessageThresholdConfig)
                      : null,
                  }));
                }}
              >
                <option value="">—</option>
                {form.resultKeys.map((key) => (
                  <option key={key} value={key}>
                    {catalogByKey.get(key)?.label ?? key}
                  </option>
                ))}
              </select>
            </label>
            {(['high', 'medium', 'low'] as const).map((band) => (
              <div key={band} className="space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold uppercase text-ink-muted">{band}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={fieldClass}
                    type="number"
                    placeholder="Threshold"
                    value={threshold?.[band] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : Number(e.target.value);
                      setForm((p) => ({
                        ...p,
                        thresholdConfig: p.thresholdConfig?.resultKey
                          ? { ...p.thresholdConfig, [band]: value }
                          : p.thresholdConfig,
                      }));
                    }}
                  />
                  <input
                    className={fieldClass}
                    placeholder="Message"
                    value={threshold?.[`${band}Message`] ?? ''}
                    onChange={(e) => {
                      const field = `${band}Message` as const;
                      setForm((p) => ({
                        ...p,
                        thresholdConfig: p.thresholdConfig?.resultKey
                          ? { ...p.thresholdConfig, [field]: e.target.value }
                          : p.thresholdConfig,
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="space-y-2 rounded-panel border border-line p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.ctaEnabled)}
              onChange={(e) => setForm((p) => ({ ...p, ctaEnabled: e.target.checked }))}
            />
            CTA enabled
          </label>
          {form.ctaEnabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                CTA Text
                <input
                  className={fieldClass}
                  value={form.ctaLabel ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value || null }))}
                />
              </label>
              <label className="block text-sm">
                CTA Target
                <select
                  className={fieldClass}
                  value={form.ctaPath ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, ctaPath: e.target.value || null }))}
                >
                  <option value="">—</option>
                  {CTA_OPTIONS.map((opt) => (
                    <option key={opt.path} value={opt.path}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.enabled)}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
          />
          Enabled
        </label>

        {formError && <p className="text-sm text-danger">{formError}</p>}
        {previewText && (
          <pre className="whitespace-pre-wrap rounded-panel border border-dashed border-brand-300 bg-brand-50/40 p-3 text-sm text-ink">
            {previewText}
          </pre>
        )}
        {previewMut.data?.unresolvedPlaceholders?.length ? (
          <p className="text-sm text-danger">
            Noma’lum placeholder:{' '}
            {previewMut.data.unresolvedPlaceholders.map((k) => `{{${k}}}`).join(', ')}
          </p>
        ) : null}
        {testMut.data && !testMut.data.sent && (
          <p className="text-sm text-danger">{testMut.data.message ?? 'Test yuborilmadi'}</p>
        )}
        {testMut.data?.sent && <p className="text-sm text-success">Test xabar yuborildi.</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-button border border-line px-3 py-2 text-sm"
            onClick={() => {
              void previewMut.mutateAsync(form).then((res) => setPreviewText(res.text));
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="rounded-button border border-line px-3 py-2 text-sm"
            onClick={() => void testMut.mutateAsync(form)}
          >
            Test Send
          </button>
          <button
            type="button"
            className="rounded-button bg-brand-600 px-3 py-2 text-sm text-white"
            onClick={() => void submit()}
            disabled={createMut.isPending || updateMut.isPending}
          >
            Saqlash
          </button>
          <button type="button" className="rounded-button border border-line px-3 py-2 text-sm" onClick={onCancel}>
            Bekor
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

export function PlatformTelegramAutomationsPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramAutoMessages();
  const duplicate = useDuplicateTelegramAutoMessage();
  const remove = useDeleteTelegramAutoMessage();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">🔔 Auto Messages</h2>
          <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.telegram.automationsHint')}</p>
        </div>
        {mode === 'list' && (
          <button
            type="button"
            className="rounded-button bg-brand-600 px-3 py-2 text-sm text-white"
            onClick={() => {
              setEditing(null);
              setEditingId(null);
              setMode('create');
            }}
          >
            + Auto Message
          </button>
        )}
      </div>

      {mode !== 'list' && (
        <AutoMessageForm
          initial={editing}
          editingId={editingId}
          onCancel={() => {
            setMode('list');
            setEditing(null);
            setEditingId(null);
          }}
          onSaved={() => {
            setMode('list');
            setEditing(null);
            setEditingId(null);
            void query.refetch();
          }}
        />
      )}

      {mode === 'list' && (
        <div className="space-y-3">
          {query.isPending && !query.data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            (query.data ?? []).map((item) => (
              <div key={item.id} className="rounded-panel border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="text-sm text-ink-muted">{item.accountType}</p>
                    <p className="text-sm text-ink-muted">{formatSchedule(item)}</p>
                    <p className="text-sm text-ink-muted">{item.timezone}</p>
                    <p className="text-sm">{item.enabled ? '🟢 Enabled' : '⚪ Disabled'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-button border border-line px-3 py-1.5 text-sm"
                      onClick={() => {
                        setEditing(fromDto(item));
                        setEditingId(item.id);
                        setMode('edit');
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-button border border-line px-3 py-1.5 text-sm"
                      onClick={() => void duplicate.mutateAsync(item.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="rounded-button border border-danger/40 px-3 py-1.5 text-sm text-danger"
                      onClick={() => {
                        if (window.confirm(`「${item.title}」o‘chirilsinmi?`)) {
                          void remove.mutateAsync(item.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </PageContainer>
  );
}
