import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';

import { ExpenseCategoryChart } from './ExpenseCategoryChart';
import {
  EMPTY_EXPENSE_ANALYTICS,
  POPULATED_EXPENSE_ANALYTICS,
} from '../test/financial-fixtures';

describe('ExpenseCategoryChart', () => {
  it('renders loading skeletons', () => {
    renderWithProviders(<ExpenseCategoryChart isLoading />);
    expect(screen.getByTestId('expense-category-chart-loading')).toBeInTheDocument();
    expect(screen.getByText(/Xarajatlar kategoriyalar bo'yicha/i)).toBeInTheDocument();
  });

  it('renders empty state when there are no categories', () => {
    renderWithProviders(
      <ExpenseCategoryChart analytics={EMPTY_EXPENSE_ANALYTICS} isLoading={false} />,
    );
    expect(screen.getByText(/Xarajatlar kategoriyasi mavjud emas/i)).toBeInTheDocument();
    expect(screen.queryByTestId('expense-category-chart')).not.toBeInTheDocument();
  });

  it('renders category amounts and percentages', () => {
    renderWithProviders(
      <ExpenseCategoryChart analytics={POPULATED_EXPENSE_ANALYTICS} isLoading={false} />,
    );

    expect(screen.getByTestId('expense-category-chart')).toBeInTheDocument();
    expect(screen.getByText('Elektr')).toBeInTheDocument();
    expect(screen.getByText('Boshqa')).toBeInTheDocument();
    expect(screen.getByText(/1[\s\u00A0]600[\s\u00A0]000[\s\u00A0]*so'm/)).toBeInTheDocument();
    expect(screen.getByText(/500[\s\u00A0]000[\s\u00A0]*so'm/)).toBeInTheDocument();
    expect(screen.getByText('76.2%')).toBeInTheDocument();
    expect(screen.getByText('23.8%')).toBeInTheDocument();
  });

  it('shows isolated error with retry', () => {
    const onRetry = vi.fn();
    renderWithProviders(<ExpenseCategoryChart isLoading={false} isError onRetry={onRetry} />);
    expect(screen.getByText(/Xarajatlar ma'lumotlarini yuklab bo'lmadi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Qayta urinish' })).toBeInTheDocument();
  });

  it('reconciles category amounts to the period total', () => {
    const sum = POPULATED_EXPENSE_ANALYTICS.byCategory.reduce(
      (total, row) => total + row.amount,
      0,
    );
    expect(sum).toBe(POPULATED_EXPENSE_ANALYTICS.total);
    expect(sum).toBe(2_100_000);
  });
});
