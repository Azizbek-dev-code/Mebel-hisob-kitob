import {
  ReferralCommissionStatus,
  ReferralPaymentSourceType,
  ReferralWithdrawalStatus,
  UserRole,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../utils/api-error.js';

const { prismaMock, ensureIdentityForUser } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    platformSettings: { findUnique: vi.fn() },
    referralCode: { findUnique: vi.fn(), create: vi.fn() },
    referralClick: { create: vi.fn(), count: vi.fn() },
    referralAttribution: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    referralCommission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    referralWithdrawal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    workspaceMembership: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    personalEntry: { findMany: vi.fn(), create: vi.fn() },
    sale: { findMany: vi.fn(), create: vi.fn() },
  },
  ensureIdentityForUser: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../accounts/account-layer.service.js', () => ({ ensureIdentityForUser }));

const {
  attributeRegistration,
  approveReferralWithdrawal,
  ensureReferralCode,
  getMyReferral,
  getReferralAdminOverview,
  grantFirstPaymentCommission,
  payReferralWithdrawal,
  recordReferralClick,
  rejectReferralWithdrawal,
  requestReferralWithdrawal,
  resolveReferralCode,
  voidCommissionForSource,
} = await import('./referral.service.js');

const SETTINGS = {
  referralProgramActive: true,
  referralCommissionPercent: 10,
  referralMinWithdrawalSom: 100000n,
};

const CODE = {
  id: 'rc_1',
  identityId: 'idn_referrer',
  code: 'ABX7K29Q',
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
    fn(prismaMock),
  );
  prismaMock.platformSettings.findUnique.mockResolvedValue(SETTINGS);
  prismaMock.referralCode.findUnique.mockResolvedValue(CODE);
  prismaMock.personalEntry.findMany.mockResolvedValue([]);
  prismaMock.sale.findMany.mockResolvedValue([]);
});

describe('referral identity', () => {
  it('reuses an existing random code and never derives it from email', async () => {
    prismaMock.referralCode.findUnique.mockResolvedValue({ code: 'ABX7K29Q' });
    await expect(ensureReferralCode('idn_referrer')).resolves.toBe('ABX7K29Q');
    expect(prismaMock.referralCode.create).not.toHaveBeenCalled();
  });

  it('resolves a public code without owner identity fields', async () => {
    const resolved = await resolveReferralCode('abx7k29q');
    expect(resolved).toEqual({ valid: true, code: 'ABX7K29Q' });
    expect(JSON.stringify(resolved)).not.toMatch(/@|fullName|email/i);
  });
});

describe('click and attribution', () => {
  it('records a click against the code', async () => {
    prismaMock.referralClick.create.mockResolvedValue({ id: 'clk_1' });
    const result = await recordReferralClick('ABX7K29Q', 'vid_1');
    expect(result).toEqual({ code: 'ABX7K29Q', visitorKey: 'vid_1' });
    expect(prismaMock.referralClick.create).toHaveBeenCalledWith({
      data: { referralCodeId: 'rc_1', visitorKey: 'vid_1' },
    });
  });

  it('attributes a registration to one referrer and ignores a second code', async () => {
    prismaMock.referralAttribution.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'attr_1',
    });
    prismaMock.referralAttribution.create.mockResolvedValue({ id: 'attr_1' });
    await attributeRegistration({
      referredIdentityId: 'idn_new',
      referredWorkspaceId: 'ws_1',
      code: 'ABX7K29Q',
      visitorKey: 'vid_1',
    });
    expect(prismaMock.referralAttribution.create).toHaveBeenCalledTimes(1);

    await attributeRegistration({
      referredIdentityId: 'idn_new',
      code: 'CDEFGH23',
    });
    expect(prismaMock.referralAttribution.create).toHaveBeenCalledTimes(1);
  });

  it('blocks self-referral', async () => {
    prismaMock.referralAttribution.findUnique.mockResolvedValue(null);
    await attributeRegistration({
      referredIdentityId: 'idn_referrer',
      code: 'ABX7K29Q',
    });
    expect(prismaMock.referralAttribution.create).not.toHaveBeenCalled();
  });
});

