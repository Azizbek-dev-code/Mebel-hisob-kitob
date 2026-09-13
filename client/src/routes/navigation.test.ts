import { WorkerResponsibility } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { TEST_ADMIN, TEST_EMPLOYEE, TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';

import { NAV_ITEMS, navItemForPath, navItemsForUser } from './navigation';
import { ROUTES } from './paths';

describe('NAV_ITEMS', () => {
  it('covers every module the sidebar can show', () => {
    expect(NAV_ITEMS.map((item) => item.key)).toEqual([
      'dashboard',
      'billing',
      'sales',
      'my-sales',
      'my-reports',
      'assembly',
      'delivery',
      'my-finances',
      'products',
      'inventory',
      'purchases',
      'suppliers',
      'customers',
      'debts',
      'expenses',
      'workers',
      'reports',
      'audit',
      'profile',
      'settings',
    ]);
    expect(NAV_ITEMS.map((item) => item.key)).not.toContain('masters');
  });

  it('points every item at a path from the route registry', () => {
    const registered = Object.values<unknown>(ROUTES).filter(
      (value): value is string => typeof value === 'string',
    );

    for (const item of NAV_ITEMS) {
      expect(registered).toContain(item.to);
    }
  });
});

describe('navItemsForUser', () => {
  it('shows admin modules without my-sales/profile duplicates', () => {
    const keys = navItemsForUser(TEST_ADMIN).map((item) => item.key);
    expect(keys).toContain('workers');
    expect(keys).toContain('sales');
    expect(keys).not.toContain('my-sales');
    expect(keys).not.toContain('profile');
  });

  it('adapts employee nav to responsibilities', () => {
    const keys = navItemsForUser(TEST_EMPLOYEE).map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'dashboard',
        'sales',
        'my-sales',
        'my-reports',
        'assembly',
        'my-finances',
        'customers',
        'profile',
      ]),
    );
    expect(keys).not.toContain('delivery');
    expect(keys).not.toContain('workers');
    expect(keys).not.toContain('reports');
    expect(keys).not.toContain('expenses');
  });

  it('shows delivery nav for workers with DELIVERY responsibility', () => {
    const deliveryWorker = {
      ...TEST_EMPLOYEE,
      responsibilities: [WorkerResponsibility.DELIVERY],
    };
    const keys = navItemsForUser(deliveryWorker).map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining(['dashboard', 'delivery', 'sales', 'my-finances', 'profile']),
    );
    expect(keys).not.toContain('my-sales');
  });

  it('shows expenses for store admins', () => {
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).toContain('expenses');
  });

  it('shows inventory for store admins but not employees', () => {
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).toContain('inventory');
    expect(navItemsForUser(TEST_EMPLOYEE).map((item) => item.key)).not.toContain('inventory');
  });

  it('shows purchases and suppliers for store admins but not employees', () => {
    const adminKeys = navItemsForUser(TEST_ADMIN).map((item) => item.key);
    const employeeKeys = navItemsForUser(TEST_EMPLOYEE).map((item) => item.key);
    expect(adminKeys).toContain('purchases');
    expect(adminKeys).toContain('suppliers');
    expect(employeeKeys).not.toContain('purchases');
    expect(employeeKeys).not.toContain('suppliers');
  });

  it('shows debts for admins and sellers', () => {
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).toContain('debts');
    expect(navItemsForUser(TEST_EMPLOYEE).map((item) => item.key)).toContain('debts');
  });

  it('shows audit for store admins but not employees', () => {
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).toContain('audit');
    expect(navItemsForUser(TEST_EMPLOYEE).map((item) => item.key)).not.toContain('audit');
  });

  it('shows store requests only for platform admins', () => {
    expect(navItemsForUser(TEST_PLATFORM_ADMIN).map((item) => item.key)).toContain('store-requests');
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).not.toContain('store-requests');
    expect(navItemsForUser(TEST_EMPLOYEE).map((item) => item.key)).not.toContain('store-requests');
  });

  it('shows billing for store admins', () => {
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).toContain('billing');
  });

  it('hides START-only modules from a restricted trial snapshot', () => {
    const trialAdmin = {
      ...TEST_ADMIN,
      subscription: {
        status: 'TRIAL' as const,
        storedStatus: 'TRIAL' as const,
        planId: 'plan_trial',
        planName: 'Bepul sinov',
        trialEndsAt: '2026-09-15T00:00:00.000Z',
        currentPeriodEnd: '2026-09-15T00:00:00.000Z',
        trialWelcomeSeenAt: null,
        daysRemaining: 7,
        canWrite: true,
        hasPendingPaymentRequest: false,
        featureKeys: ['dashboard', 'sales', 'products', 'customers', 'expenses', 'reports'],
        featuresRestricted: true,
      },
    };
    const keys = navItemsForUser(trialAdmin).map((item) => item.key);
    expect(keys).toContain('sales');
    expect(keys).toContain('billing');
    expect(keys).not.toContain('inventory');
    expect(keys).not.toContain('workers');
    expect(keys).not.toContain('purchases');
  });

  it('gives PLATFORM_ADMIN the platform tree and hides store ERP modules', () => {
    const keys = navItemsForUser(TEST_PLATFORM_ADMIN).map((item) => item.key);
    expect(keys).toEqual([
      'platform-dashboard',
      'store-requests',
      'platform-shops',
      'subscription-requests',
      'platform-payments',
      'platform-plans',
      'platform-expenses',
      'platform-pnl',
      'platform-analytics',
      'platform-settings',
      'platform-account-deletions',
    ]);
    expect(keys).not.toContain('sales');
    expect(keys).not.toContain('workers');
    expect(keys).not.toContain('expenses');
    const shops = navItemsForUser(TEST_PLATFORM_ADMIN).find((item) => item.key === 'platform-shops');
    expect(shops?.children).toBeUndefined();
    expect(shops?.matchingPaths).toEqual([
      ROUTES.platformShopsActive,
      ROUTES.platformShopsPendingPayment,
      ROUTES.platformShopsBlocked,
      ROUTES.adminStores,
    ]);
    const labels = navItemsForUser(TEST_PLATFORM_ADMIN).map((item) => item.labelKey);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('canReviewStoreCreationRequests', () => {
  it('allows only PLATFORM_ADMIN', async () => {
    const { canReviewStoreCreationRequests } = await import('./navigation');
    expect(canReviewStoreCreationRequests(TEST_PLATFORM_ADMIN)).toBe(true);
    expect(canReviewStoreCreationRequests(TEST_ADMIN)).toBe(false);
    expect(canReviewStoreCreationRequests(TEST_EMPLOYEE)).toBe(false);
  });
});

describe('canManageInventory', () => {
  it('allows admins and blocks employees', async () => {
    const { canManageInventory } = await import('./navigation');
    expect(canManageInventory(TEST_ADMIN)).toBe(true);
    expect(canManageInventory(TEST_EMPLOYEE)).toBe(false);
  });
});

describe('canManagePurchasing', () => {
  it('mirrors inventory admin gate', async () => {
    const { canManagePurchasing, canManageInventory } = await import('./navigation');
    expect(canManagePurchasing(TEST_ADMIN)).toBe(canManageInventory(TEST_ADMIN));
    expect(canManagePurchasing(TEST_EMPLOYEE)).toBe(canManageInventory(TEST_EMPLOYEE));
  });
});

describe('canManageExpenses', () => {
  it('allows admins and blocks employees', async () => {
    const { canManageExpenses } = await import('./navigation');
    expect(canManageExpenses(TEST_ADMIN)).toBe(true);
    expect(canManageExpenses(TEST_EMPLOYEE)).toBe(false);
  });
});

describe('navItemForPath', () => {
  it('names the module a page belongs to', () => {
    expect(navItemForPath(ROUTES.sales)?.labelKey).toBe('nav.sales');
    expect(navItemForPath(ROUTES.dashboard)?.labelKey).toBe('nav.dashboard');
  });

  it('keeps naming the module on its nested pages', () => {
    expect(navItemForPath(ROUTES.saleNew)?.labelKey).toBe('nav.sales');
    expect(navItemForPath(ROUTES.customerDetail('cust_1'))?.labelKey).toBe('nav.customers');
    expect(navItemForPath(ROUTES.purchaseNew)?.labelKey).toBe('nav.purchases');
    expect(navItemForPath(ROUTES.supplierDetail('sup_1'))?.labelKey).toBe('nav.suppliers');
    expect(navItemForPath(ROUTES.masterDetail('master_1'))?.labelKey).toBe('nav.workers');
    expect(navItemForPath(ROUTES.workerDetail('worker_1'))?.labelKey).toBe('nav.workers');
  });

  it('does not match a path that merely starts with the same letters', () => {
    expect(navItemForPath('/salesforce')).toBeUndefined();
  });

  it('names platform store-request pages', () => {
    expect(navItemForPath(ROUTES.platformStoreRequests)?.labelKey).toBe('nav.storeRequests');
    expect(navItemForPath(ROUTES.platformStoreRequestDetail('req_1'))?.labelKey).toBe(
      'nav.storeRequests',
    );
  });

  it('keeps platform child pages under their parent module name', () => {
    expect(navItemForPath(ROUTES.platformShopsActive)?.labelKey).toBe('nav.shops');
    expect(navItemForPath(ROUTES.platformPaymentsOverdue)?.labelKey).toBe('nav.payments');
    expect(navItemForPath(ROUTES.platformAnalyticsProfit)?.labelKey).toBe('nav.analytics');
  });
});
