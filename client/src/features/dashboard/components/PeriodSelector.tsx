import { DateRangePreset } from '@furniture-erp/shared';
import { CalendarRange } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { cn } from '@/lib/cn';

import { PERIOD_OPTIONS, type DashboardPeriod } from '../period';

export interface PeriodSelectorProps {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  disabled?: boolean;
}

/**
 * Reporting period control for the financial dashboard.
 *
 * Presets apply immediately. Custom ranges stay local until "Qo'llash" so the
 * analytics API is not hit on every date keystroke.
 */
export function PeriodSelector({ period, onChange, disabled = false }: PeriodSelectorProps) {
  const fromId = useId();
  const toId = useId();

  const isCustom = period.preset === DateRangePreset.CUSTOM;
  const [draftFrom, setDraftFrom] = useState(period.from ?? '');
  const [draftTo, setDraftTo] = useState(period.to ?? '');

  useEffect(() => {
    if (period.preset === DateRangePreset.CUSTOM) {
      setDraftFrom(period.from ?? '');
      setDraftTo(period.to ?? '');
    }
  }, [period.preset, period.from, period.to]);

  const isReversed = Boolean(draftFrom && draftTo && draftFrom > draftTo);
  const canApply = Boolean(draftFrom && draftTo && draftFrom <= draftTo);

  function selectPreset(preset: DateRangePreset) {
    if (preset === DateRangePreset.CUSTOM) {
      onChange({ preset, from: undefined, to: undefined });
      setDraftFrom('');
      setDraftTo('');
      return;
    }
    onChange({ preset });
  }

  function applyCustom() {
    if (!canApply) return;
    onChange({ preset: DateRangePreset.CUSTOM, from: draftFrom, to: draftTo });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div
        role="group"
        aria-label="Hisobot davri"
        className="flex flex-wrap gap-1 rounded-input border border-line bg-surface p-1"
      >
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = option.value === period.preset;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectPreset(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                'rounded-[0.4rem] px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                isSelected
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          );
        })}
      </div>

      {isCustom ? (
        <div className="flex flex-col gap-2 rounded-input border border-line bg-surface p-2 sm:flex-row sm:items-end">
          <CalendarRange className="mb-2 hidden size-4 shrink-0 text-ink-subtle sm:block" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <label htmlFor={fromId} className="mb-1 block text-xs font-medium text-ink-soft">
              Boshlanish sanasi
            </label>
            <input
              id={fromId}
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(event) => setDraftFrom(event.target.value)}
              disabled={disabled}
              className={dateInputClassName}
            />
          </div>

          <div className="min-w-0 flex-1">
            <label htmlFor={toId} className="mb-1 block text-xs font-medium text-ink-soft">
              Tugash sanasi
            </label>
            <input
              id={toId}
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(event) => setDraftTo(event.target.value)}
              disabled={disabled}
              className={dateInputClassName}
            />
          </div>

          <button
            type="button"
            onClick={applyCustom}
            disabled={disabled || !canApply}
            className={cn(
              'rounded-input bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors',
              'hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            Qo&apos;llash
          </button>
        </div>
      ) : null}

      {isCustom && isReversed ? (
        <p role="status" className="text-xs text-danger-600 sm:text-right">
          Boshlanish sanasi tugash sanasidan keyin bo&apos;lmasligi kerak.
        </p>
      ) : null}

      {isCustom && !draftFrom && !draftTo ? (
        <p role="status" className="text-xs text-ink-subtle sm:text-right">
          Sanalarni tanlang va Qo&apos;llash tugmasini bosing.
        </p>
      ) : null}
    </div>
  );
}

const dateInputClassName =
  'w-full rounded-[0.4rem] border border-line-strong bg-surface px-2 py-1.5 text-xs text-ink transition-colors hover:border-ink-subtle sm:text-sm';
