import type { ExpenseAnalytics, ExpenseDailyPoint } from '@furniture-erp/shared';
import { Receipt } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SectionCard } from '@/components/ui/SectionCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatMoneyCompact } from '@/utils/format';

export interface DailyExpenseTrendChartProps {
  analytics?: ExpenseAnalytics;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 40, left: 52 };
const STROKE = '#f79009';

/**
 * Daily operating-expense trend (SVG area/line).
 * Amounts come from `/api/analytics/expenses` — display-only on the client.
 */
export function DailyExpenseTrendChart({
  analytics,
  isLoading,
  isError = false,
  onRetry,
  isRetrying = false,
}: DailyExpenseTrendChartProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = useMemo(() => analytics?.dailyTrend ?? [], [analytics?.dailyTrend]);
  const hasExpenses = (analytics?.count ?? 0) > 0 || points.some((point) => point.amount > 0);
  const plot = useMemo(() => buildPlot(points), [points]);

  return (
    <SectionCard
      title="Kunlik xarajatlar"
      description="Tanlangan davr bo'yicha xarajatlar"
      padded={false}
      className="min-w-0"
    >
      {isLoading ? (
        <div
          className="space-y-3 p-4 sm:p-5"
          aria-busy="true"
          data-testid="daily-expense-chart-loading"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : isError && !analytics ? (
        <ErrorState
          title="Xarajatlar ma'lumotlarini yuklab bo'lmadi."
          message="Qayta urinib ko'ring."
          retryLabel="Qayta urinish"
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : !hasExpenses ? (
        <EmptyState
          icon={Receipt}
          title="Bu davrda xarajatlar mavjud emas."
          description="Xarajat yozuvlari paydo bo'lganda grafik shu yerda ko'rinadi."
        />
      ) : (
        <div className="p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="tabular-money text-lg font-semibold text-ink">
              {formatMoney(analytics?.total ?? plot.total)}
            </p>
            {activeIndex !== null && plot.points[activeIndex] ? (
              <p className="text-xs text-ink-muted" data-testid="daily-expense-tooltip">
                <span className="font-medium text-ink">{plot.points[activeIndex].label}</span>
                {' · '}
                {formatMoney(plot.points[activeIndex].amount)}
              </p>
            ) : (
              <p className="text-xs text-ink-subtle">Nuqta ustiga boring — kunlik xarajat</p>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Kunlik xarajatlar grafigi"
              className="h-52 w-full min-w-0 text-warning-500 sm:min-w-[28rem]"
              onMouseLeave={() => setActiveIndex(null)}
              data-testid="daily-expense-trend-chart"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STROKE} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={STROKE} stopOpacity="0.02" />
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
                stroke={STROKE}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                data-series="expenses"
              />

              {plot.points.map((point, index) => (
                <g key={point.date}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={activeIndex === index ? 4.5 : 3}
                    fill="#fff"
                    stroke={STROKE}
                    strokeWidth={2}
                    className={activeIndex === index ? 'opacity-100' : 'opacity-0 sm:opacity-100'}
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
                    aria-label={`${point.label}: ${formatMoney(point.amount)}`}
                  />
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

interface PlotPoint extends ExpenseDailyPoint {
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
  total: number;
}

function buildPlot(points: ExpenseDailyPoint[]): Plot {
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const maxAmount = Math.max(...points.map((point) => point.amount), 0);
  const niceMax = niceCeiling(maxAmount);
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const plotted: PlotPoint[] = points.map((point, index) => {
    const x = PAD.left + (points.length === 1 ? innerWidth / 2 : index * step);
    const ratio = niceMax === 0 ? 0 : point.amount / niceMax;
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
    .map((point) => ({ key: point.date, x: point.x, text: point.label }));

  return {
    points: plotted,
    linePath,
    areaPath,
    gridYs,
    gridValues,
    xLabels,
    hitWidth: Math.max(step || innerWidth, 12),
    total: points.reduce((sum, point) => sum + point.amount, 0),
  };
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}
