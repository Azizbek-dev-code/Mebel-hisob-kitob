import {
  PERSONAL_PLAN_KEY,
  SubscriptionRequestStatus,
  SubscriptionStatus,
  WorkspaceMembershipRole,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    personalSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlan: { findFirst: vi.fn(), findMany: vi.fn() },
    subscriptionRequest: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    workspaceMembership: { findUnique: vi.fn() },
    identity: { findFirst: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));

const {
  ensurePersonalTrial,
  getPersonalBilling,
  loadPersonalAuthUser,
  markPersonalTrialWelcomeSeen,
  requestPersonalSubscription,
  selectPersonalPlan,
  toPersonalSubscriptionSnapshot,
  trialSubscriptionCreateData,
} = await import('./personal-subscription.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.subscriptionRequest.findFirst.mockResolvedValue(null);
  prismaMock.subscriptionPlan.findMany.mockResolvedValue([]);
});

describe('toPersonalSubscriptionSnapshot', () => {
  it('locks writes when the trial date has passed', () => {
    const snap = toPersonalSubscriptionSnapshot({
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
      trialWelcomeSeenAt: null,
    });
    expect(snap.status).toBe(SubscriptionStatus.EXPIRED);
    expect(snap.canWrite).toBe(false);
    expect(snap.storedStatus).toBe(SubscriptionStatus.TRIAL);
  });
});

describe('trialSubscriptionCreateData', () => {
  it('opens a 7-day trial without a storeId', () => {
    const data = trialSubscriptionCreateData('ws_1', new Date('2026-09-13T00:00:00.000Z'));
    expect(data.workspaceId).toBe('ws_1');
    expect(data.planKey).toBe(PERSONAL_PLAN_KEY.TRIAL);
    expect(data.status).toBe(SubscriptionStatus.TRIAL);
    expect(data).not.toHaveProperty('storeId');
    expect(data.trialEndsAt?.toISOString()).toBe('2026-09-20T00:00:00.000Z');
  });
});

describe('ensurePersonalTrial', () => {
  it('is a no-op when a row already exists', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({ id: 'psub_1' });
    await ensurePersonalTrial('ws_1');
    expect(prismaMock.personalSubscription.create).not.toHaveBeenCalled();
  });
});

describe('loadPersonalAuthUser', () => {
  it('maps a PERSONAL membership and never exposes a storeId', async () => {
    prismaMock.workspaceMembership.findUnique.mockResolvedValue({
      role: WorkspaceMembershipRole.OWNER,
      identity: { id: 'idn_1', email: 'aziz@example.com', fullName: 'Aziz Karimov' },
      workspace: {
        id: 'ws_1',
        type: WorkspaceType.PERSONAL,
        name: 'Azizning shaxsiy moliyasi',
        status: 'ACTIVE',
        storeId: null,
      },
    });
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
      trialWelcomeSeenAt: new Date('2026-09-13T10:00:00.000Z'),
    });

    const user = await loadPersonalAuthUser('idn_1', 'ws_1');
    expect(user.kind).toBe('PERSONAL');
    expect(user.storeId).toBeNull();
    expect(user.role).toBe('PERSONAL');
    expect(user.subscription.canWrite).toBe(true);
    expect(user.subscription.planId).toBe(PERSONAL_PLAN_KEY.TRIAL);
    expect(user.subscription.trialWelcomeSeenAt).toBe('2026-09-13T10:00:00.000Z');
  });
});

describe('selectPersonalPlan', () => {
  it('does not activate paid without a payment request', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      id: 'psub_1',
      workspaceId: 'ws_1',
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
    });

    await expect(
      selectPersonalPlan('ws_1', 'idn_1', { planKey: PERSONAL_PLAN_KEY.PAID }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.personalSubscription.update).not.toHaveBeenCalled();
  });

  it('does not reopen trial after it has ended', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      id: 'psub_1',
      status: SubscriptionStatus.EXPIRED,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
    });

    await expect(
      selectPersonalPlan('ws_1', 'idn_1', { planKey: PERSONAL_PLAN_KEY.TRIAL }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.personalSubscription.update).not.toHaveBeenCalled();
  });
});

describe('getPersonalBilling', () => {
  it('returns the catalogue without custom income or store plans', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
    });
    prismaMock.subscriptionPlan.findMany.mockResolvedValue([
      {
        name: PERSONAL_PLAN_KEY.TRIAL,
        monthlyPrice: 0n,
        trialDays: 7,
        rank: 0,
        isActive: true,
        features: { periodDays: 7 },
      },
      {
        name: PERSONAL_PLAN_KEY.PAID,
        monthlyPrice: 49000n,
        trialDays: 0,
        rank: 1,
        isActive: true,
        features: { periodDays: 30 },
      },
    ]);
    const billing = await getPersonalBilling('ws_1');
    expect(billing.plans.map((plan) => plan.key)).toEqual([
      PERSONAL_PLAN_KEY.TRIAL,
      PERSONAL_PLAN_KEY.PAID,
    ]);
    expect(billing.plans.find((plan) => plan.key === PERSONAL_PLAN_KEY.PAID)?.monthlyPriceSom).toBe(
      49000,
    );
  });
});

