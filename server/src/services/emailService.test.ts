import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const envState = {
  RESEND_API_KEY: undefined as string | undefined,
  EMAIL_FROM: undefined as string | undefined,
  isProduction: false,
  isTest: true,
};

vi.mock('../config/env.js', () => ({
  env: envState,
}));

const { sendVerificationEmail, sendPasswordResetEmail, resetEmailServiceClient } =
  await import('./emailService.js');
const { logger } = await import('../utils/logger.js');

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envState.RESEND_API_KEY = undefined;
    envState.EMAIL_FROM = undefined;
    envState.isProduction = false;
    resetEmailServiceClient();
    sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });
  });

  it('does not crash or call Resend when the API key is missing', async () => {
    await expect(sendVerificationEmail('aziz@example.com', '123456')).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it('sends a verification email through Resend when configured', async () => {
    envState.RESEND_API_KEY = 're_test_key';
    envState.EMAIL_FROM = 'Balancy <noreply@example.com>';
    resetEmailServiceClient();

    await sendVerificationEmail('aziz@example.com', '654321');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Balancy <noreply@example.com>',
        to: 'aziz@example.com',
        subject: 'Email tasdiqlash kodi',
        text: expect.stringContaining('654321'),
      }),
    );
    const payload = sendMock.mock.calls[0]?.[0] as { html?: string };
    expect(JSON.stringify(payload)).not.toContain('re_test_key');
  });

  it('sends a password reset email through Resend when configured', async () => {
    envState.RESEND_API_KEY = 're_test_key';
    envState.EMAIL_FROM = 'Balancy <noreply@example.com>';
    resetEmailServiceClient();

    await sendPasswordResetEmail('aziz@example.com', '111222');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'aziz@example.com',
        subject: 'Parolni tiklash kodi',
        text: expect.stringContaining('111222'),
      }),
    );
  });

  it('does not log the one-time code in production when Resend is unconfigured', async () => {
    envState.isProduction = true;
    await sendPasswordResetEmail('aziz@example.com', '999888');
    expect(sendMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    const logged = vi.mocked(logger.error).mock.calls[0];
    expect(JSON.stringify(logged)).not.toContain('999888');
  });
});
