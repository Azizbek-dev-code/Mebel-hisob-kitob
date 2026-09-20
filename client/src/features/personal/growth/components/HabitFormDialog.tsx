import {
  GrowthHabitBadMode,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitScheduleKind,
  GrowthHabitTimeOfDay,
  type CreateGrowthHabitRequest,
  type GrowthHabitDto,
  type UpdateGrowthHabitRequest,
} from '@furniture-erp/shared';
import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

import { HabitIconPicker } from './HabitIconPicker';
import {
  HABIT_CATEGORIES,
  HABIT_COLORS,
  HABIT_UNIT_OPTIONS,
  WEEKDAY_KEYS,
  unitSelectValue,
} from './habit-ui';

const fieldClass =
  'w-full rounded-input border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

type FormState = {
  title: string;
  category: string;
  kind: string;
  badMode: string;
  icon: string;
  color: string;
  scheduleKind: string;
  frequency: string;
  intervalDays: string;
  weekdays: number[];
  targetValue: string;
  targetUnit: string;
  customUnit: string;
  goalPeriod: string;
  timeOfDay: string;
  reminderEnabled: boolean;
  reminderTime: string;
  notes: string;
  stackCue: string;
  stackAfterHabitId: string;
  startDayKey: string;
  endDayKey: string;
  endUnlimited: boolean;
  checklist: string[];
};

function fromHabit(habit?: GrowthHabitDto | null): FormState {
  const unit = habit?.targetUnit ?? 'count';
  const known = unitSelectValue(unit);
  return {
    title: habit?.title ?? '',
    category: habit?.category ?? '',
    kind: habit?.kind ?? GrowthHabitKind.GOOD,
    badMode: habit?.badMode ?? GrowthHabitBadMode.QUIT,
    icon: habit?.icon ?? 'flame',
    color: habit?.color ?? HABIT_COLORS[0],
    scheduleKind: habit?.scheduleKind ?? GrowthHabitScheduleKind.EVERY_DAY,
    frequency: habit?.frequency ?? GrowthHabitFrequency.DAILY,
    intervalDays: String(habit?.intervalDays ?? 2),
    weekdays: habit?.weekdays?.length ? habit.weekdays : [1, 2, 3, 4, 5],
    targetValue: String(habit?.targetValue ?? 1),
    targetUnit: known,
    customUnit: known === 'custom' ? unit : '',
    goalPeriod: habit?.goalPeriod ?? GrowthHabitGoalPeriod.DAY,
    timeOfDay: habit?.timeOfDay ?? GrowthHabitTimeOfDay.ANY,
    reminderEnabled: Boolean(habit?.reminderEnabled),
    reminderTime: habit?.reminderTime ?? '08:00',
    notes: habit?.notes ?? habit?.description ?? '',
    stackCue: habit?.stackCue ?? '',
    stackAfterHabitId: habit?.stackAfterHabitId ?? '',
    startDayKey: habit?.startDayKey ?? '',
    endDayKey: habit?.endDayKey ?? '',
    endUnlimited: !habit?.endDayKey,
    checklist: habit?.checklist?.map((item) => item.title) ?? [],
  };
}

function toBody(state: FormState): CreateGrowthHabitRequest {
  const stacked = state.stackAfterHabitId
    ? state.stackCue.trim() || null
    : null;
  return {
    title: state.title.trim(),
    category: state.category.trim() || null,
    kind: state.kind as CreateGrowthHabitRequest['kind'],
    badMode: state.kind === GrowthHabitKind.BAD ? (state.badMode as CreateGrowthHabitRequest['badMode']) : null,
    icon: state.icon,
    color: state.color,
    scheduleKind: state.scheduleKind as CreateGrowthHabitRequest['scheduleKind'],
    frequency:
      state.scheduleKind === GrowthHabitScheduleKind.INTERVAL
        ? GrowthHabitFrequency.CUSTOM
        : state.scheduleKind === GrowthHabitScheduleKind.WEEKLY
          ? GrowthHabitFrequency.WEEKLY
          : state.scheduleKind === GrowthHabitScheduleKind.MONTHLY
            ? GrowthHabitFrequency.MONTHLY
            : GrowthHabitFrequency.DAILY,
    intervalDays:
      state.scheduleKind === GrowthHabitScheduleKind.INTERVAL ? Number(state.intervalDays) || 2 : null,
    weekdays: state.scheduleKind === GrowthHabitScheduleKind.WEEKDAYS ? state.weekdays : [],
    targetValue: Number(state.targetValue) || 0,
    targetUnit:
      state.targetUnit === 'custom' ? state.customUnit.trim() || 'custom' : state.targetUnit.trim() || 'count',
    goalPeriod: state.goalPeriod as CreateGrowthHabitRequest['goalPeriod'],
    timeOfDay: state.timeOfDay as CreateGrowthHabitRequest['timeOfDay'],
    reminderEnabled: state.reminderEnabled,
    reminderTime: state.reminderEnabled ? state.reminderTime : null,
    notes: state.notes.trim() || null,
    stackCue: stacked,
    stackAfterHabitId: state.stackAfterHabitId || null,
    startDayKey: state.startDayKey || null,
    endDayKey: state.endUnlimited ? null : state.endDayKey || null,
    checklist: state.checklist
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title, sortOrder) => ({ title, sortOrder })),
  };
}

