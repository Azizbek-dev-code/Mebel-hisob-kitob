import {
  PlatformBillingStatus,
  PlatformExpenseCategory,
  PlatformPaymentMethod,
  StoreAccessStatus,
  SubscriptionStatus,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock, recordAuditMock, grantFirstPaymentCommission, countPendingReferralWithdrawals, countReferralSignups } =
  vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    feature: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    planFeature: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    planLimit: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    subscriptionPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    storeSubscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    subscriptionRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    platformInvoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    platformExpense: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    platformSettings: { upsert: vi.fn(), update: vi.fn() },
    store: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    storeCreationRequest: { count: vi.fn(), findMany: vi.fn() },
    workspace: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
    user: { count: vi.fn() },
    customer: { count: vi.fn() },
    product: { count: vi.fn() },
    supplier: { count: vi.fn() },
    sale: { count: vi.fn() },
    personalSubscription: { update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  grantFirstPaymentCommission: vi.fn(),
  countPendingReferralWithdrawals: vi.fn(),
  countReferralSignups: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../modules/referrals/referral.service.js', () => ({
  grantFirstPaymentCommission,
  countPendingReferralWithdrawals,
  countReferralSignups,
}));

const {
  assignPlan,
  approveSubscriptionRequest,
  createExpense,
  createPlan,
  getPnl,
  getDashboard,
  listPlans,
  provisionStoreSubscription,
  recordPayment,
  setManualBlock,
  syncBillingStatuses,
} = await import('./platform-billing.service.js');

const PLATFORM = { id: 'user_platform', role: UserRole.PLATFORM_ADMIN, storeId: 'store_1' };
const PLAN = {
  id: 'plan_start',
  name: 'START',
  description: 'Asosiy',
  monthlyPrice: 150000n,
  currency: 'UZS',
  trialDays: 0,
  isActive: true,
  isDefaultTrial: false,
  rank: 1,
  audience: 'STORE',
  features: {},
  planFeatures: [],
  limits: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
  grantFirstPaymentCommission.mockResolvedValue(undefined);
  countPendingReferralWithdrawals.mockResolvedValue(0);
  countReferralSignups.mockResolvedValue(0);
  prismaMock.platformInvoice.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.storeSubscription.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
    fn(prismaMock),
  );
  prismaMock.platformSettings.upsert.mockResolvedValue({
    id: 'platform',
    gracePeriodDays: 3,
    platformName: 'Furniture ERP',
    defaultCurrency: 'UZS',
    billingCycle: 'MONTHLY',
    paymentRemindersEnabled: false,
    reminderDaysBeforeDue: 3,
    paymentCardNumber: '',
    paymentAccountNumber: '',
    paymentInstructions: '',
  });
  prismaMock.feature.upsert.mockResolvedValue({});
  prismaMock.feature.findMany.mockResolvedValue([]);
  prismaMock.planFeature.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.planFeature.createMany.mockResolvedValue({ count: 0 });
  prismaMock.planFeature.count.mockResolvedValue(0);
  prismaMock.planLimit.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.planLimit.createMany.mockResolvedValue({ count: 0 });
  prismaMock.subscriptionRequest.findUniqueOrThrow.mockImplementation((args) =>
    prismaMock.subscriptionRequest.findUnique(args),
  );
  recordAuditMock.mockResolvedValue(undefined);
});

describe('plans', () => {
  it('forbids store ADMIN from listing plans', async () => {
    await expect(listPlans(UserRole.ADMIN)).rejects.toBeInstanceOf(ApiError);
  });

  it('creates a plan', async () => {
    prismaMock.subscriptionPlan.create.mockResolvedValue(PLAN);
    prismaMock.subscriptionPlan.findUnique.mockResolvedValue(PLAN);
    const plan = await createPlan(PLATFORM, { name: 'START', monthlyPrice: 150000 });
    expect(plan.name).toBe('START');
    expect(plan.monthlyPrice).toBe(150000);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBSCRIPTION_PLAN_CREATED' }),
    );
  });
});

