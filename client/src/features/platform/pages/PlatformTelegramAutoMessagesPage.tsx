import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_TELEGRAM_TIMEZONE,
  TELEGRAM_APP_PATHS,
  TelegramAutoMessageAccountType,
  TelegramAutoMessageRecurrence,
  type TelegramAutoMessageDto,
  type TelegramAutoMessagePreviewRequest,
  type TelegramAutoMessageResultCatalogItem,
  type TelegramAutoMessageTemplateDto,
  type TelegramAutoMessageThresholdConfig,
  type UpsertTelegramAutoMessageRequest,
} from '@furniture-erp/shared';

import { ErrorState } from '@/components/feedback/ErrorState';
import { PageContainer } from '@/components/layout/PageContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';

import { TelegramMessagePreview } from '../components/TelegramMessagePreview';
import {
  useCreateTelegramAutoMessage,
  useDeleteTelegramAutoMessage,
  useDuplicateTelegramAutoMessage,
  usePlatformTelegramAutoMessageCatalog,
  usePlatformTelegramAutoMessageTemplates,
  usePlatformTelegramAutoMessages,
  usePreviewTelegramAutoMessage,
  useTestSendTelegramAutoMessage,
  useUpdateTelegramAutoMessage,
} from '../hooks/use-platform-telegram';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const RECURRENCE_LABEL: Record<string, string> = {
  EVERY_DAY: 'Har kuni',
  EVERY_WEEK: 'Har hafta',
  EVERY_MONTH: 'Har oy',
  EVERY_15_DAYS: 'Har 15 kun',
  ONE_TIME: 'Bir marta',
};

const WEEKDAY_LABEL: Record<number, string> = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba',
};

const PERSONAL_CTA = [
  { label: 'Personal dashboard', path: TELEGRAM_APP_PATHS.personalDashboard },
  { label: 'Personal analytics', path: TELEGRAM_APP_PATHS.personalAnalytics },
];

