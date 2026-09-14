import { PLATFORM_DATE_PRESETS, PlatformDatePreset } from '@furniture-erp/shared';
import { useTranslation } from 'react-i18next';

const PRESET_LABEL_KEYS: Record<(typeof PLATFORM_DATE_PRESETS)[number], string> = {
  LAST_7_DAYS: 'platformAdmin.dates.d7',
  LAST_30_DAYS: 'platformAdmin.dates.d30',
  LAST_3_MONTHS: 'platformAdmin.dates.m3',
  LAST_6_MONTHS: 'platformAdmin.dates.m6',
  LAST_YEAR: 'platformAdmin.dates.y1',
  THIS_MONTH: 'platformAdmin.dates.thisMonth',
  LAST_MONTH: 'platformAdmin.dates.lastMonth',
  THIS_YEAR: 'platformAdmin.dates.thisYear',
  CUSTOM: 'platformAdmin.dates.custom',
};

export function PlatformDateFilter({
  preset,
  onPresetChange,
  from,
  to,
  onCustomChange,
}: {
  preset: string;
  onPresetChange: (preset: string) => void;
  from?: string;
  to?: string;
  onCustomChange?: (next: { from: string; to: string }) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex max-w-full flex-wrap gap-1 overflow-x-auto">
        {PLATFORM_DATE_PRESETS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPresetChange(item)}
            className={`rounded-input px-3 py-1.5 text-sm ${
              preset === item ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-hover'
            }`}
          >
            {t(PRESET_LABEL_KEYS[item])}
          </button>
        ))}
      </div>
      {preset === PlatformDatePreset.CUSTOM && onCustomChange ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-ink-muted">{t('platformAdmin.dates.from')}</span>
            <input
              type="date"
              className="w-full rounded-input border border-line px-3 py-2 text-sm"
              value={from ?? ''}
              onChange={(event) => onCustomChange({ from: event.target.value, to: to ?? event.target.value })}
            />
          </label>
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block text-ink-muted">{t('platformAdmin.dates.to')}</span>
            <input
              type="date"
              className="w-full rounded-input border border-line px-3 py-2 text-sm"
              value={to ?? ''}
              onChange={(event) => onCustomChange({ from: from ?? event.target.value, to: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
