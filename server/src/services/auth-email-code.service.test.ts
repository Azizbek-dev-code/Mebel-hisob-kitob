import { AuthEmailCodePurpose } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, sendMailMock } = vi.hoisted(() => ({
  prismaMock: {
    authEmailCode: {
      count: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  sendMailMock: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./emailService.js', () => ({
  sendVerificationEmail: sendMailMock,
  sendPasswordResetEmail: sendMailMock,
}));
vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-secret-must-be-at-least-32-chars!!',
    isProduction: false,
    isTest: true,
  },
}));
vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { hashEmailCode, issueEmailCode, consumeEmailCode } = await import('./auth-email-code.service.js');

describe('auth email codes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.authEmailCode.count.mockResolvedValue(0);
    prismaMock.authEmailCode.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.authEmailCode.create.mockResolvedValue({ id: 'code_1' });
    sendMailMock.mockResolvedValue(undefined);
  });

  it('hashes codes with HMAC and never stores plaintext', async () => {
    const hash = hashEmailCode('123456');
    expect(hash).not.toContain('123456');
    expect(hash).toHaveLength(64);
    await issueEmailCode({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.PASSWORD_RESET,
    });
    const created = prismaMock.authEmailCode.create.mock.calls[0][0].data;
    expect(created.codeHash).toHaveLength(64);
    expect(created.codeHash).not.toBe('123456');
    expect(created.email).toBe('aziz@example.com');
  });

  it('rejects expired and reused codes', async () => {
    prismaMock.authEmailCode.findFirst.mockResolvedValue({
      id: 'c1',
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.PASSWORD_RESET,
      codeHash: hashEmailCode('111111'),
      newEmail: null,
      expiresAt: new Date('2020-01-01'),
      consumedAt: null,
      attemptCount: 0,
      identityId: null,
    });
    await expect(
      consumeEmailCode({
        email: 'aziz@example.com',
        purpose: AuthEmailCodePurpose.PASSWORD_RESET,
        code: '111111',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('consumes a valid code once', async () => {
    const hash = hashEmailCode('222222');
    prismaMock.authEmailCode.findFirst.mockResolvedValue({
      id: 'c2',
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.PASSWORD_RESET,
      codeHash: hash,
      newEmail: null,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      attemptCount: 0,
      identityId: null,
    });
    prismaMock.authEmailCode.update.mockResolvedValue({ id: 'c2', consumedAt: new Date() });
    const row = await consumeEmailCode({
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.PASSWORD_RESET,
      code: '222222',
    });
    expect(row.id).toBe('c2');
    expect(prismaMock.authEmailCode.update).toHaveBeenCalled();
  });

  it('rate-limits issuing more than 5 codes per hour', async () => {
    prismaMock.authEmailCode.count.mockResolvedValue(5);
    await expect(
      issueEmailCode({
        email: 'aziz@example.com',
        purpose: AuthEmailCodePurpose.PASSWORD_RESET,
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it('invalidates previous codes and emails the new address for email change', async () => {
    await issueEmailCode({
      email: 'old@example.com',
      purpose: AuthEmailCodePurpose.EMAIL_CHANGE,
      newEmail: 'new@example.com',
      identityId: 'idn_1',
    });
    expect(prismaMock.authEmailCode.updateMany).toHaveBeenCalledWith({
      where: {
        email: 'old@example.com',
        purpose: AuthEmailCodePurpose.EMAIL_CHANGE,
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
    expect(sendMailMock).toHaveBeenCalledWith('new@example.com', expect.stringMatching(/^\d{6}$/));
  });

  it('locks a code after 5 failed attempts', async () => {
    prismaMock.authEmailCode.findFirst.mockResolvedValue({
      id: 'c3',
      email: 'aziz@example.com',
      purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
      codeHash: hashEmailCode('333333'),
      newEmail: null,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      attemptCount: 4,
      identityId: 'idn_1',
    });
    prismaMock.authEmailCode.update.mockResolvedValue({ id: 'c3' });
    await expect(
      consumeEmailCode({
        email: 'aziz@example.com',
        purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
        code: '000000',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prismaMock.authEmailCode.update).toHaveBeenCalledWith({
      where: { id: 'c3' },
      data: { attemptCount: 5, consumedAt: expect.any(Date) },
    });
  });
});
