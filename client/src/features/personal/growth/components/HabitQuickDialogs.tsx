import type { GrowthHabitDto } from '@furniture-erp/shared';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';

import { formatHabitTargetProgress } from './habit-ui';

export function HabitLogDialog({
  habit,
  pending,
  onClose,
  onSubmit,
}: {
  habit: GrowthHabitDto;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const unitLabel = t(`personal.habitUnit.${habit.targetUnit}`, { defaultValue: habit.targetUnit });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(value);
    if (!(parsed >= 0)) return;
    await onSubmit(parsed);
    onClose();
  }

  return (
    <Dialog open title={t('personal.habitLogAdd')} onClose={onClose} className="sm:max-w-sm">
      <form className="space-y-3 p-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm text-ink-muted">
          {habit.title} · {formatHabitTargetProgress(habit, t)}
        </p>
        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">
            {t('personal.habitLogValue')} ({unitLabel})
          </span>
          <input
            type="number"
            min={0}
            step="any"
            required
            autoFocus
            className="w-full rounded-input border border-line px-3 py-2.5 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={String(habit.targetValue)}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {t('personal.habitLogAdd')}
        </button>
      </form>
    </Dialog>
  );
}

export function HabitNoteDialog({
  habit,
  pending,
  onClose,
  onSubmit,
}: {
  habit: GrowthHabitDto;
  pending: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    onClose();
  }

  return (
    <Dialog open title={t('personal.habitAddNote')} onClose={onClose} className="sm:max-w-sm">
      <form className="space-y-3 p-4" onSubmit={(event) => void handleSubmit(event)}>
        <p className="text-sm text-ink-muted">{habit.title}</p>
        <textarea
          className="min-h-[100px] w-full rounded-input border border-line px-3 py-2.5 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('personal.habitNotePlaceholder')}
          maxLength={500}
          required
          autoFocus
        />
        <button
          type="submit"
          disabled={pending || !note.trim()}
          className="w-full rounded-input bg-brand-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {t('personal.habitAddNote')}
        </button>
      </form>
    </Dialog>
  );
}

export function HabitNotesListDialog({
  habit,
  notes,
  loading,
  onClose,
}: {
  habit: GrowthHabitDto;
  notes: Array<{ id: string; dayKey: string; note: string; loggedAt: string }>;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open title={t('personal.habitViewNotes')} onClose={onClose} className="sm:max-w-sm">
      <div className="space-y-2 p-4">
        <p className="text-sm text-ink-muted">{habit.title}</p>
        {loading ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('personal.habitNoNotes')}</p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {notes.map((row) => (
              <li key={row.id} className="rounded-xl border border-line px-3 py-2">
                <p className="text-sm text-ink">{row.note}</p>
                <p className="mt-1 text-[11px] text-ink-soft">
                  {row.dayKey} · {new Date(row.loggedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