describe('first payment commission', () => {
  const attribution = {
    id: 'attr_1',
    referrerIdentityId: 'idn_referrer',
    referredIdentityId: 'idn_new',
    firstPaidAt: null,
  };

  it('pays 10% of a verified 100000 payment into AVAILABLE', async () => {
    prismaMock.referralCommission.findUnique.mockResolvedValue(null);
    prismaMock.workspaceMembership.findFirst.mockResolvedValue({ identityId: 'idn_new' });
    prismaMock.referralAttribution.findUnique.mockResolvedValue(attribution);
    prismaMock.referralCommission.create.mockResolvedValue({ id: 'com_1' });
    prismaMock.referralAttribution.updateMany.mockResolvedValue({ count: 1 });

    await grantFirstPaymentCommission({
      referredWorkspaceId: 'ws_1',
      sourceType: ReferralPaymentSourceType.SUBSCRIPTION_REQUEST,
      sourceId: 'req_1',
      sourceAmountSom: 100000n,
      paid: true,
    });

    expect(prismaMock.referralCommission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountSom: 10000n,
        commissionPercent: 10,
        sourceAmountSom: 100000n,
        status: ReferralCommissionStatus.AVAILABLE,
        referrerIdentityId: 'idn_referrer',
      }),
    });
    expect(prismaMock.personalEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.sale.create).not.toHaveBeenCalled();
  });

  it('does not commission a duplicate payment or a later recurring source', async () => {
    prismaMock.referralCommission.findUnique.mockResolvedValue({ id: 'com_1' });
    await grantFirstPaymentCommission({
      referredIdentityId: 'idn_new',
      sourceType: ReferralPaymentSourceType.PLATFORM_INVOICE,
      sourceId: 'inv_2',
      sourceAmountSom: 100000n,
      paid: true,
    });
    expect(prismaMock.referralCommission.create).not.toHaveBeenCalled();
  });

  it('does not commission failed or unpaid sources', async () => {
    await grantFirstPaymentCommission({
      referredIdentityId: 'idn_new',
      sourceType: ReferralPaymentSourceType.PLATFORM_INVOICE,
      sourceId: 'inv_fail',
      sourceAmountSom: 100000n,
      paid: false,
    });
    expect(prismaMock.referralCommission.create).not.toHaveBeenCalled();
  });

  it('rejects AVAILABLE commission on refund and leaves PAID untouched', async () => {
    prismaMock.referralCommission.findUnique.mockResolvedValueOnce({
      id: 'com_1',
      status: ReferralCommissionStatus.AVAILABLE,
    });
    prismaMock.referralCommission.update.mockResolvedValue({});
    await voidCommissionForSource(ReferralPaymentSourceType.PLATFORM_INVOICE, 'inv_1');
    expect(prismaMock.referralCommission.update).toHaveBeenCalledWith({
      where: { id: 'com_1' },
      data: { status: ReferralCommissionStatus.REJECTED },
    });

    prismaMock.referralCommission.findUnique.mockResolvedValueOnce({
      id: 'com_2',
      status: ReferralCommissionStatus.PAID,
    });
    await voidCommissionForSource(ReferralPaymentSourceType.PLATFORM_INVOICE, 'inv_paid');
    expect(prismaMock.referralCommission.update).toHaveBeenCalledTimes(1);
  });
});