describe('subscriptions and billing', () => {
  it('provisions a 7-day trial without creating an invoice', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue(null);
    prismaMock.subscriptionPlan.findFirst.mockResolvedValue(PLAN);
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub_1' });

    await provisionStoreSubscription('store_1', new Date('2026-08-22T00:00:00+05:00'));

    expect(prismaMock.storeSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: 'store_1',
          status: SubscriptionStatus.TRIAL,
        }),
      }),
    );
    expect(prismaMock.platformInvoice.create).not.toHaveBeenCalled();
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBSCRIPTION_TRIAL_STARTED' }),
    );
  });

  it('does not duplicate a subscription for an existing store', async () => {
    prismaMock.storeSubscription.findFirst.mockResolvedValue({ id: 'sub_1' });
    await provisionStoreSubscription('store_1');
    expect(prismaMock.storeSubscription.create).not.toHaveBeenCalled();
  });

  it('assigns a plan for the next period without rewriting invoices', async () => {
    prismaMock.subscriptionPlan.findUnique.mockResolvedValue({ ...PLAN, id: 'plan_pro', name: 'PRO' });
    prismaMock.storeSubscription.findFirst
      .mockResolvedValueOnce({ id: 'sub_1' })
      .mockResolvedValueOnce({ id: 'sub_1', storeId: 'store_1' });
    prismaMock.storeSubscription.update.mockResolvedValue({
      id: 'sub_1',
      storeId: 'store_1',
      planId: 'plan_start',
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      nextPaymentDue: new Date(),
      trialStartedAt: null,
      trialEndsAt: null,
      trialWelcomeSeenAt: null,
      pendingPlanId: 'plan_pro',
      cancelledAt: null,
      plan: PLAN,
      pendingPlan: { name: 'PRO' },
    });

    const sub = await assignPlan(PLATFORM, 'store_1', { planId: 'plan_pro' });
    expect(sub.pendingPlanName).toBe('PRO');
    expect(prismaMock.platformInvoice.update).not.toHaveBeenCalled();
  });
});

