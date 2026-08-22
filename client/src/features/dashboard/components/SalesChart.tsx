import type { DashboardSalesPoint } from '@furniture-erp/shared';
import { BarChart3 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyCompact } from '@/utils/format';

export interface SalesChartProps {
  points: DashboardSalesPoint[];
  periodLabel: string;
  isLoading: boolean;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 36, left: 48 };

/**
 * Sales over the selected period.
 *
 * Built as SVG so the dashboard stays free of a chart dependency. Empty periods
 * get a proper empty state rather than a flat zero line that looks like data.
 */
export function SalesChart({ points, periodLabel, isLoading }: SalesChartProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasSales = points.some((point) => point.salesCount > 0 || point.revenue > 0);
  const plot = useMemo(() => buildPlot(points), [points]);

  return (
    <SectionCard
      title="Sales overview"
      description={periodLabel}
      padded={false}
      className="min-w-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !hasSales ? (
        <EmptyState
          icon={BarChart3}
          title="No sales in this period"
          description="Figures appear here once sales are recorded. The Sales module lands in a later phase."
        />
      ) : (
        <div className="p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="tabular-money text-lg font-semibold text-ink">
              {formatMoney(plot.totalRevenue)}
            </p>
            {activeIndex !== null && plot.points[activeIndex] ? (
              <p className="text-xs text-ink-muted">
                <span className="font-medium text-ink">{plot.points[activeIndex].label}</span>
                {' · '}
                {formatMoney(plot.points[activeIndex].revenue)}
                {' · '}
                {plot.points[activeIndex].salesCount} sale
                {plot.points[activeIndex].salesCount === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="text-xs text-ink-subtle">Hover a point for the day&apos;s takings</p>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label={`Sales chart for ${periodLabel}`}
              className="h-52 w-full min-w-[28rem] text-brand-500"
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>

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

              <path d={plot.areaPath} fill={`url(#${gradientId})`} />
              <path
                d={plot.linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {plot.points.map((point, index) => (
                <g key={point.bucketStart}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={activeIndex === index ? 4.5 : 3}
                    className={cn(
                      'fill-surface stroke-current transition-all',
                      activeIndex === index ? 'opacity-100' : 'opacity-0 sm:opacity-100',
                    )}
                    strokeWidth={2}
                  />
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
                    aria-label={`${point.label}: ${formatMoney(point.revenue)}`}
                  />
                </g>
              ))}

              {plot.xLabels.map((label) => (
                <text
                  key={label.key}
                  x={label.x}
                  y={CHART_HEIGHT - 12}
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

interface PlotPoint extends DashboardSalesPoint {
  x: number;
  y: number;
}

interface Plot {
  points: PlotPoint[];
  linePath: string;
  areaPath: string;
  gridYs: number[];
  gridValues: number[];
  xLabels: { key: string; x: number; text: string }[];
  hitWidth: number;
  totalRevenue: number;
}

function buildPlot(points: DashboardSalesPoint[]): Plot {
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const maxRevenue = Math.max(...points.map((point) => point.revenue), 0);
  const niceMax = niceCeiling(maxRevenue);
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const plotted: PlotPoint[] = points.map((point, index) => {
    const x = PAD.left + (points.length === 1 ? innerWidth / 2 : index * step);
    const ratio = niceMax === 0 ? 0 : point.revenue / niceMax;
    const y = PAD.top + innerHeight - ratio * innerHeight;
    return { ...point, x, y };
  });

  const linePath = plotted
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath =
    plotted.length === 0
      ? ''
      : `${linePath} L ${plotted[plotted.length - 1]!.x} ${PAD.top + innerHeight} L ${plotted[0]!.x} ${PAD.top + innerHeight} Z`;

  const gridValues = [0, niceMax / 2, niceMax];
  const gridYs = gridValues.map(
    (value) => PAD.top + innerHeight - (niceMax === 0 ? 0 : (value / niceMax) * innerHeight),
  );

  const labelEvery = Math.max(1, Math.ceil(plotted.length / 8));
  const xLabels = plotted
    .filter((_, index) => index % labelEvery === 0 || index === plotted.length - 1)
    .map((point) => ({ key: point.bucketStart, x: point.x, text: point.label }));

  return {
    points: plotted,
    linePath,
    areaPath,
    gridYs,
    gridValues,
    xLabels,
    hitWidth: Math.max(step || innerWidth, 12),
    totalRevenue: points.reduce((total, point) => total + point.revenue, 0),
  };
}

/** Rounds a max up to a readable chart ceiling (1 / 2 / 5 × 10^n). */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}
