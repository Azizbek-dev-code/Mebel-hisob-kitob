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

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
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
      create: vi.fn(),
      update: vi.fn(),
    },
    platformInvoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
    store: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    storeCreationRequest: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn() },
    customer: { count: vi.fn() },
    product: { count: vi.fn() },
    supplier: { count: vi.fn() },
    sale: { count: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./audit.service.js', () => ({ recordAudit: recordAuditMock }));

const {
  assignPlan,
  approveSubscriptionRequest,
  createExpense,
  createPlan,
  getPnl,
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
  features: {},
  planFeatures: [],
  limits: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

beforeEach(() => {
  vi.clearAllMocks();
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
  });
  prismaMock.feature.upsert.mockResolvedValue({});
  prismaMock.feature.findMany.mockResolvedValue([]);
  prismaMock.planFeature.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.planFeature.createMany.mockResolvedValue({ count: 0 });
  prismaMock.planFeature.count.mockResolvedValue(0);
  prismaMock.planLimit.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.planLimit.createMany.mockResolvedValue({ count: 0 });
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
    prismaMock.platformInvoice.findMany.mockResolvedValue([
      {
        id: 'inv_1',
        dueDate: new Date('2026-09-22T12:00:00+05:00'),
        status: PlatformBillingStatus.PENDING,
        storeId: 'store_1',
        subscriptionId: 'sub_1',
        subscription: { status: SubscriptionStatus.ACTIVE },
        store: { id: 'store_1', accessStatus: StoreAccessStatus.ACTIVE },
      },
    ]);
    prismaMock.storeSubscription.findMany.mockResolvedValue([]);

    await syncBillingStatuses(new Date('2026-09-23T08:00:00+05:00'));
    expect(prismaMock.platformInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: PlatformBillingStatus.OVERDUE } }),
    );
  });

  it('expires a trial when trialEndsAt has passed', async () => {
    prismaMock.platformInvoice.findMany.mockResolvedValue([]);
    prismaMock.storeSubscription.findMany.mockResolvedValue([
      {
        id: 'sub_1',
        storeId: 'store_1',
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: new Date('2026-08-20T00:00:00+05:00'),
        currentPeriodEnd: new Date('2026-08-20T00:00:00+05:00'),
      },
    ]);

    await syncBillingStatuses(new Date('2026-08-22T12:00:00+05:00'));
    expect(prismaMock.storeSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: SubscriptionStatus.EXPIRED },
      }),
    );
    expect(prismaMock.store.update).not.toHaveBeenCalled();
  });

  it('keeps a manual block distinct from payment block', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', name: 'Fayz', accessStatus: 'ACTIVE' });
    prismaMock.platformInvoice.findMany.mockResolvedValue([]);
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

    const result = await approveSubscriptionRequest(PLATFORM, 'req_1', {
      startDate: '2026-08-22T00:00:00.000Z',
      endDate: '2026-09-21T00:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.CASH,
    });

    expect(result.request.status).toBe('APPROVED');
    expect(result.invoice.amount).toBe(200000);
    expect(result.invoice.planName).toBe('BUSINESS');
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

    const result = await approveSubscriptionRequest(PLATFORM, 'req_1', {
      startDate: '2026-08-22T00:00:00.000Z',
      endDate: '2026-09-21T00:00:00.000Z',
      paymentMethod: PlatformPaymentMethod.OTHER,
    });
    expect(result.invoice.amount).toBe(200000);
    expect(result.invoice.amount).not.toBe(250000);
  });
});