const BUSINESS_CTA = [
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

function fromTemplate(template: TelegramAutoMessageTemplateDto): FormState {
  return {
    ...emptyForm(template.accountType),
    title: template.title,
    accountType: template.accountType,
    recurrence: template.recurrence,
    hour: template.hour,
    minute: template.minute,
    weekday: template.weekday,
    monthDay: template.monthDay,
    messageBody: template.messageBody,
    resultKeys: [...template.resultKeys],
    ctaEnabled: template.ctaEnabled,
    ctaLabel: template.ctaLabel,
    ctaPath: template.ctaPath,
    enabled: false,
  };
}

/** Preview / Test Send payload — schedule fields omitted; backend also strips extras. */
function toPreviewPayload(form: FormState): TelegramAutoMessagePreviewRequest {
  return {
    title: form.title,
    accountType: form.accountType,
    messageBody: form.messageBody,
    resultKeys: form.resultKeys,
    thresholdConfig: form.thresholdConfig,
    ctaEnabled: form.ctaEnabled,
    ctaLabel: form.ctaLabel,
    ctaPath: form.ctaPath,
  };
}

function stripTelegramHtml(text: string): string {
  return text
    .replace(/<\/?b>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function formatSchedule(row: TelegramAutoMessageDto): string {
  const time = `${String(row.hour).padStart(2, '0')}:${String(row.minute).padStart(2, '0')}`;
  if (row.recurrence === 'EVERY_WEEK') {
    return `${RECURRENCE_LABEL.EVERY_WEEK} — ${WEEKDAY_LABEL[row.weekday ?? 1] ?? 'Dushanba'} ${time}`;
  }
  if (row.recurrence === 'EVERY_MONTH') {
    return `${RECURRENCE_LABEL.EVERY_MONTH} — ${row.monthDay ?? 1}-kun ${time}`;
  }
  if (row.recurrence === 'EVERY_15_DAYS') {
    return `${RECURRENCE_LABEL.EVERY_15_DAYS} — ${row.startDate ?? '—'} dan ${time}`;
  }
  if (row.recurrence === 'ONE_TIME') {
    return `${RECURRENCE_LABEL.ONE_TIME} — ${row.startDate ?? '—'} ${time}`;
  }
  return `${RECURRENCE_LABEL.EVERY_DAY} — ${time}`;
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
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
  const [previewCta, setPreviewCta] = useState<{ label: string | null; path: string | null }>({
    label: null,
    path: null,
  });
  const [thresholdNote, setThresholdNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const catalogQuery = usePlatformTelegramAutoMessageCatalog(form.accountType);
  const templatesQuery = usePlatformTelegramAutoMessageTemplates(form.accountType);
  const catalog = catalogQuery.data ?? [];
  const templates = templatesQuery.data ?? [];
  const createMut = useCreateTelegramAutoMessage();
  const updateMut = useUpdateTelegramAutoMessage();
  const previewMut = usePreviewTelegramAutoMessage();
  const testMut = useTestSendTelegramAutoMessage();

  useEffect(() => {
    if (initial) {
      setForm(initial);
      setPreviewText(null);
      setFormError(null);
      setStatusMessage(null);
    }
  }, [initial]);

  const catalogByKey = useMemo(() => {
    const map = new Map<string, TelegramAutoMessageResultCatalogItem>();
    for (const item of catalog) map.set(item.key, item);
    return map;
  }, [catalog]);

  const ctaOptions =
    form.accountType === TelegramAutoMessageAccountType.BUSINESS ? BUSINESS_CTA : PERSONAL_CTA;

  function setAccountType(next: TelegramAutoMessageAccountType) {
    if (next === form.accountType) return;
    const incompatible = form.resultKeys.length > 0;
    if (
      incompatible &&
      !window.confirm("Hisob turi o‘zgarsa mos kelmaydigan natijalar tozalanadi. Davom etasizmi?")
    ) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      accountType: next,
      resultKeys: [],
      thresholdConfig: null,
      ctaPath: null,
    }));
    setPreviewText(null);
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setForm(fromTemplate(template));
    setPreviewText(null);
    setFormError(null);
    setStatusMessage('Shablon forma to‘ldirdi. Kerakli joylarni o‘zgartirib saqlang.');
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
    setStatusMessage(null);
    try {
      if (editingId) await updateMut.mutateAsync({ id: editingId, body: form });
      else await createMut.mutateAsync(form);
      onSaved();
    } catch (error) {
      setFormError(mutationErrorMessage(error, 'Saqlashda xatolik'));
    }
  }

  async function runPreview() {
    setFormError(null);
    setStatusMessage(null);
    try {
      const res = await previewMut.mutateAsync(toPreviewPayload(form));
      setPreviewText(res.text);
      setPreviewCta({ label: res.ctaLabel, path: res.ctaPath });
      setThresholdNote(res.thresholdNote);
      if (res.unresolvedPlaceholders.length) {
        setFormError(
          `Noma’lum placeholder: ${res.unresolvedPlaceholders.map((k) => `{{${k}}}`).join(', ')}`,
        );
      }
    } catch (error) {
      setFormError(mutationErrorMessage(error, 'Preview xatosi'));
    }
  }

  async function runTestSend() {
    setFormError(null);
    setStatusMessage(null);
    try {
      const res = await testMut.mutateAsync(toPreviewPayload(form));
      if (res.sent) {
        setStatusMessage(res.message ?? 'Test xabar Telegramga yuborildi.');
      } else {
        setFormError(res.message ?? 'Test yuborilmadi');
      }
    } catch (error) {
      setFormError(mutationErrorMessage(error, 'Test yuborishda xatolik'));
    }
  }

  const availableResults = catalog.filter((item) => !form.resultKeys.includes(item.key));
  const threshold = form.thresholdConfig;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <SectionCard title="1. Asosiy ma’lumot">
        <div className="space-y-4">
          {!editingId && templates.length > 0 ? (
            <label className="block text-sm text-ink">
              Ixtiyoriy shablon
              <select
                className={`${fieldClass} mt-1`}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Noldan yaratish / shablon tanlash</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-ink-muted">
                Shablon faqat formani to‘ldiradi. Saqlamaguncha xabar yuborilmaydi.
              </span>
            </label>
          ) : null}

          <label className="block text-sm text-ink">
            Hisob turi
            <select
              className={`${fieldClass} mt-1`}
              value={form.accountType}
              onChange={(e) => setAccountType(e.target.value as TelegramAutoMessageAccountType)}
            >
              <option value="PERSONAL">Personal</option>
              <option value="BUSINESS">Business</option>
            </select>
          </label>

          <label className="block text-sm text-ink">
            Sarlavha
            <input
              className={`${fieldClass} mt-1`}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Xayrli tong"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="2. Vaqt va takrorlanish">
        <div className="space-y-4">
          <label className="block text-sm text-ink">
            Takrorlanish
            <select
              className={`${fieldClass} mt-1`}
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
              <label className="block text-sm text-ink">
                Hafta kuni
                <select
                  className={`${fieldClass} mt-1`}
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
              <label className="block text-sm text-ink">
                Oy kuni (1–31)
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min={1}
                  max={31}
                  value={form.monthDay ?? 1}
                  onChange={(e) => setForm((p) => ({ ...p, monthDay: Number(e.target.value) }))}
                />
              </label>
            )}
            {(form.recurrence === 'EVERY_15_DAYS' || form.recurrence === 'ONE_TIME') && (
              <label className="block text-sm text-ink">
                {form.recurrence === 'ONE_TIME' ? 'Sana' : 'Boshlanish sanasi'}
                <input
                  className={`${fieldClass} mt-1`}
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value || null }))}
                />
              </label>
            )}
            <label className="block text-sm text-ink">
              Vaqt
              <input
                className={`${fieldClass} mt-1`}
                type="time"
                value={`${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hour, minute] = e.target.value.split(':').map(Number);
                  setForm((p) => ({ ...p, hour: hour ?? 0, minute: minute ?? 0 }));
                }}
              />
            </label>
            <label className="block text-sm text-ink">
              Vaqt zonasi
              <input
                className={`${fieldClass} mt-1`}
                value={form.timezone ?? DEFAULT_TELEGRAM_TIMEZONE}
                onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
              />
            </label>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="3. Natijalar">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">Hisob turiga mos real ko‘rsatkichlar</p>
            <select
              className={`${fieldClass} max-w-[240px]`}
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
            {form.resultKeys.length === 0 ? (
              <li className="rounded-panel border border-dashed border-line px-3 py-4 text-sm text-ink-muted">
                Hali natija tanlanmagan
              </li>
            ) : (
              form.resultKeys.map((key, index) => (
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
                  <span className="cursor-grab text-ink-muted" aria-hidden>
                    ☰
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{catalogByKey.get(key)?.label ?? key}</span>
                    <span className="ml-2 text-xs text-ink-muted">{`{{${key}}}`}</span>
                  </span>
                  <button
                    type="button"
                    className="rounded-button border border-line px-2 py-1 text-xs text-danger"
                    onClick={() => removeResult(key)}
                  >
                    O‘chirish
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="4. Xabar">
        <label className="block text-sm text-ink">
          Xabar matni
          <textarea
            className={`${fieldClass} mt-1`}
            rows={6}
            value={form.messageBody}
            onChange={(e) => setForm((p) => ({ ...p, messageBody: e.target.value }))}
            placeholder={'Assalomu alaykum\n\n{{balance}}\n{{income}}'}
          />
          <span className="mt-1 block text-xs text-ink-muted">
            {'{{key}}'} — tanlangan natija kalitlari. Preview, Test Send va scheduler bir xil renderer
            ishlatadi.
          </span>
        </label>

        <details className="mt-4 rounded-panel border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Chegara xabari (ixtiyoriy)
          </summary>
          <p className="mt-2 text-xs text-ink-muted">
            Tanlangan natija qiymati HIGH / MEDIUM / LOW chegarasiga yetganda qo‘shimcha matn
            xabarga qo‘shiladi (masalan Budget usage ≥ 80 → HIGH). Bo‘sh qoldirilsa hech narsa
            yuborilmaydi. Matnda {'{{key}}'} placeholderlar ishlaydi.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-ink sm:col-span-2">
              Natija
              <select
                className={`${fieldClass} mt-1`}
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
            {(
              [
                { band: 'high', label: 'HIGH (≥)' },
                { band: 'medium', label: 'MEDIUM (≥)' },
                { band: 'low', label: 'LOW (≥)' },
              ] as const
            ).map(({ band, label }) => (
              <div key={band} className="space-y-2 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={fieldClass}
                    type="number"
                    placeholder="Chegara qiymati"
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
                    placeholder="Xabar matni"
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
      </SectionCard>

      <SectionCard title="5. CTA">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={Boolean(form.ctaEnabled)}
              onChange={(e) => setForm((p) => ({ ...p, ctaEnabled: e.target.checked }))}
            />
            CTA tugmasi yoqilgan
          </label>
          {form.ctaEnabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-ink">
                CTA matni
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.ctaLabel ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, ctaLabel: e.target.value || null }))}
                />
              </label>
              <label className="block text-sm text-ink">
                CTA manzil
                <select
                  className={`${fieldClass} mt-1`}
                  value={form.ctaPath ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, ctaPath: e.target.value || null }))}
                >
                  <option value="">—</option>
                  {ctaOptions.map((opt) => (
                    <option key={opt.path} value={opt.path}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="6. Preview / Test">
        <div className="space-y-4">
          {previewText ? (
            <TelegramMessagePreview
              content={{
                text: stripTelegramHtml(previewText),
                buttonText: previewCta.label,
                buttonUrl: previewCta.path ? `#${previewCta.path}` : null,
              }}
            />
          ) : (
            <p className="text-sm text-ink-muted">
              Preview Telegramdagi ko‘rinishga yaqin namuna ma’lumot bilan ishlaydi. Telegramga
              yubormaydi.
            </p>
          )}
          {thresholdNote ? <p className="text-sm text-ink-muted">{thresholdNote}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-button border border-line px-3 py-2 text-sm text-ink disabled:opacity-60"
              disabled={previewMut.isPending}
              onClick={() => void runPreview()}
            >
              {previewMut.isPending ? 'Preview…' : 'Preview'}
            </button>
            <button
              type="button"
              className="rounded-button border border-line px-3 py-2 text-sm text-ink disabled:opacity-60"
              disabled={testMut.isPending}
              onClick={() => void runTestSend()}
            >
              {testMut.isPending ? 'Yuborilmoqda…' : 'Test Send'}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="7. Status">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={Boolean(form.enabled)}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Enabled — belgilangan vaqtda scheduler yuboradi
          </label>

          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          {statusMessage ? <p className="text-sm text-success">{statusMessage}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-button bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => void submit()}
              disabled={saving}
            >
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
            <button
              type="button"
              className="rounded-button border border-line px-3 py-2 text-sm text-ink"
              onClick={onCancel}
            >
              Bekor
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export function PlatformTelegramAutomationsPage() {
  const { t } = useTranslation();
  const query = usePlatformTelegramAutoMessages();
  const duplicate = useDuplicateTelegramAutoMessage();
  const remove = useDeleteTelegramAutoMessage();
  const update = useUpdateTelegramAutoMessage();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function toggleEnabled(item: TelegramAutoMessageDto) {
    setListError(null);
    try {
      await update.mutateAsync({
        id: item.id,
        body: { ...fromDto(item), enabled: !item.enabled },
      });
    } catch (error) {
      setListError(mutationErrorMessage(error, 'Holatni o‘zgartirishda xatolik'));
    }
  }

  return (
    <PageContainer className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('platformAdmin.telegram.automations')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('platformAdmin.telegram.automationsHint')}</p>
        </div>
        {mode === 'list' && (
          <button
            type="button"
            className="rounded-button bg-brand-600 px-3 py-2 text-sm font-medium text-white"
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
          {listError ? (
            <p role="alert" className="text-sm text-danger">
              {listError}
            </p>
          ) : null}
          {query.isPending && !query.data ? (
            <Skeleton className="h-32 w-full" />
          ) : query.isError ? (
            <ErrorState
              title={t('platformAdmin.telegram.automations')}
              message={t('common.retry')}
              onRetry={() => void query.refetch()}
            />
          ) : (query.data ?? []).length === 0 ? (
            <SectionCard title={t('platformAdmin.telegram.automations')}>
              <p className="text-sm text-ink-muted">
                Hali Auto Message yo‘q. “+ Auto Message” orqali noldan yarating yoki ixtiyoriy
                shablonni tanlang.
              </p>
            </SectionCard>
          ) : (
            (query.data ?? []).map((item) => (
              <div key={item.id} className="rounded-panel border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="text-sm text-ink-muted">
                      {item.accountType} · {formatSchedule(item)} · {item.timezone}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {item.enabled ? 'Enabled' : 'Disabled'}
                      {item.nextRunLabel ? ` · Keyingi yuborish: ${item.nextRunLabel}` : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-button border border-line px-3 py-1.5 text-sm text-ink"
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
                      className="rounded-button border border-line px-3 py-1.5 text-sm text-ink disabled:opacity-60"
                      disabled={update.isPending}
                      onClick={() => void toggleEnabled(item)}
                    >
                      {item.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="rounded-button border border-line px-3 py-1.5 text-sm text-ink"
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
