import { describe, expect, it } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';

import { FinancialPerformanceChart } from './FinancialPerformanceChart';
import {
  EMPTY_FINANCIAL_TREND,
  POPULATED_FINANCIAL_TREND,
} from '../test/financial-fixtures';

describe('FinancialPerformanceChart', () => {
  it('renders loading skeletons', () => {
    renderWithProviders(<FinancialPerformanceChart isLoading />);
    expect(screen.getByTestId('financial-chart-loading')).toBeInTheDocument();
    expect(screen.getByText('Moliyaviy natijalar')).toBeInTheDocument();
  });

  it('renders empty state when there is no financial activity', () => {
    renderWithProviders(
      <FinancialPerformanceChart trend={EMPTY_FINANCIAL_TREND} isLoading={false} />,
    );
    expect(
      screen.getByText(/Bu davr uchun moliyaviy ma'lumot topilmadi/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('financial-performance-chart')).not.toBeInTheDocument();
  });

  it('renders all four series paths from fixture data', () => {
    renderWithProviders(
      <FinancialPerformanceChart trend={POPULATED_FINANCIAL_TREND} isLoading={false} />,
    );

    expect(screen.getByTestId('financial-performance-chart')).toBeInTheDocument();
    expect(document.querySelector('[data-series="revenue"]')).toBeTruthy();
    expect(document.querySelector('[data-series="cogs"]')).toBeTruthy();
    expect(document.querySelector('[data-series="grossProfit"]')).toBeTruthy();
    expect(document.querySelector('[data-series="netProfit"]')).toBeTruthy();
    expect(screen.getByText('Sotuv')).toBeInTheDocument();
    expect(screen.getByText('Tannarx')).toBeInTheDocument();
    expect(screen.getByText('Yalpi foyda')).toBeInTheDocument();
    expect(screen.getByText('Sof foyda')).toBeInTheDocument();
  });

  it('shows an isolated error with retry', () => {
    const onRetry = () => undefined;
    renderWithProviders(
      <FinancialPerformanceChart isLoading={false} isError onRetry={onRetry} />,
    );
    expect(screen.getByText(/Grafik ma'lumotlarini yuklab bo'lmadi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Qayta urinish' })).toBeInTheDocument();
  });

  it('maps API totals without floating-point drift in fixture reconciliation', () => {
    const { totals, points } = POPULATED_FINANCIAL_TREND;
    const sum = (key: 'revenue' | 'cogs' | 'grossProfit' | 'netProfit') =>
      points.reduce((acc, point) => acc + point[key], 0);

    expect(sum('revenue')).toBe(totals.revenue);
    expect(sum('cogs')).toBe(totals.cogs);
    expect(sum('grossProfit')).toBe(totals.grossProfit);
    expect(sum('netProfit')).toBe(totals.netProfit);
    expect(totals.revenue).toBe(20_450_000);
    expect(totals.netProfit).toBe(3_450_000);
  });
});