describe('withdrawal', () => {
  it('rejects below the admin threshold', async () => {
    prismaMock.referralWithdrawal.findFirst.mockResolvedValue(null);
    prismaMock.referralCommission.findMany.mockResolvedValue([
      { id: 'com_1', amountSom: 50000n },
    ]);
    await expect(requestReferralWithdrawal('idn_referrer')).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(prismaMock.referralWithdrawal.create).not.toHaveBeenCalled();
  });

  it('locks AVAILABLE commissions into one PENDING withdrawal', async () => {
    prismaMock.referralWithdrawal.findFirst.mockResolvedValue(null);
    prismaMock.referralCommission.findMany.mockResolvedValue([
      { id: 'com_1', amountSom: 60000n },
      { id: 'com_2', amountSom: 50000n },
    ]);
    prismaMock.referralWithdrawal.create.mockResolvedValue({
      id: 'wd_1',
      amountSom: 110000n,
      status: ReferralWithdrawalStatus.PENDING,
      rejectionReason: null,
      createdAt: new Date('2026-09-14'),
      reviewedAt: null,
      paidAt: null,
    });
    prismaMock.referralCommission.updateMany.mockResolvedValue({ count: 2 });

    const result = await requestReferralWithdrawal('idn_referrer');
    expect(result.amount).toBe(110000);
    expect(result.status).toBe(ReferralWithdrawalStatus.PENDING);
    expect(prismaMock.referralCommission.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['com_1', 'com_2'] },
        status: ReferralCommissionStatus.AVAILABLE,
      },
      data: {
        status: ReferralCommissionStatus.WITHDRAW_REQUESTED,
        withdrawalId: 'wd_1',
      },
    });
  });

  it('blocks a second open withdrawal', async () => {
    prismaMock.referralWithdrawal.findFirst.mockResolvedValue({ id: 'wd_open' });
    await expect(requestReferralWithdrawal('idn_referrer')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('lets platform admin approve, reject, and mark paid once', async () => {
    const actor = { id: 'admin_1', role: UserRole.PLATFORM_ADMIN };
    prismaMock.referralWithdrawal.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.referralWithdrawal.findUniqueOrThrow.mockResolvedValue({
      id: 'wd_1',
      amountSom: 110000n,
      status: ReferralWithdrawalStatus.APPROVED,
      rejectionReason: null,
      createdAt: new Date('2026-09-14'),
      reviewedAt: new Date('2026-09-14'),
      paidAt: null,
    });
    await expect(approveReferralWithdrawal(actor, 'wd_1')).resolves.toMatchObject({
      status: ReferralWithdrawalStatus.APPROVED,
    });

    prismaMock.referralWithdrawal.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.referralCommission.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.referralWithdrawal.findUniqueOrThrow.mockResolvedValue({
      id: 'wd_1',
      amountSom: 110000n,
      status: ReferralWithdrawalStatus.REJECTED,
      rejectionReason: 'Hujjat yetarli emas',
      createdAt: new Date('2026-09-14'),
      reviewedAt: new Date('2026-09-14'),
      paidAt: null,
    });
    await expect(rejectReferralWithdrawal(actor, 'wd_1', 'Hujjat yetarli emas')).resolves.toMatchObject({
      status: ReferralWithdrawalStatus.REJECTED,
    });

    prismaMock.referralWithdrawal.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.referralWithdrawal.findUniqueOrThrow.mockResolvedValue({
      id: 'wd_1',
      amountSom: 110000n,
      status: ReferralWithdrawalStatus.PAID,
      rejectionReason: null,
      createdAt: new Date('2026-09-14'),
      reviewedAt: new Date('2026-09-14'),
      paidAt: new Date('2026-09-14'),
    });
    await expect(payReferralWithdrawal(actor, 'wd_1')).resolves.toMatchObject({
      status: ReferralWithdrawalStatus.PAID,
    });

    prismaMock.referralWithdrawal.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(payReferralWithdrawal(actor, 'wd_1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('forbids store admin from platform referral overview', async () => {
    await expect(getReferralAdminOverview(UserRole.ADMIN)).rejects.toBeInstanceOf(ApiError);
    await expect(getReferralAdminOverview(UserRole.ADMIN)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('owner dashboard isolation', () => {
  it('summarises only the referrer identity wallet', async () => {
    prismaMock.referralCode.findUnique
      .mockResolvedValueOnce({ code: 'ABX7K29Q' })
      .mockResolvedValueOnce({ id: 'rc_1' });
    prismaMock.referralClick.count.mockResolvedValue(12);
    prismaMock.referralAttribution.findMany.mockResolvedValue([
      { firstPaidAt: new Date() },
      { firstPaidAt: null },
    ]);
    prismaMock.referralCommission.findMany.mockResolvedValue([
      { amountSom: 10000n, status: ReferralCommissionStatus.AVAILABLE },
      { amountSom: 5000n, status: ReferralCommissionStatus.PAID },
    ]);

    const me = await getMyReferral('idn_referrer');
    expect(me.code).toBe('ABX7K29Q');
    expect(me.path).toBe('/ref/ABX7K29Q');
    expect(me.clicks).toBe(12);
    expect(me.registrations).toBe(2);
    expect(me.firstPayments).toBe(1);
    expect(me.earned).toBe(15000);
    expect(me.available).toBe(10000);
    expect(me.paid).toBe(5000);
    expect(me.canWithdraw).toBe(false);
    expect(prismaMock.personalEntry.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(prismaMock.workspaceMembership.findFirst).not.toHaveBeenCalled();
  });
});