describe('payments and blocking', () => {
  const invoice = {
    id: 'inv_1',
    storeId: 'store_1',
    subscriptionId: 'sub_1',
    planId: 'plan_pro',
    status: PlatformBillingStatus.PENDING,
    amount: 200000n,
    currency: 'UZS',
    planName: 'PRO',
    billingPeriodStart: new Date('2026-09-01'),
    billingPeriodEnd: new Date('2026-10-01'),
    dueDate: new Date('2026-09-22'),
    paidAt: null,
    paymentMethod: null,
    reference: null,
    note: null,
    durationMonths: 1,
    rejectionReason: null,
    createdAt: new Date(),
    store: { name: 'Fayz Mebel', accessStatus: StoreAccessStatus.PAYMENT_BLOCKED },
    subscription: { status: SubscriptionStatus.BLOCKED },
  };

  it('records payment PENDING → PAID and unblocks payment-blocked stores', async () => {
    prismaMock.platformInvoice.findUnique.mockResolvedValue(invoice);
    prismaMock.platformInvoice.update.mockResolvedValue({
      ...invoice,
      status: PlatformBillingStatus.PAID,
      paidAt: new Date('2026-08-22'),
      paymentMethod: PlatformPaymentMethod.CASH,
      store: { id: 'store_1', name: 'Fayz Mebel', phone: null, users: [] },
      recordedBy: { fullName: 'Platform Administrator' },
      plan: PLAN,
    });
    prismaMock.platformInvoice.count.mockResolvedValue(0);
    prismaMock.storeSubscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      storeId: 'store_1',
      status: SubscriptionStatus.TRIAL,
    });
    prismaMock.storeSubscription.update.mockResolvedValue({});
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub_2' });

    const paid = await recordPayment(PLATFORM, 'inv_1', {
      paidAt: '2026-08-22T12:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.CASH,
    });
    expect(paid.status).toBe(PlatformBillingStatus.PAID);
    expect(grantFirstPaymentCommission).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store_1',
        sourceType: 'PLATFORM_INVOICE',
        sourceId: 'inv_1',
        sourceAmountSom: 200000n,
        paid: true,
      }),
      expect.anything(),
    );
    expect(prismaMock.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { accessStatus: StoreAccessStatus.ACTIVE, isActive: true },
      }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBSCRIPTION_PAYMENT_RECORDED' }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'STORE_UNBLOCKED' }),
    );
  });

  it('rejects a duplicate payment on an already paid invoice', async () => {
    prismaMock.platformInvoice.findUnique.mockResolvedValue({
      ...invoice,
      status: PlatformBillingStatus.PAID,
    });
    await expect(
      recordPayment(PLATFORM, 'inv_1', {
        paidAt: '2026-08-22T12:00:00.000Z',
        paymentMethod: PlatformPaymentMethod.CASH,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not auto-unblock a manually blocked store after payment', async () => {
    prismaMock.platformInvoice.findUnique.mockResolvedValue({
      ...invoice,
      store: { name: 'Fayz Mebel', accessStatus: StoreAccessStatus.MANUALLY_BLOCKED },
    });
    prismaMock.platformInvoice.update.mockResolvedValue({
      ...invoice,
      status: PlatformBillingStatus.PAID,
      store: { id: 'store_1', name: 'Fayz Mebel', phone: null, users: [] },
      recordedBy: { fullName: 'Platform' },
      plan: PLAN,
    });
    prismaMock.platformInvoice.count.mockResolvedValue(0);
    prismaMock.storeSubscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      storeId: 'store_1',
      status: SubscriptionStatus.TRIAL,
    });
    prismaMock.storeSubscription.update.mockResolvedValue({});
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub_2' });

    await recordPayment(PLATFORM, 'inv_1', {
      paidAt: '2026-08-22T12:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.CASH,
    });
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('marks PENDING invoices OVERDUE after the due date', async () => {
    prismaMock.platformInvoice.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.storeSubscription.findMany.mockResolvedValue([]);

    await syncBillingStatuses(new Date('2026-09-23T08:00:00+05:00'));
    expect(prismaMock.platformInvoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PlatformBillingStatus.PENDING,
          dueDate: { lt: expect.any(Date) },
        }),
        data: { status: PlatformBillingStatus.OVERDUE },
      }),
    );
  });

  it('expires a trial when trialEndsAt has passed', async () => {
    prismaMock.platformInvoice.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.storeSubscription.findMany.mockResolvedValue([
      {
        id: 'sub_1',
        storeId: 'store_1',
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date('2026-08-20T00:00:00+05:00'),
        currentPeriodEnd: new Date('2026-08-20T00:00:00+05:00'),
      },
    ]);
    prismaMock.storeSubscription.updateMany.mockResolvedValue({ count: 1 });

    await syncBillingStatuses(new Date('2026-08-22T12:00:00+05:00'));
    expect(prismaMock.storeSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['sub_1'] } },
        data: { status: SubscriptionStatus.EXPIRED },
      }),
    );
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('keeps a manual block distinct from payment block', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', name: 'Fayz', accessStatus: 'ACTIVE' });
    prismaMock.platformInvoice.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.storeSubscription.findMany.mockResolvedValue([]);
    prismaMock.store.findMany.mockResolvedValue([
      {
        id: 'store_1',
        name: 'Fayz',
        phone: null,
        address: null,
        isActive: false,
        accessStatus: StoreAccessStatus.MANUALLY_BLOCKED,
        createdAt: new Date(),
        subscriptions: [],
        subscriptionRequests: [],
        platformInvoices: [],
        users: [],
      },
    ]);
    await setManualBlock(PLATFORM, 'store_1', true);
    expect(prismaMock.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { accessStatus: StoreAccessStatus.MANUALLY_BLOCKED, isActive: false },
      }),
    );
  });
});

