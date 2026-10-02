import {
  SmmFinanceChartPreset,
  type SmmDashboardFinance,
  type SmmDashboardFinancePoint,
  type SmmFinanceChartPreset as SmmFinanceChartPresetType,
} from '@furniture-erp/shared';
import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyCompact } from '@/utils/format';

export interface AgencyFinanceChartProps {
  finance?: SmmDashboardFinance | null;
  financePreset: SmmFinanceChartPresetType;
  onFinancePresetChange: (preset: SmmFinanceChartPresetType) => void;
  isLoading: boolean;
  /** Hidden entirely for client members. */
  hidden?: boolean;
  className?: string;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 40, left: 52 };

const SERIES = [
  { key: 'revenue' as const, labelKey: 'smm.kpiRevenue', stroke: '#6366f1' },
  { key: 'expenses' as const, labelKey: 'smm.kpiExpenses', stroke: '#dc6803' },
  { key: 'profit' as const, labelKey: 'smm.kpiProfit', stroke: '#12b76a' },
];

const FINANCE_PRESET_OPTIONS: Array<{
  value: SmmFinanceChartPresetType;
  labelKey: string;
}> = [
  { value: SmmFinanceChartPreset.LAST_7_DAYS, labelKey: 'smm.financePreset7d' },
  { value: SmmFinanceChartPreset.LAST_30_DAYS, labelKey: 'smm.financePreset30d' },
  { value: SmmFinanceChartPreset.LAST_3_MONTHS, labelKey: 'smm.financePreset3m' },
  { value: SmmFinanceChartPreset.LAST_12_MONTHS, labelKey: 'smm.financePreset12m' },
];

