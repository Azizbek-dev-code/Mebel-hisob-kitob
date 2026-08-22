import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';

import { DailyExpenseTrendChart } from './DailyExpenseTrendChart';
import {
  EMPTY_EXPENSE_ANALYTICS,
  POPULATED_EXPENSE_ANALYTICS,
} from '../test/financial-fixtures';

describe('DailyExpenseTrendChart', () => {
  it('renders loading skeletons', () => {
    renderWithProviders(<DailyExpenseTrendChart isLoading />);
    expect(screen.getByTestId('daily-expense-chart-loading')).toBeInTheDocument();
    expect(screen.getByText('Kunlik xarajatlar')).toBeInTheDocument();
  });

  it('renders empty state when there are no expenses', () => {
    renderWithProviders(
      <DailyExpenseTrendChart analytics={EMPTY_EXPENSE_ANALYTICS} isLoading={false} />,
    );
    expect(screen.getByText(/Bu davrda xarajatlar mavjud emas/i)).toBeInTheDocument();
    expect(screen.queryByTestId('daily-expense-trend-chart')).not.toBeInTheDocument();
  });

  it('renders the expense series and continuous date labels', () => {
    renderWithProviders(
      <DailyExpenseTrendChart analytics={POPULATED_EXPENSE_ANALYTICS} isLoading={false} />,
    );

    expect(screen.getByTestId('daily-expense-trend-chart')).toBeInTheDocument();
    expect(document.querySelector('[data-series="expenses"]')).toBeTruthy();
    expect(screen.getByText('1 Aug')).toBeInTheDocument();
    expect(screen.getByText(/2[\s\u00A0]100[\s\u00A0]000[\s\u00A0]*so'm/)).toBeInTheDocument();
  });

  it('shows isolated error with retry', () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <DailyExpenseTrendChart isLoading={false} isError onRetry={onRetry} />,
    );
    expect(screen.getByText(/Xarajatlar ma'lumotlarini yuklab bo'lmadi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Qayta urinish' })).toBeInTheDocument();
  });

  it('maps daily amounts without floating-point drift', () => {
    const sum = POPULATED_EXPENSE_ANALYTICS.dailyTrend.reduce(
      (total, point) => total + point.amount,
      0,
    );
    expect(sum).toBe(POPULATED_EXPENSE_ANALYTICS.total);
    expect(sum).toBe(2_100_000);
  });
});
