import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { customersKeys } from '@/features/customers/hooks/use-customers';
import { financialSummaryQueryKeys } from '@/features/dashboard/hooks/use-financial-summary';
import { inventoryKeys } from '@/features/inventory/hooks/use-inventory';
import { productsKeys } from '@/features/products/hooks/use-products';

import { invalidateAfterSaleMutation, salesKeys } from './use-sales';

describe('invalidateAfterSaleMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('refreshes sales, customers, debts, dashboard and financial summary', async () => {
    await invalidateAfterSaleMutation(queryClient, { saleId: 'sale_1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: salesKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: salesKeys.detail('sale_1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: customersKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['debts'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: financialSummaryQueryKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reports'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['worker-compensation'],
    });
  });

  it('also invalidates inventory and products when stock changed', async () => {
    await invalidateAfterSaleMutation(queryClient, {
      saleId: 'sale_2',
      stockChanged: true,
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventoryKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productsKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['lookups', 'products'],
    });
  });

  it('skips stock surfaces when stock did not change', async () => {
    await invalidateAfterSaleMutation(queryClient, { saleId: 'sale_3' });

    const calls = vi.mocked(queryClient.invalidateQueries).mock.calls.map((call) => call[0]);
    expect(calls).not.toContainEqual({ queryKey: inventoryKeys.all });
    expect(calls).not.toContainEqual({ queryKey: productsKeys.all });
  });
});
