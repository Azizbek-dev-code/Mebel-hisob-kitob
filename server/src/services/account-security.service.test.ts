import { AuthEmailCodePurpose } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, issueMock, consumeMock, ensureIdentityMock } = vi.hoisted(() => ({
  prismaMock: {
    identity: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    storeCreationRequest: { findFirst: vi.fn() },
  },
  issueMock: vi.fn(),
  consumeMock: vi.fn(),
  ensureIdentityMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./auth-email-code.service.js', () => ({
  issueEmailCode: issueMock,
  consumeEmailCode: consumeMock,
}));
vi.mock('../modules/accounts/account-layer.service.js', () => ({
  ensureIdentityForUser: ensureIdentityMock,
}));
vi.mock('../modules/personal-finance/billing/personal-subscription.service.js', () => ({
  findPersonalSignInCandidate: vi.fn(),
}));
vi.mock('../repositories/user.repository.js', () => ({
  findSignInCandidate: vi.fn(),
}));

const { findSignInCandidate } = await import('../repositories/user.repository.js');
const { findPersonalSignInCandidate } = await import(
  '../modules/personal-finance/billing/personal-subscription.service.js'
);
const {
  requestPasswordReset,
  requestEmailVerification,
  confirmEmailVerification,
  requestEmailChange,
  confirmEmailChange,
  updateAccountProfile,
} = await import('./account-security.service.js');

const PERSONAL = {
  kind: 'PERSONAL' as const,
  id: 'idn_1',
  email: 'aziz@example.com',
  username: null,
  fullName: 'Aziz',
  phone: null,
  role: 'PERSONAL' as const,
  responsibilities: [] as const,
  storeId: null,
  storeName: 'Shaxsiy',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  membershipRole: 'OWNER' as const,
  emailVerified: false,
  subscription: {
    status: 'TRIAL' as const,
    storedStatus: 'TRIAL' as const,
    planId: 'PERSONAL_TRIAL',
    planName: 'Sinov',
    trialEndsAt: null,
    currentPeriodEnd: '2026-09-20T00:00:00.000Z',
    trialWelcomeSeenAt: null,
    daysRemaining: 7,
    canWrite: true,
    hasPendingPaymentRequest: false,
    featureKeys: [] as string[],
    featuresRestricted: false,
  },
};

describe('account security email flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.identity.findUnique.mockResolvedValue({
      id: 'idn_1',
      email: 'aziz@example.com',
      emailVerifiedAt: null,
    });
    prismaMock.identity.findFirst.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.storeCreationRequest.findFirst.mockResolvedValue(null);
    prismaMock.identity.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    issueMock.mockResolvedValue(undefined);
    consumeMock.mockResolvedValue({ newEmail: 'new@example.com' });
    vi.mocked(findSignInCandidate).mockResolvedValue(null);
    vi.mocked(findPersonalSignInCandidate).mockResolvedValue(null);
  });

  it('does not issue a reset code when the inbox is unknown', async () => {
    await requestPasswordReset('nobody@example.com');
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('issues a reset code when a personal identity exists', async () => {
    vi.mocked(findPersonalSignInCandidate).mockResolvedValue({ id: 'idn_1' });
    await requestPasswordReset('aziz@example.com');
    expect(issueMock).toHaveBeenCalledWith({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.PASSWORD_RESET,
      identityId: 'idn_1',
    });
  });

  it('sends an identity-level verification code', async () => {
    await requestEmailVerification(PERSONAL);
    expect(issueMock).toHaveBeenCalledWith({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
      identityId: 'idn_1',
    });
  });

  it('skips sending when the identity email is already verified', async () => {
    prismaMock.identity.findUnique.mockResolvedValue({
      id: 'idn_1',
      email: 'aziz@example.com',
      emailVerifiedAt: new Date(),
    });
    await requestEmailVerification(PERSONAL);
    expect(issueMock).not.toHaveBeenCalled();
  });

  it('sets emailVerifiedAt after a valid verification code', async () => {
    await confirmEmailVerification(PERSONAL, '123456');
    expect(consumeMock).toHaveBeenCalledWith({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
      code: '123456',
    });
    expect(prismaMock.identity.update).toHaveBeenCalledWith({
      where: { id: 'idn_1' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('does not apply a new email on the profile patch', async () => {
    await expect(
      updateAccountProfile(PERSONAL, { firstName: 'Aziz', lastName: 'Karimov', email: 'other@example.com' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prismaMock.identity.update).not.toHaveBeenCalled();
  });

  it('sends a change-email code to the new address without updating Identity yet', async () => {
    await requestEmailChange(PERSONAL, { newEmail: 'new@example.com' });
    expect(issueMock).toHaveBeenCalledWith({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.EMAIL_CHANGE,
      identityId: 'idn_1',
      newEmail: 'new@example.com',
    });
    expect(prismaMock.identity.update).not.toHaveBeenCalled();
  });

  it('updates Identity email only after the change code is consumed', async () => {
    const next = await confirmEmailChange(PERSONAL, { code: '654321' });
    expect(prismaMock.identity.update).toHaveBeenCalledWith({
      where: { id: 'idn_1' },
      data: { email: 'new@example.com', emailVerifiedAt: expect.any(Date) },
    });
    expect(next.email).toBe('new@example.com');
    expect(next.emailVerified).toBe(true);
  });

  it('rejects a taken email without sending a code', async () => {
    prismaMock.identity.findFirst.mockResolvedValue({ id: 'idn_other' });
    await expect(requestEmailChange(PERSONAL, { newEmail: 'taken@example.com' })).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(issueMock).not.toHaveBeenCalled();
  });
});
