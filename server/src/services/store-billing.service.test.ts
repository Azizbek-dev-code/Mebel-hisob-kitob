import { SubscriptionRequestStatus, SubscriptionStatus } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    subscriptionPlan: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    storeSubscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptionRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
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

const { getStoreSubscription, listMySubscriptionRequests, requestStoreSubscription } = await import('./store-billing.service.js');

const now = new Date('2026-08-22T12:00:00.000Z');
const PLAN = {
  id: 'plan_biz',
  name: 'BUSINESS',
  description: '',
  monthlyPrice: 200000n,
  currency: 'UZS',
  trialDays: 0,
  isActive: true,
  isDefaultTrial: false,
  rank: 3,
  audience: 'STORE',
  features: {},
  planFeatures: [],
  limits: [],
  createdAt: now,
  updatedAt: now,
};

const TRIAL_PLAN = {
  ...PLAN,
  id: 'plan_trial',
  name: 'Bepul sinov',
  monthlyPrice: 0n,
  isDefaultTrial: true,
  rank: 0,
};

const SUB = {
  id: 'sub_1',
  storeId: 'store_a',
  planId: 'plan_trial',
  status: SubscriptionStatus.TRIAL,
  isCurrent: true,
  startedAt: now,
  currentPeriodStart: now,
  currentPeriodEnd: new Date('2026-08-29T12:00:00.000Z'),
  nextPaymentDue: new Date('2026-08-29T12:00:00.000Z'),
  trialStartedAt: now,
  trialEndsAt: new Date('2026-08-29T12:00:00.000Z'),
  trialWelcomeSeenAt: null,
  pendingPlanId: null,
  cancelledAt: null,
  endedAt: null,
  plan: TRIAL_PLAN,
  pendingPlan: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.customer.count.mockResolvedValue(0);
  prismaMock.product.count.mockResolvedValue(0);
  prismaMock.supplier.count.mockResolvedValue(0);
  prismaMock.sale.count.mockResolvedValue(0);
});