export function HabitFormDialog({
  habit,
  stackOptions,
  onClose,
  onSubmit,
  pending,
}: {
  habit?: GrowthHabitDto | null;
  stackOptions: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSubmit: (body: CreateGrowthHabitRequest | UpdateGrowthHabitRequest) => Promise<void>;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<FormState>(() => fromHabit(habit));
  const [advanced, setAdvanced] = useState(
    Boolean(habit?.notes || habit?.stackCue || habit?.checklist?.length || habit?.category),
  );
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit(toBody(state));
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('personal.habitSaveFailed'));
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={habit ? t('personal.habitEdit') : t('personal.habitAdd')}
      className="sm:max-w-lg"
    >
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn(
              'rounded-input border px-3 py-2 text-sm',
              state.kind === GrowthHabitKind.GOOD
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-line text-ink-muted',
            )}
            onClick={() => patch({ kind: GrowthHabitKind.GOOD })}
          >
            {t('personal.habitKindGood')}
          </button>
          <button
            type="button"
            className={cn(
              'rounded-input border px-3 py-2 text-sm',
              state.kind === GrowthHabitKind.BAD
                ? 'border-danger-500 bg-danger-50 text-danger-700'
                : 'border-line text-ink-muted',
            )}
            onClick={() => patch({ kind: GrowthHabitKind.BAD })}
          >
            {t('personal.habitKindBad')}
          </button>
        </div>
        {state.kind === GrowthHabitKind.BAD ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                'rounded-input border px-3 py-2 text-sm',
                state.badMode === GrowthHabitBadMode.QUIT ? 'border-brand-500 bg-brand-50' : 'border-line',
              )}
              onClick={() => patch({ badMode: GrowthHabitBadMode.QUIT, targetValue: '0' })}
            >
              {t('personal.habitBadQuit')}
            </button>
            <button
              type="button"
              className={cn(
                'rounded-input border px-3 py-2 text-sm',
                state.badMode === GrowthHabitBadMode.LIMIT ? 'border-brand-500 bg-brand-50' : 'border-line',
              )}
              onClick={() => patch({ badMode: GrowthHabitBadMode.LIMIT })}
            >
              {t('personal.habitBadLimit')}
            </button>
          </div>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.habitFieldTitle')}</span>
          <input
            className={fieldClass}
            value={state.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t('personal.habitTitlePlaceholder')}
            required
            maxLength={200}
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm text-ink-muted">{t('personal.habitFieldIcon')}</p>
          <HabitIconPicker
            value={state.icon}
            color={state.color}
            onChange={(icon) => patch({ icon })}
          />
          <div className="flex flex-wrap gap-1.5">
            {HABIT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'size-7 rounded-full border',
                  state.color === color ? 'ring-2 ring-brand-500 ring-offset-2' : 'border-line',
                )}
                style={{ background: color }}
                onClick={() => patch({ color })}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">{t('personal.habitFieldSchedule')}</span>
          <select
            className={fieldClass}
            value={state.scheduleKind}
            onChange={(e) => patch({ scheduleKind: e.target.value })}
          >
            {Object.values(GrowthHabitScheduleKind).map((value) => (
              <option key={value} value={value}>
                {t(`personal.habitSchedule.${value}`)}
              </option>
            ))}
          </select>
        </label>
        {state.scheduleKind === GrowthHabitScheduleKind.WEEKDAYS ? (
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_KEYS.map((day) => (
              <button
                key={day}
                type="button"
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs',
                  state.weekdays.includes(day) ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted',
                )}
                onClick={() =>
                  patch({
                    weekdays: state.weekdays.includes(day)
                      ? state.weekdays.filter((item) => item !== day)
                      : [...state.weekdays, day],
                  })
                }
              >
                {t(`personal.habitWeekday.${day}`)}
              </button>
            ))}
          </div>
        ) : null}
        {state.scheduleKind === GrowthHabitScheduleKind.INTERVAL ? (
          <label className="block space-y-1 text-sm">
            <span className="text-ink-muted">{t('personal.habitFieldInterval')}</span>
            <input
              type="number"
              min={1}
              max={365}
              className={fieldClass}
              value={state.intervalDays}
              onChange={(e) => patch({ intervalDays: e.target.value })}
            />
          </label>
        ) : null}

        <div>
          <p className="mb-1 text-sm text-ink-muted">{t('personal.habitGoal')}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:grid-cols-3">
            <input
              type="number"
              min={0}
              step="any"
              className={fieldClass}
              value={state.targetValue}
              onChange={(e) => patch({ targetValue: e.target.value })}
              aria-label={t('personal.habitFieldTarget')}
            />
            <select
              className={fieldClass}
              value={state.targetUnit}
              onChange={(e) => patch({ targetUnit: e.target.value })}
              aria-label={t('personal.habitFieldUnit')}
            >
              {HABIT_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`personal.habitUnit.${unit}`)}
                </option>
              ))}
            </select>
            <select
              className={cn(fieldClass, 'col-span-2 sm:col-span-1')}
              value={state.goalPeriod}
              onChange={(e) => patch({ goalPeriod: e.target.value })}
              aria-label={t('personal.habitFieldPeriod')}
            >
              {Object.values(GrowthHabitGoalPeriod).map((value) => (
                <option key={value} value={value}>
                  {t(`personal.habitGoalPeriod.${value}`)}
                </option>
              ))}
            </select>
          </div>
          {state.targetUnit === 'custom' ? (
            <input
              className={`${fieldClass} mt-2`}
              value={state.customUnit}
              onChange={(e) => patch({ customUnit: e.target.value })}
              placeholder={t('personal.habitCustomUnit')}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2.5">
          <span className="text-sm text-ink">{t('personal.habitReminder')}</span>
          <button
            type="button"
            className={state.reminderEnabled ? 'text-sm font-medium text-brand-700' : 'text-sm text-ink-muted'}
            onClick={() => patch({ reminderEnabled: !state.reminderEnabled })}
          >
            {state.reminderEnabled ? t('personal.prefOn') : t('personal.prefOff')}
          </button>
        </div>
        {state.reminderEnabled ? (
          <input
            type="time"
            className={fieldClass}
            value={state.reminderTime}
            onChange={(e) => patch({ reminderTime: e.target.value })}
          />
        ) : null}

        <button
          type="button"
          className="text-xs font-medium text-brand-700 hover:underline"
          onClick={() => setAdvanced((value) => !value)}
        >
          {advanced ? t('personal.habitAdvancedHide') : t('personal.habitAdvanced')}
        </button>

        {advanced ? (
          <div className="space-y-3 rounded-2xl border border-line p-3">
            <label className="block space-y-1 text-sm">
              <span className="text-ink-muted">{t('personal.habitCategoryLabel')}</span>
              <select
                className={fieldClass}
                value={state.category}
                onChange={(e) => patch({ category: e.target.value })}
              >
                <option value="">{t('personal.habitCategory.other')}</option>
                {HABIT_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {t(`personal.habitCategory.${key}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-ink-muted">{t('personal.habitWhen')}</span>
              <select
                className={fieldClass}
                value={state.timeOfDay}
                onChange={(e) => patch({ timeOfDay: e.target.value })}
              >
                {Object.values(GrowthHabitTimeOfDay).map((value) => (
                  <option key={value} value={value}>
                    {t(`personal.habitTimeOfDay.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block min-w-0 space-y-1 text-sm">
                <span className="text-ink-muted">{t('personal.habitStartDate')}</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={state.startDayKey}
                  onChange={(e) => patch({ startDayKey: e.target.value })}
                />
              </label>
              <label className="block min-w-0 space-y-1 text-sm">
                <span className="text-ink-muted">{t('personal.habitEndDate')}</span>
                {state.endUnlimited ? (
                  <button
                    type="button"
                    className={fieldClass}
                    onClick={() => patch({ endUnlimited: false })}
                  >
                    {t('personal.habitEndUnlimited')}
                  </button>
                ) : (
                  <input
                    type="date"
                    className={fieldClass}
                    value={state.endDayKey}
                    onChange={(e) => {
                      const value = e.target.value;
                      patch({ endDayKey: value, endUnlimited: !value });
                    }}
                  />
                )}
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-ink-muted">{t('personal.habitStackAfter')}</span>
              <select
                className={fieldClass}
                value={state.stackAfterHabitId}
                onChange={(e) => {
                  const id = e.target.value;
                  const title = stackOptions.find((item) => item.id === id)?.title ?? '';
                  patch({
                    stackAfterHabitId: id,
                    stackCue: id ? t('personal.habitStackAfterCue', { title }) : '',
                  });
                }}
              >
                <option value="">{t('personal.habitStackNone')}</option>
                {stackOptions
                  .filter((item) => item.id !== habit?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <div className="space-y-1">
              <p className="text-sm text-ink-muted">{t('personal.habitChecklist')}</p>
              {state.checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="size-4 shrink-0 rounded border border-line-strong" />
                  <input
                    className={fieldClass}
                    value={item}
                    onChange={(e) =>
                      patch({
                        checklist: state.checklist.map((row, i) => (i === index ? e.target.value : row)),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="shrink-0 text-ink-muted hover:text-danger-700"
                    aria-label={t('personal.habitChecklistDelete')}
                    onClick={() =>
                      patch({ checklist: state.checklist.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {state.checklist.length < 8 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 hover:underline"
                  onClick={() => patch({ checklist: [...state.checklist, ''] })}
                >
                  {t('personal.habitChecklistAdd')}
                </button>
              ) : null}
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-ink-muted">{t('personal.habitNotes')}</span>
              <textarea
                className={fieldClass}
                rows={2}
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder={t('personal.habitNotesPlaceholder')}
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-danger-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-line px-3 py-2 text-sm text-ink-soft hover:bg-surface-hover"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={pending || !state.title.trim()}
            className="rounded-input bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? t('app.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
