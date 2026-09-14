import { BusinessType, WorkerResponsibility, WorkspaceType } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { TEST_ADMIN, TEST_EMPLOYEE, TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';

import { NAV_ITEMS, PERSONAL_NAV_ITEMS, businessNavItems, navItemForPath, navItemsForAccountType, navItemsForUser } from './navigation';
import { ROUTES } from './paths';

describe('NAV_ITEMS', () => {
  it('covers every module the sidebar can show', () => {
    expect(NAV_ITEMS.map((item) => item.key)).toEqual([
      'dashboard',
      'billing',
      'referral',
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

describe('PERSONAL_NAV_ITEMS', () => {
  it('keeps five primary destinations on registered paths', () => {
    expect(PERSONAL_NAV_ITEMS.map((item) => item.key)).toEqual([
      'personal-home',
      'personal-history',
      'personal-budgets',
      'personal-goals',
      'personal-settings',
    ]);

    const registered = Object.values<unknown>(ROUTES).filter(
      (value): value is string => typeof value === 'string',
    );
    for (const item of PERSONAL_NAV_ITEMS) {
      expect(registered).toContain(item.to);
    }
  });
});

describe('navItemsForAccountType', () => {
  it('keeps personal destinations separate from ERP and shares ERP across verticals', () => {
    expect(navItemsForAccountType(WorkspaceType.PERSONAL)).toBe(PERSONAL_NAV_ITEMS);
    expect(navItemsForAccountType(WorkspaceType.BUSINESS)).toBe(NAV_ITEMS);
    expect(businessNavItems(BusinessType.CARPET)).toEqual(NAV_ITEMS);
    expect(businessNavItems(BusinessType.ELECTRONICS)).toEqual(NAV_ITEMS);
  });
});

describe('navItemsForUser', () => {
  it('shows admin modules without my-sales/profile duplicates', () => {
    const keys = navItemsForUser(TEST_ADMIN).map((item) => item.key);
    expect(keys).toContain('workers');
    expect(keys).toContain('sales');
    expect(keys).toContain('referral');
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
    expect(keys).not.toContain('referral');
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

  it('shows pending accounts only for platform admins', () => {
    expect(navItemsForUser(TEST_PLATFORM_ADMIN).map((item) => item.key)).toContain(
      'platform-accounts',
    );
    expect(navItemsForUser(TEST_ADMIN).map((item) => item.key)).not.toContain('platform-accounts');
    expect(navItemsForUser(TEST_EMPLOYEE).map((item) => item.key)).not.toContain('platform-accounts');
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
      'platform-accounts',
      'platform-subscriptions',
      'platform-onboarding',
      'platform-finance',
      'platform-referral',
      'platform-settings',
    ]);
    expect(keys).not.toContain('sales');
    expect(keys).not.toContain('workers');
    expect(keys).not.toContain('expenses');
    expect(keys).not.toContain('store-requests');
    expect(keys).not.toContain('platform-personal');
    expect(keys).not.toContain('platform-account-deletions');
    const accounts = navItemsForUser(TEST_PLATFORM_ADMIN).find(
      (item) => item.key === 'platform-accounts',
    );
    expect(accounts?.children).toBeUndefined();
    expect(accounts?.matchingPaths).toEqual([
      ROUTES.platformAccountsPersonal,
      ROUTES.platformAccountsBusiness,
      ROUTES.platformStoreRequests,
      ROUTES.platformShops,
      ROUTES.platformShopsActive,
      ROUTES.platformShopsPendingPayment,
      ROUTES.platformShopsBlocked,
      ROUTES.adminStores,
      ROUTES.platformPersonal,
    ]);
    const labels = navItemsForUser(TEST_PLATFORM_ADMIN).map((item) => item.labelKey);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('shows only personal dashboard and billing for a personal session', () => {
    const personal = {
      kind: 'PERSONAL' as const,
      id: 'idn_1',
      email: 'aziz@example.com',
      username: null,
      fullName: 'Aziz Karimov',
      phone: null,
      role: 'PERSONAL' as const,
      responsibilities: [] as [],
      storeId: null,
      storeName: 'Azizning shaxsiy moliyasi',
      workspaceId: 'ws_1',
      identityId: 'idn_1',
      membershipRole: 'OWNER' as const,
      subscription: {
        status: 'TRIAL' as const,
        storedStatus: 'TRIAL' as const,
        planId: 'PERSONAL_TRIAL',
        planName: 'Sinov',
        trialEndsAt: '2026-09-20T00:00:00.000Z',
        currentPeriodEnd: '2026-09-20T00:00:00.000Z',
        trialWelcomeSeenAt: null,
        daysRemaining: 7,
        canWrite: true,
        hasPendingPaymentRequest: false,
        featureKeys: [],
        featuresRestricted: false,
      },
    };
    expect(navItemsForUser(personal).map((item) => item.key)).toEqual([
      'personal-home',
      'personal-history',
      'personal-budgets',
      'personal-goals',
      'personal-settings',
    ]);
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

  it('names platform store-request pages under accounts', () => {
    expect(navItemForPath(ROUTES.platformStoreRequests)?.labelKey).toBe('nav.accounts');
    expect(navItemForPath(ROUTES.platformStoreRequestDetail('req_1'))?.labelKey).toBe(
      'nav.accounts',
    );
  });

  it('keeps platform child pages under their parent hub name', () => {
    expect(navItemForPath(ROUTES.platformShopsActive)?.labelKey).toBe('nav.accounts');
    expect(navItemForPath(ROUTES.platformPaymentsOverdue)?.labelKey).toBe('nav.subscriptions');
    expect(navItemForPath(ROUTES.platformAnalyticsProfit)?.labelKey).toBe('nav.finance');
    expect(navItemForPath(ROUTES.platformOnboarding)?.labelKey).toBe('nav.onboarding');
    expect(navItemForPath(ROUTES.platformAccountDeletions)?.labelKey).toBe('nav.settings');
    expect(navItemForPath(ROUTES.platformReferral)?.labelKey).toBe('nav.referral');
  });

  it('names personal finance pages', () => {
    expect(navItemForPath(ROUTES.personalDashboard)?.key).toBe('personal-home');
    expect(navItemForPath(ROUTES.personalHistory)?.key).toBe('personal-history');
    expect(navItemForPath(ROUTES.personalIncome)?.key).toBe('personal-history');
    expect(navItemForPath(ROUTES.personalExpenses)?.key).toBe('personal-history');
    expect(navItemForPath(ROUTES.personalBudgets)?.key).toBe('personal-budgets');
    expect(navItemForPath(ROUTES.personalGoals)?.key).toBe('personal-goals');
    expect(navItemForPath(ROUTES.personalSettings)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalAccounts)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalCategories)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalAnalytics)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalBilling)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalReferral)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalRecurring)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalDebts)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.personalNotifications)?.key).toBe('personal-settings');
    expect(navItemForPath(ROUTES.platformPersonal)?.key).toBe('platform-accounts');
  });
});