describe('store-billing.service', () => {
  it('creates a subscription request with a price snapshot', async () => {
    prismaMock.subscriptionPlan.findUnique.mockResolvedValue(PLAN);
    prismaMock.storeSubscription.findFirst.mockResolvedValue(SUB);
    prismaMock.subscriptionRequest.findFirst.mockResolvedValue(null);
    prismaMock.subscriptionRequest.create.mockResolvedValue({
      id: 'req_1',
      storeId: 'store_a',
      planId: PLAN.id,
      fromPlanId: 'plan_trial',
      fromPlanName: 'Bepul sinov',
      requestedPriceSnapshot: 200000n,
      currency: 'UZS',
      status: SubscriptionRequestStatus.PENDING,
      requestedAt: now,
      note: null,
      store: {
        name: 'Fayz Mebel',
        phone: '+998901112233',
        users: [{ fullName: 'Ali', phone: '+998901112233' }],
        subscriptions: [{ status: SubscriptionStatus.TRIAL, currentPeriodEnd: SUB.currentPeriodEnd, trialEndsAt: SUB.trialEndsAt, plan: { name: 'Bepul sinov' } }],
      },
      plan: { id: PLAN.id, name: PLAN.name },
      reviewedBy: null,
    });
    prismaMock.storeSubscription.update.mockResolvedValue({});

    const request = await requestStoreSubscription(
      { id: 'user_1', storeId: 'store_a' },
      {
        planId: PLAN.id,
        paymentMethod: 'CARD',
        proofUrl: 'https://cdn.example/proof.jpg',
        proofKey: 'billing-proofs/store/store_a/proof.jpg',
      },
    );
    expect(request.status).toBe(SubscriptionRequestStatus.PENDING);
    expect(request.requestedPriceSnapshot).toBe(200000);
    expect(request.planName).toBe('BUSINESS');
    expect(request.currentPlanName).toBe('Bepul sinov');
    expect(prismaMock.subscriptionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromPlanId: 'plan_trial',
          fromPlanName: 'Bepul sinov',
          storeId: 'store_a',
          workspaceId: null,
          proofUrl: 'https://cdn.example/proof.jpg',
          paymentMethod: 'CARD',
        }),
      }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBSCRIPTION_REQUEST_CREATED' }),
    );
  });

  it('does not return another store’s current subscription', async () => {
    prismaMock.storeSubscription.findFirst.mockImplementation(
      ({ where }: { where: { storeId: string } }) =>
        Promise.resolve(where.storeId === 'store_a' ? SUB : null),
    );
    prismaMock.subscriptionPlan.findFirst.mockResolvedValue(null);

    const own = await getStoreSubscription('store_a');
    expect(own?.storeId).toBe('store_a');

    const other = await getStoreSubscription('store_b');
    expect(other).toBeNull();
    expect(prismaMock.storeSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: 'store_b' }) }),
    );
  });

  it('lists only the signed-in store’s subscription requests', async () => {
    prismaMock.subscriptionRequest.findMany.mockResolvedValue([]);
    await listMySubscriptionRequests({ storeId: 'store_a' });
    expect(prismaMock.subscriptionRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 'store_a' } }),
    );
  });

  it('rejects a lower plan while the current paid plan is still live', async () => {
    const startPlan = { ...PLAN, id: 'plan_start', name: 'START', rank: 1, monthlyPrice: 150000n };
    prismaMock.subscriptionPlan.findUnique.mockResolvedValue(startPlan);
    prismaMock.storeSubscription.findFirst.mockResolvedValue({
      ...SUB,
      status: SubscriptionStatus.ACTIVE,
      planId: PLAN.id,
      currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
      trialEndsAt: null,
      plan: PLAN,
    });

    await expect(
      requestStoreSubscription(
        { id: 'user_1', storeId: 'store_a' },
        {
          planId: startPlan.id,
          paymentMethod: 'CARD',
          proofUrl: 'https://cdn.example/proof.jpg',
          proofKey: 'billing-proofs/store/store_a/proof.jpg',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.subscriptionRequest.create).not.toHaveBeenCalled();
  });

  it('lets an expired BUSINESS account request START', async () => {
    const startPlan = { ...PLAN, id: 'plan_start', name: 'START', rank: 1, monthlyPrice: 150000n };
    prismaMock.subscriptionPlan.findUnique.mockResolvedValue(startPlan);
    prismaMock.storeSubscription.findFirst.mockResolvedValue({
      ...SUB,
      status: SubscriptionStatus.EXPIRED,
      planId: PLAN.id,
      currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
      trialEndsAt: null,
      plan: PLAN,
    });
    prismaMock.subscriptionRequest.findFirst.mockResolvedValue(null);
    prismaMock.subscriptionRequest.create.mockResolvedValue({
      id: 'req_2',
      storeId: 'store_a',
      workspaceId: null,
      planId: startPlan.id,
      fromPlanId: PLAN.id,
      fromPlanName: 'BUSINESS',
      requestedPriceSnapshot: 150000n,
      currency: 'UZS',
      status: SubscriptionRequestStatus.PENDING,
      requestedAt: now,
      note: null,
      paymentMethod: 'CARD',
      payerReference: null,
      proofUrl: 'https://cdn.example/proof.jpg',
      proofKey: 'billing-proofs/store/store_a/proof.jpg',
      store: {
        name: 'Fayz Mebel',
        phone: '+998901112233',
        users: [{ fullName: 'Ali', phone: '+998901112233' }],
        subscriptions: [],
      },
      workspace: null,
      plan: { id: startPlan.id, name: 'START' },
      reviewedBy: null,
    });
    prismaMock.storeSubscription.update.mockResolvedValue({});

    const request = await requestStoreSubscription(
      { id: 'user_1', storeId: 'store_a' },
      {
        planId: startPlan.id,
        paymentMethod: 'CARD',
        proofUrl: 'https://cdn.example/proof.jpg',
        proofKey: 'billing-proofs/store/store_a/proof.jpg',
      },
    );
    expect(request.planName).toBe('START');
    expect(request.storeId).toBe('store_a');
  });
});
