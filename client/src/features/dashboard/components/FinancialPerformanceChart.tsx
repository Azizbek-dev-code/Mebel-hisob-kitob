import type { FinancialTrend, FinancialTrendPoint } from '@furniture-erp/shared';
import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyCompact } from '@/utils/format';

export interface FinancialPerformanceChartProps {
  trend?: FinancialTrend;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const PAD = { top: 16, right: 12, bottom: 40, left: 52 };

const SERIES = [
  { key: 'revenue' as const, label: 'Sotuv', colorClass: 'text-brand-500', stroke: '#6366f1' },
  { key: 'cogs' as const, label: 'Tannarx', colorClass: 'text-info-500', stroke: '#2e90fa' },
  {
    key: 'grossProfit' as const,
    label: 'Yalpi foyda',
    colorClass: 'text-success-500',
    stroke: '#12b76a',
  },
  {
    key: 'netProfit' as const,
    label: 'Sof foyda',
    colorClass: 'text-warning-600',
    stroke: '#dc6803',
  },
];

/**
 * Multi-line financial performance chart (SVG — no extra chart library).
 *
 * Values are display-only; totals come from `/api/analytics/financial-trend`.
 */
export function FinancialPerformanceChart({
  trend,
  isLoading,
  isError = false,
  onRetry,
  isRetrying = false,
}: FinancialPerformanceChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = useMemo(() => trend?.points ?? [], [trend?.points]);
  const hasData = points.some(
    (point) =>
      point.revenue !== 0 ||
      point.cogs !== 0 ||
      point.grossProfit !== 0 ||
      point.operatingExpenses !== 0 ||
      point.netProfit !== 0,
  );
  const plot = useMemo(() => buildPlot(points), [points]);

  return (
    <SectionCard
      title="Moliyaviy natijalar"
      description="Tanlangan davr bo'yicha moliyaviy ko'rsatkichlar"
      padded={false}
      className="min-w-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true" data-testid="financial-chart-loading">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError && !trend ? (
        <ErrorState
          title="Grafik ma'lumotlarini yuklab bo'lmadi."
          message="Qayta urinib ko'ring."
          retryLabel="Qayta urinish"
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : !hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Bu davr uchun moliyaviy ma'lumot topilmadi."
          description="Sotuv yoki xarajat paydo bo'lganda grafik shu yerda ko'rinadi."
        />
      ) : (
        <div className="p-3 sm:p-5">
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Grafik belgisi">
            {SERIES.map((series) => (
              <li key={series.key} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <span
                  className={cn('size-2.5 rounded-full', series.colorClass)}
                  style={{ backgroundColor: series.stroke }}
                  aria-hidden="true"
                />
                {series.label}
              </li>
            ))}
          </ul>

          {activeIndex !== null && plot.points[activeIndex] ? (
            <div
              className="mb-3 rounded-input border border-line bg-surface-muted px-3 py-2 text-xs text-ink-muted"
              data-testid="financial-chart-tooltip"
            >
              <p className="font-medium text-ink">{plot.points[activeIndex].label}</p>
              <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                {SERIES.map((series) => (
                  <li key={series.key} className="tabular-money">
                    <span className="text-ink-subtle">{series.label}: </span>
                    {formatMoney(plot.points[activeIndex]![series.key])}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mb-3 text-xs text-ink-subtle">
              Nuqta ustiga boring — kunlik qiymatlar so&apos;mda ko&apos;rsatiladi
            </p>
          )}

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Moliyaviy natijalar grafigi"
              className="h-56 w-full min-w-0 sm:min-w-[28rem]"
              onMouseLeave={() => setActiveIndex(null)}
              data-testid="financial-performance-chart"
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
                  data-series={series.key}
                />
              ))}

              {plot.points.map((point, index) => (
                <g key={point.bucketStart}>
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
                    aria-label={`${point.label}: Sotuv ${formatMoney(point.revenue)}, Sof foyda ${formatMoney(point.netProfit)}`}
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

type SeriesKey = (typeof SERIES)[number]['key'];

interface PlotPoint extends FinancialTrendPoint {
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

function buildPlot(points: FinancialTrendPoint[]): Plot {
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const values = points.flatMap((point) => [
    point.revenue,
    point.cogs,
    point.grossProfit,
    point.netProfit,
  ]);
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
        cogs: yFor(point.cogs),
        grossProfit: yFor(point.grossProfit),
        netProfit: yFor(point.netProfit),
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
    .map((point) => ({ key: point.bucketStart, x: point.x, text: point.label }));

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