describe('markPersonalTrialWelcomeSeen', () => {
  it('stores trialWelcomeSeenAt on the personal row, not StoreSubscription', async () => {
    const row: Record<string, unknown> = {
      id: 'psub_1',
      workspaceId: 'ws_1',
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
      trialWelcomeSeenAt: null,
    };
    prismaMock.personalSubscription.findUnique.mockImplementation(async () => row);
    prismaMock.personalSubscription.update.mockImplementation(async ({ data }: { data: object }) => {
      Object.assign(row, data);
      return row;
    });

    const billing = await markPersonalTrialWelcomeSeen('ws_1');
    expect(row.trialWelcomeSeenAt).toBeInstanceOf(Date);
    expect(billing.subscription.trialWelcomeSeenAt).toBeTruthy();
    expect(JSON.stringify(billing)).not.toMatch(/storeId/);
  });

  it('does not rewrite the timestamp when already seen', async () => {
    const seen = new Date('2026-09-13T10:00:00.000Z');
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      id: 'psub_1',
      workspaceId: 'ws_1',
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
      trialWelcomeSeenAt: seen,
    });

    await markPersonalTrialWelcomeSeen('ws_1');
    expect(prismaMock.personalSubscription.update).not.toHaveBeenCalled();
  });
});

describe('requestPersonalSubscription', () => {
  const PAID_PLAN = {
    id: 'plan_personal_paid',
    name: PERSONAL_PLAN_KEY.PAID,
    monthlyPrice: 49000n,
    currency: 'UZS',
    isActive: true,
    isDefaultTrial: false,
    rank: 1,
    audience: 'PERSONAL',
  };

  it('creates a PENDING request without activating the paid plan', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      id: 'psub_1',
      workspaceId: 'ws_1',
      status: SubscriptionStatus.TRIAL,
      planKey: PERSONAL_PLAN_KEY.TRIAL,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-20T00:00:00.000Z'),
    });
    prismaMock.subscriptionPlan.findFirst.mockResolvedValue(PAID_PLAN);
    prismaMock.subscriptionRequest.create.mockResolvedValue({
      id: 'req_p1',
      storeId: null,
      workspaceId: 'ws_1',
      planId: PAID_PLAN.id,
      fromPlanName: 'Sinov',
      requestedPriceSnapshot: 49000n,
      currency: 'UZS',
      status: SubscriptionRequestStatus.PENDING,
      requestedAt: new Date('2026-09-14T00:00:00.000Z'),
      note: null,
      paymentMethod: 'CARD',
      payerReference: null,
      proofUrl: 'https://cdn.example/p.jpg',
      proofKey: 'billing-proofs/workspace/ws_1/p.jpg',
      store: null,
      workspace: { id: 'ws_1', name: 'Aziz', type: 'PERSONAL', personalSubscription: null, memberships: [] },
      plan: { id: PAID_PLAN.id, name: PAID_PLAN.name },
      reviewedBy: null,
    });

    const request = await requestPersonalSubscription(
      { id: 'idn_1', workspaceId: 'ws_1' },
      {
        paymentMethod: 'CARD',
        proofUrl: 'https://cdn.example/p.jpg',
        proofKey: 'billing-proofs/workspace/ws_1/p.jpg',
      },
    );
    expect(request.status).toBe(SubscriptionRequestStatus.PENDING);
    expect(request.workspaceId).toBe('ws_1');
    expect(request.storeId).toBeNull();
    expect(prismaMock.personalSubscription.update).not.toHaveBeenCalled();
  });

  it('rejects a second paid request while the current paid period is live', async () => {
    prismaMock.personalSubscription.findUnique.mockResolvedValue({
      id: 'psub_1',
      workspaceId: 'ws_1',
      status: SubscriptionStatus.ACTIVE,
      planKey: PERSONAL_PLAN_KEY.PAID,
      trialEndsAt: new Date('2026-09-20T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    });

    await expect(
      requestPersonalSubscription(
        { id: 'idn_1', workspaceId: 'ws_1' },
        {
          paymentMethod: 'CARD',
          proofUrl: 'https://cdn.example/p.jpg',
          proofKey: 'billing-proofs/workspace/ws_1/p.jpg',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.subscriptionRequest.create).not.toHaveBeenCalled();
  });
});
