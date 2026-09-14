import { formatMoneyCompact } from '@furniture-erp/shared';

interface SeriesPoint {
  month: string;
}

interface PlatformBarChartProps {
  title: string;
  series: SeriesPoint[];
  keys: Array<{
    key: string;
    label: string;
    className: string;
    format?: (value: number) => string;
  }>;
  emptyLabel: string;
}

export function PlatformBarChart({ title, series, keys, emptyLabel }: PlatformBarChartProps) {
  const max = Math.max(
    1,
    ...series.flatMap((point) =>
      keys.map((item) => Math.abs(Number((point as unknown as Record<string, unknown>)[item.key] ?? 0))),
    ),
  );

  return (
    <section className="min-w-0 overflow-x-hidden rounded-panel border border-line bg-surface p-4 shadow-card sm:p-5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {series.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {series.map((point) => (
            <li key={point.month} className="min-w-0">
              <p className="mb-1 text-xs font-medium text-ink-muted">{point.month}</p>
              <div className="space-y-1">
                {keys.map((item) => {
                  const value = Number((point as unknown as Record<string, unknown>)[item.key] ?? 0);
                  const width = `${Math.max(2, Math.round((Math.abs(value) / max) * 100))}%`;
                  return (
                    <div key={item.key} className="flex min-w-0 items-center gap-2">
                      <span className="w-20 shrink-0 truncate text-[11px] text-ink-subtle">
                        {item.label}
                      </span>
                      <div className="h-2 min-w-0 flex-1 rounded-full bg-canvas">
                        <div className={`h-2 rounded-full ${item.className}`} style={{ width }} />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-ink">
                        {item.format ? item.format(value) : formatMoneyCompact(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
