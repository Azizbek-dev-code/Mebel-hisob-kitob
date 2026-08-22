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

const { getStoreSubscription, requestStoreSubscription } = await import('./store-billing.service.js');

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
  features: {},
  planFeatures: [],
  limits: [],
  createdAt: now,
  updatedAt: now,
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
  plan: PLAN,
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

    const request = await requestStoreSubscription({ id: 'user_1', storeId: 'store_a' }, { planId: PLAN.id });
    expect(request.status).toBe(SubscriptionRequestStatus.PENDING);
    expect(request.requestedPriceSnapshot).toBe(200000);
    expect(request.planName).toBe('BUSINESS');
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
});