describe('expenses and P&L', () => {
  it('creates a platform expense', async () => {
    prismaMock.platformExpense.create.mockResolvedValue({
      id: 'exp_1',
      category: PlatformExpenseCategory.HOSTING,
      amount: 400000n,
      currency: 'UZS',
      date: new Date('2026-08-01'),
      description: 'Server',
      vendor: null,
      reference: null,
      status: 'ACTIVE',
      createdBy: { fullName: 'Platform' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const expense = await createExpense(PLATFORM, {
      category: PlatformExpenseCategory.HOSTING,
      amount: 400000,
      date: '2026-08-01',
    });
    expect(expense.amount).toBe(400000);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PLATFORM_EXPENSE_CREATED' }),
    );
  });

  it('counts only PAID invoices as revenue', async () => {
    prismaMock.platformInvoice.findMany.mockResolvedValue([
      { amount: 200000n, paidAt: new Date('2026-08-10'), dueDate: new Date('2026-08-22') },
    ]);
    prismaMock.platformExpense.findMany.mockResolvedValue([{ amount: 50000n, date: new Date('2026-08-05') }]);
    const pnl = await getPnl(
      UserRole.PLATFORM_ADMIN,
      new Date('2026-08-01'),
      new Date('2026-08-31'),
      'Shu oy',
    );
    expect(pnl.revenue).toBe(200000);
    expect(pnl.expenses).toBe(50000);
    expect(pnl.netProfit).toBe(150000);
  });

  it('aggregates the dashboard without a second P&L/analytics pass', async () => {
    prismaMock.platformInvoice.findMany.mockResolvedValue([
      { amount: 200000n, paidAt: new Date('2026-08-10'), dueDate: new Date('2026-08-22') },
    ]);
    prismaMock.storeSubscription.findMany.mockResolvedValue([]);
    prismaMock.platformExpense.findMany.mockResolvedValue([
      { amount: 50000n, date: new Date('2026-08-05') },
    ]);
    prismaMock.store.findMany.mockResolvedValue([
      {
        accessStatus: StoreAccessStatus.ACTIVE,
        subscriptions: [
          {
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: null,
            currentPeriodEnd: new Date('2099-01-01'),
            plan: { name: 'PRO' },
          },
        ],
      },
    ]);
    prismaMock.storeCreationRequest.count.mockResolvedValue(2);
    prismaMock.subscriptionRequest.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prismaMock.platformInvoice.aggregate.mockResolvedValue({
      _sum: { amount: 0n },
      _count: { _all: 0 },
    });
    prismaMock.personalSubscription.findMany.mockResolvedValue([
      {
        planKey: 'PERSONAL_TRIAL',
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date('2099-01-01'),
        currentPeriodEnd: new Date('2099-01-01'),
      },
    ]);
    prismaMock.workspace.findMany.mockResolvedValue([
      { type: 'PERSONAL', createdAt: new Date('2026-08-10') },
      { type: 'BUSINESS', createdAt: new Date('2026-08-12') },
    ]);
    prismaMock.workspace.groupBy.mockResolvedValue([
      { type: 'PERSONAL', _count: { _all: 1 } },
      { type: 'BUSINESS', _count: { _all: 1 } },
    ]);

    const dashboard = await getDashboard(
      UserRole.PLATFORM_ADMIN,
      new Date('2026-08-01'),
      new Date('2026-08-31'),
      'Shu oy',
    );

    expect(dashboard.monthRevenue).toBe(200000);
    expect(dashboard.monthExpenses).toBe(50000);
    expect(dashboard.monthNetProfit).toBe(150000);
    expect(dashboard.personalWorkspaces).toBe(1);
    expect(dashboard.totalStores).toBe(1);
    expect(dashboard.personalTrial).toBe(1);
    expect(dashboard.pendingPersonalSubscriptionRequests).toBe(1);
    expect(dashboard.pendingBusinessSubscriptionRequests).toBe(2);
    expect(dashboard.otherRevenue).toBe(0);
    expect(dashboard.pendingWithdrawals).toBe(0);
    expect(dashboard.referralSignups).toBe(0);
    expect(dashboard.accountGrowth).toEqual([
      { month: '2026-08', personal: 1, business: 1 },
    ]);
    expect(prismaMock.storeCreationRequest.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.count).not.toHaveBeenCalled();
  });
});

describe('subscription requests', () => {
  it('approves a request, records payment, and archives the previous subscription', async () => {
    const requestRow = {
      id: 'req_1',
      storeId: 'store_1',
      planId: 'plan_start',
      status: 'PENDING',
      requestedPriceSnapshot: 200000n,
      currency: 'UZS',
      note: null,
      plan: { ...PLAN, name: 'BUSINESS', monthlyPrice: 200000n },
      store: { id: 'store_1', name: 'Fayz Mebel', accessStatus: StoreAccessStatus.ACTIVE },
    };
    prismaMock.subscriptionRequest.findUnique.mockResolvedValue(requestRow);
    prismaMock.storeSubscription.findFirst.mockResolvedValue({
      id: 'sub_old',
      storeId: 'store_1',
      status: SubscriptionStatus.TRIAL,
    });
    prismaMock.storeSubscription.update.mockResolvedValue({ id: 'sub_old', isCurrent: false });
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub_new' });
    prismaMock.platformInvoice.create.mockResolvedValue({
      id: 'inv_paid',
      storeId: 'store_1',
      subscriptionId: 'sub_new',
      planId: 'plan_start',
      planName: 'BUSINESS',
      amount: 200000n,
      currency: 'UZS',
      billingPeriodStart: new Date('2026-08-22'),
      billingPeriodEnd: new Date('2026-09-21'),
      dueDate: new Date('2026-08-22'),
      status: PlatformBillingStatus.PAID,
      paidAt: new Date('2026-08-22'),
      paymentMethod: PlatformPaymentMethod.CASH,
      reference: null,
      note: null,
      durationMonths: 1,
      rejectionReason: null,
      createdAt: new Date(),
      store: { id: 'store_1', name: 'Fayz Mebel', phone: null, users: [] },
      recordedBy: { fullName: 'Platform Administrator' },
    });
    prismaMock.subscriptionRequest.update.mockResolvedValue({
      id: 'req_1',
      storeId: 'store_1',
      planId: 'plan_start',
      status: 'APPROVED',
      requestedPriceSnapshot: 200000n,
      currency: 'UZS',
      requestedAt: new Date('2026-08-22'),
      reviewedAt: new Date('2026-08-22'),
      rejectionReason: null,
      note: null,
      createdInvoiceId: 'inv_paid',
      createdSubscriptionId: 'sub_new',
      store: {
        id: 'store_1',
        name: 'Fayz Mebel',
        phone: null,
        users: [],
        subscriptions: [],
      },
      plan: { id: 'plan_start', name: 'BUSINESS' },
      reviewedBy: { fullName: 'Platform Administrator' },
    });
    prismaMock.store.update.mockResolvedValue({});
    prismaMock.subscriptionRequest.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveSubscriptionRequest(PLATFORM, 'req_1', {
      startDate: '2026-08-22T00:00:00.000Z',
      endDate: '2026-09-21T00:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.CASH,
    });

    expect(result.request.status).toBe('APPROVED');
    expect(result.invoice?.amount).toBe(200000);
    expect(result.invoice?.planName).toBe('BUSINESS');
    expect(prismaMock.storeSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_old' },
        data: expect.objectContaining({ isCurrent: false }),
      }),
    );
    expect(prismaMock.storeSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planId: 'plan_start',
          isCurrent: true,
          status: SubscriptionStatus.ACTIVE,
        }),
      }),
    );
    expect(prismaMock.platformInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 200000n }),
      }),
    );
  });

  it('keeps the requested price snapshot when the live plan price later changes', async () => {
    prismaMock.subscriptionRequest.findUnique.mockResolvedValue({
      id: 'req_1',
      storeId: 'store_1',
      planId: 'plan_start',
      status: 'PENDING',
      requestedPriceSnapshot: 200000n,
      currency: 'UZS',
      note: null,
      plan: { ...PLAN, name: 'BUSINESS', monthlyPrice: 250000n },
      store: { id: 'store_1', name: 'Fayz Mebel', accessStatus: StoreAccessStatus.ACTIVE },
    });
    prismaMock.storeSubscription.findFirst.mockResolvedValue(null);
    prismaMock.storeSubscription.create.mockResolvedValue({ id: 'sub_new' });
    prismaMock.platformInvoice.create.mockResolvedValue({
      id: 'inv_paid',
      storeId: 'store_1',
      subscriptionId: 'sub_new',
      planId: 'plan_start',
      planName: 'BUSINESS',
      amount: 200000n,
      currency: 'UZS',
      billingPeriodStart: new Date('2026-08-22'),
      billingPeriodEnd: new Date('2026-09-21'),
      dueDate: new Date('2026-08-22'),
      status: PlatformBillingStatus.PAID,
      paidAt: new Date('2026-08-22'),
      paymentMethod: PlatformPaymentMethod.CASH,
      reference: null,
      note: null,
      durationMonths: 1,
      rejectionReason: null,
      createdAt: new Date(),
      store: { id: 'store_1', name: 'Fayz Mebel', phone: null, users: [] },
      recordedBy: { fullName: 'Platform' },
    });
    prismaMock.subscriptionRequest.update.mockResolvedValue({
      id: 'req_1',
      storeId: 'store_1',
      planId: 'plan_start',
      status: 'APPROVED',
      requestedPriceSnapshot: 200000n,
      currency: 'UZS',
      requestedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: null,
      note: null,
      createdInvoiceId: 'inv_paid',
      createdSubscriptionId: 'sub_new',
      store: { id: 'store_1', name: 'Fayz Mebel', phone: null, users: [], subscriptions: [] },
      plan: { id: 'plan_start', name: 'BUSINESS' },
      reviewedBy: { fullName: 'Platform' },
    });
    prismaMock.store.update.mockResolvedValue({});
    prismaMock.subscriptionRequest.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveSubscriptionRequest(PLATFORM, 'req_1', {
      startDate: '2026-08-22T00:00:00.000Z',
      endDate: '2026-09-21T00:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.OTHER,
    });
    expect(result.invoice?.amount).toBe(200000);
    expect(result.invoice?.amount).not.toBe(250000);
  });

  it('rejects a second Accept and does not mint another payment', async () => {
    prismaMock.subscriptionRequest.findUnique.mockResolvedValue({
      id: 'req_1',
      status: 'APPROVED',
    });
    await expect(
      approveSubscriptionRequest(PLATFORM, 'req_1', {
        startDate: '2026-08-22T00:00:00.000Z',
        endDate: '2026-09-21T00:00:00.000Z',
        paymentMethod: PlatformPaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(prismaMock.platformInvoice.create).not.toHaveBeenCalled();
    expect(prismaMock.storeSubscription.create).not.toHaveBeenCalled();
  });

  it('turns away a concurrent Accept that lost the PENDING claim', async () => {
    prismaMock.subscriptionRequest.findUnique.mockResolvedValue({
      id: 'req_1',
      status: 'PENDING',
    });
    prismaMock.subscriptionRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      approveSubscriptionRequest(PLATFORM, 'req_1', {
        startDate: '2026-08-22T00:00:00.000Z',
        endDate: '2026-09-21T00:00:00.000Z',
        paymentMethod: PlatformPaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(prismaMock.platformInvoice.create).not.toHaveBeenCalled();
  });

  it('activates a personal workspace subscription without a store invoice', async () => {
    prismaMock.subscriptionRequest.findUnique.mockResolvedValue({
      id: 'req_p',
      status: 'PENDING',
    });
    prismaMock.subscriptionRequest.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.subscriptionRequest.findUniqueOrThrow.mockResolvedValue({
      id: 'req_p',
      storeId: null,
      workspaceId: 'ws_1',
      planId: 'plan_personal_paid',
      requestedPriceSnapshot: 49000n,
      currency: 'UZS',
      note: null,
      plan: { id: 'plan_personal_paid', name: 'PERSONAL_PAID' },
      store: null,
    });
    prismaMock.personalSubscription.update.mockResolvedValue({ id: 'psub_1', workspaceId: 'ws_1' });
    prismaMock.subscriptionRequest.update.mockResolvedValue({
      id: 'req_p',
      storeId: null,
      workspaceId: 'ws_1',
      planId: 'plan_personal_paid',
      requestedPriceSnapshot: 49000n,
      currency: 'UZS',
      status: 'APPROVED',
      requestedAt: new Date('2026-09-14'),
      reviewedAt: new Date('2026-09-14'),
      rejectionReason: null,
      note: null,
      paymentMethod: 'CARD',
      payerReference: null,
      proofUrl: 'https://cdn.example/p.jpg',
      createdInvoiceId: null,
      createdSubscriptionId: 'psub_1',
      store: null,
      workspace: {
        id: 'ws_1',
        name: 'Aziz',
        type: 'PERSONAL',
        personalSubscription: null,
        memberships: [],
      },
      plan: { id: 'plan_personal_paid', name: 'PERSONAL_PAID' },
      reviewedBy: { fullName: 'Platform Administrator' },
    });

    const result = await approveSubscriptionRequest(PLATFORM, 'req_p', {
      paymentMethod: PlatformPaymentMethod.CARD,
    });
    expect(result.request.workspaceId).toBe('ws_1');
    expect(result.invoice).toBeNull();
    expect(prismaMock.platformInvoice.create).not.toHaveBeenCalled();
    expect(prismaMock.personalSubscription.update).toHaveBeenCalled();
    expect(grantFirstPaymentCommission).toHaveBeenCalledWith(
      expect.objectContaining({
        referredWorkspaceId: 'ws_1',
        sourceType: 'SUBSCRIPTION_REQUEST',
        sourceId: 'req_p',
        sourceAmountSom: 49000n,
        paid: true,
      }),
      expect.anything(),
    );
  });
});