export function AgencyFinanceChart({
  finance,
  financePreset,
  onFinancePresetChange,
  isLoading,
  hidden = false,
  className,
}: AgencyFinanceChartProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const points = useMemo(() => finance?.points ?? [], [finance?.points]);
  const hasData = points.some(
    (point) => point.revenue !== 0 || point.expenses !== 0 || point.profit !== 0,
  );
  const plot = useMemo(() => buildPlot(points), [points]);

  if (hidden) return null;

  return (
    <SectionCard
      title={t('smm.financeTitle')}
      description={t('smm.financeHint')}
      action={
        <div
          role="group"
          aria-label={t('smm.financePresetLabel')}
          className="flex flex-wrap gap-1 rounded-input border border-line bg-surface p-0.5"
        >
          {FINANCE_PRESET_OPTIONS.map((option) => {
            const selected = option.value === financePreset;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onFinancePresetChange(option.value)}
                className={cn(
                  'rounded-[0.35rem] px-2 py-1 text-[11px] font-medium transition-colors',
                  selected
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-soft hover:bg-surface-hover hover:text-ink',
                )}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      }
      padded={false}
      className={cn('min-w-0', className)}
    >
      {isLoading && !finance ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={BarChart3}
          title={t('smm.financeEmptyTitle')}
          description={t('smm.financeEmptyHint')}
        />
      ) : (
        <div className="p-3 sm:p-5">
          {finance ? (
            <div className="mb-3 grid grid-cols-3 gap-2">
              <Total label={t('smm.kpiRevenue')} value={formatMoney(finance.revenue)} />
              <Total label={t('smm.kpiExpenses')} value={formatMoney(finance.expenses)} />
              <Total label={t('smm.kpiProfit')} value={formatMoney(finance.profit)} />
            </div>
          ) : null}

          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label={t('smm.financeLegend')}>
            {SERIES.map((series) => (
              <li key={series.key} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: series.stroke }}
                  aria-hidden="true"
                />
                {t(series.labelKey)}
              </li>
            ))}
          </ul>

          {activeIndex !== null && plot.points[activeIndex] ? (
            <div className="mb-3 rounded-input border border-line bg-surface-muted px-3 py-2 text-xs text-ink-muted">
              <p className="font-medium text-ink">{plot.points[activeIndex].label}</p>
              <ul className="mt-1 grid gap-0.5 sm:grid-cols-3">
                {SERIES.map((series) => (
                  <li key={series.key} className="tabular-money">
                    <span className="text-ink-subtle">{t(series.labelKey)}: </span>
                    {formatMoney(plot.points[activeIndex]![series.key])}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mb-3 text-xs text-ink-subtle">{t('smm.financeHoverHint')}</p>
          )}

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label={t('smm.financeTitle')}
              className="h-52 w-full min-w-0 sm:min-w-[28rem]"
              onMouseLeave={() => setActiveIndex(null)}
            >
              {plot.gridYs.map((y, index) => (
                <g key={y}>
                  <line
                    x1={PAD.left}
                    x2={CHART_WIDTH - PAD.right}
                    y1={y}
                    y2={y}
                    className="stroke-line"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-ink-subtle text-[10px]"
                  >
                    {formatMoneyCompact(plot.gridValues[index] ?? 0)}
                  </text>
                </g>
              ))}

              {SERIES.map((series) => (
                <path
                  key={series.key}
                  d={plot.linePaths[series.key]}
                  fill="none"
                  stroke={series.stroke}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {plot.points.map((point, index) => (
                <g key={point.start}>
                  <rect
                    x={point.x - plot.hitWidth / 2}
                    y={PAD.top}
                    width={plot.hitWidth}
                    height={CHART_HEIGHT - PAD.top - PAD.bottom}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    tabIndex={0}
                    role="listitem"
                    aria-label={`${point.label}`}
                  />
                  {activeIndex === index
                    ? SERIES.map((series) => (
                        <circle
                          key={series.key}
                          cx={point.x}
                          cy={point.ys[series.key]}
                          r={4}
                          fill="#fff"
                          stroke={series.stroke}
                          strokeWidth={2}
                        />
                      ))
                    : null}
                </g>
              ))}

              {plot.xLabels.map((label) => (
                <text
                  key={label.key}
                  x={label.x}
                  y={CHART_HEIGHT - 14}
                  textAnchor="middle"
                  className="fill-ink-subtle text-[10px]"
                >
                  {label.text}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input border border-line bg-surface-muted px-2.5 py-2">
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

type SeriesKey = (typeof SERIES)[number]['key'];

interface PlotPoint extends SmmDashboardFinancePoint {
  x: number;
  ys: Record<SeriesKey, number>;
}

interface Plot {
  points: PlotPoint[];
  linePaths: Record<SeriesKey, string>;
  gridYs: number[];
  gridValues: number[];
  xLabels: { key: string; x: number; text: string }[];
  hitWidth: number;
}

function buildPlot(points: SmmDashboardFinancePoint[]): Plot {
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const values = points.flatMap((point) => [point.revenue, point.expenses, point.profit]);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0);
  const niceMax = niceCeiling(maxAbs);
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const yFor = (value: number) => {
    const ratio = niceMax === 0 ? 0 : value / niceMax;
    return PAD.top + innerHeight - ratio * innerHeight;
  };

  const plotted: PlotPoint[] = points.map((point, index) => {
    const x = PAD.left + (points.length === 1 ? innerWidth / 2 : index * step);
    return {
      ...point,
      x,
      ys: {
        revenue: yFor(point.revenue),
        expenses: yFor(point.expenses),
        profit: yFor(point.profit),
      },
    };
  });

  const linePaths = Object.fromEntries(
    SERIES.map((series) => [
      series.key,
      plotted
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.ys[series.key]}`)
        .join(' '),
    ]),
  ) as Record<SeriesKey, string>;

  const gridValues = [0, niceMax / 2, niceMax];
  const gridYs = gridValues.map((value) => yFor(value));

  const labelEvery = Math.max(1, Math.ceil(plotted.length / 8));
  const xLabels = plotted
    .filter((_, index) => index % labelEvery === 0 || index === plotted.length - 1)
    .map((point) => ({ key: point.start, x: point.x, text: point.label }));

  return {
    points: plotted,
    linePaths,
    gridYs,
    gridValues,
    xLabels,
    hitWidth: Math.max(step || innerWidth, 12),
  };
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}
