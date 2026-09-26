import {
  AuthEmailCodePurpose,
  PERSONAL_PASSWORD_MAX,
  PERSONAL_PASSWORD_MIN,
  StoreCreationRequestStatus,
  applicantFullName,
  isPersonalAuth,
  normalizeEmail,
  normalizePersonName,
  type AuthPrincipal,
  type ChangePasswordRequest,
  type ConfirmEmailChangeRequest,
  type RequestEmailChangeRequest,
  type ResetPasswordRequest,
  type UpdateAccountProfileRequest,
} from '@furniture-erp/shared';

import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { ensureIdentityForUser } from '../modules/accounts/account-layer.service.js';
import { findPersonalSignInCandidate } from '../modules/personal-finance/billing/personal-subscription.service.js';
import { findSignInCandidate } from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';

import { consumeEmailCode, issueEmailCode } from './auth-email-code.service.js';
import * as authSessions from './auth-sessions.service.js';
import { assertPasswordNotCompromised } from './security/compromised-password.service.js';

async function assertNewPassword(password: string, confirmation: string): Promise<void> {
  if (password.length < PERSONAL_PASSWORD_MIN || password.length > PERSONAL_PASSWORD_MAX) {
    throw ApiError.validation(`Parol kamida ${PERSONAL_PASSWORD_MIN} belgidan iborat bo'lishi kerak`, [
      { field: 'newPassword', message: `Kamida ${PERSONAL_PASSWORD_MIN} belgi` },
    ]);
  }
  if (password !== confirmation) {
    throw ApiError.validation('Parollar mos kelmadi', [
      { field: 'newPasswordConfirmation', message: 'Parollar mos kelmadi' },
    ]);
  }
  await assertPasswordNotCompromised(password);
}

async function resolveIdentity(user: AuthPrincipal): Promise<{
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}> {
  if (isPersonalAuth(user)) {
    const identity = await prisma.identity.findUnique({
      where: { id: user.identityId },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!identity) throw ApiError.unauthorized();
    return identity;
  }

  const identityId = await ensureIdentityForUser(user.id);
  const identity = await prisma.identity.findUnique({
    where: { id: identityId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!identity) throw ApiError.unauthorized();
  return identity;
}

async function assertEmailAvailableForChange(
  email: string,
  except: { identityId: string; userId?: string },
): Promise<void> {
  const [identity, otherUser, pendingRequest] = await Promise.all([
    prisma.identity.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: except.identityId } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(except.userId ? { NOT: { id: except.userId } } : {}),
      },
      select: { id: true },
    }),
    prisma.storeCreationRequest.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        status: StoreCreationRequestStatus.PENDING,
      },
      select: { id: true },
    }),
  ]);

  if (identity || otherUser || pendingRequest) {
    throw ApiError.conflict('Bu email allaqachon ishlatilgan');
  }
}

export async function changePasswordWithCurrent(
  user: AuthPrincipal,
  input: ChangePasswordRequest,
): Promise<void> {
  if (input.newPassword !== input.newPasswordConfirmation) {
    throw ApiError.validation('Parollar mos kelmadi', [
      { field: 'newPasswordConfirmation', message: 'Parollar mos kelmadi' },
    ]);
  }
  if (input.currentPassword === input.newPassword) {
    throw ApiError.validation('Yangi parol joriy parol bilan bir xil bo‘lmasligi kerak', [
      { field: 'newPassword', message: 'Yangi parol joriydan farq qilishi kerak' },
    ]);
  }

  if (isPersonalAuth(user)) {
    const identity = await prisma.identity.findUnique({
      where: { id: user.identityId },
      select: { id: true, passwordHash: true },
    });
    if (!identity?.passwordHash) {
      throw ApiError.badRequest('Parolni o‘zgartirib bo‘lmadi');
    }
    if (!(await verifyPassword(input.currentPassword, identity.passwordHash))) {
      throw ApiError.unauthorized('Incorrect username or password.');
    }
    await assertNewPassword(input.newPassword, input.newPasswordConfirmation);
    await prisma.identity.update({
      where: { id: identity.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
    await authSessions.revokeAllSessions(user);
    return;
  }

  const record = await prisma.user.findFirst({
    where: { id: user.id, storeId: user.storeId, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!record) throw ApiError.unauthorized();
  if (!(await verifyPassword(input.currentPassword, record.passwordHash))) {
    throw ApiError.unauthorized('Incorrect username or password.');
  }
  await assertNewPassword(input.newPassword, input.newPasswordConfirmation);
  await prisma.user.update({
    where: { id: record.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  await authSessions.revokeAllSessions(user);
}

/**
 * Always succeeds with the same message. Whether the email exists is not disclosed.
 * Codes are issued only when an account exists, so unknown inboxes are not emailed.
 */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) {
    throw ApiError.validation('Emailni kiriting', [{ field: 'email', message: 'Emailni kiriting' }]);
  }

  const storeUser = await findSignInCandidate(email);
  const personal = storeUser ? null : await findPersonalSignInCandidate(email);
  if (!storeUser && !personal) return;

  await issueEmailCode({
    email,
    purpose: AuthEmailCodePurpose.PASSWORD_RESET,
    identityId: personal?.id ?? null,
  });
}

export async function resetPasswordWithCode(input: ResetPasswordRequest): Promise<void> {
  await assertNewPassword(input.newPassword, input.newPasswordConfirmation);
  const email = normalizeEmail(input.email);
  if (!email) {
    throw ApiError.validation('Emailni kiriting', [{ field: 'email', message: 'Emailni kiriting' }]);
  }

  await consumeEmailCode({
    email,
    purpose: AuthEmailCodePurpose.PASSWORD_RESET,
    code: input.code,
  });

  const digest = await hashPassword(input.newPassword);
  const storeUser = await findSignInCandidate(email);
  if (storeUser) {
    await prisma.user.update({
      where: { id: storeUser.id },
      data: { passwordHash: digest },
    });
    await authSessions.revokeAllSessionsForUserId(storeUser.id);
    return;
  }

  const personal = await findPersonalSignInCandidate(email);
  if (personal) {
    await prisma.identity.update({
      where: { id: personal.id },
      data: { passwordHash: digest },
    });
    await authSessions.revokeAllSessionsForIdentityId(personal.id);
  }
}

function resolveFullName(input: UpdateAccountProfileRequest, current: string): string {
  if (input.firstName != null || input.lastName != null) {
    const first = normalizePersonName(input.firstName ?? '');
    const last = normalizePersonName(input.lastName ?? '');
    const joined = applicantFullName(first || splitFirst(current), last);
    if (!joined) {
      throw ApiError.validation('Ismni kiriting', [{ field: 'firstName', message: 'Ismni kiriting' }]);
    }
    return joined;
  }
  if (input.fullName != null) {
    const name = normalizePersonName(input.fullName);
    if (!name) {
      throw ApiError.validation('Ismni kiriting', [{ field: 'fullName', message: 'Ismni kiriting' }]);
    }
    return name;
  }
  return current;
}

function splitFirst(fullName: string): string {
  return normalizePersonName(fullName).split(' ')[0] ?? '';
}

export async function updateAccountProfile(
  user: AuthPrincipal,
  input: UpdateAccountProfileRequest,
): Promise<AuthPrincipal> {
  const nextEmail = input.email != null ? normalizeEmail(input.email) : null;
  if (input.email != null && !nextEmail) {
    throw ApiError.validation("To'g'ri email kiriting", [
      { field: 'email', message: "To'g'ri email kiriting" },
    ]);
  }
  if (nextEmail && nextEmail !== user.email) {
    throw ApiError.badRequest('Emailni tasdiqlash kodisiz o‘zgartirib bo‘lmaydi');
  }

  if (isPersonalAuth(user)) {
    const fullName = resolveFullName(input, user.fullName);
    await prisma.identity.update({
      where: { id: user.identityId },
      data: { fullName },
    });
    return { ...user, fullName };
  }

  const fullName = resolveFullName(input, user.fullName);
  const phone =
    input.phone === undefined ? undefined : input.phone?.trim() ? input.phone.trim() : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName,
      ...(phone !== undefined ? { phone } : {}),
    },
  });

  return {
    ...user,
    fullName,
    phone: phone === undefined ? user.phone : phone,
  };
}

export async function requestEmailVerification(user: AuthPrincipal): Promise<void> {
  const identity = await resolveIdentity(user);
  if (identity.emailVerifiedAt) return;

  await issueEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
    identityId: identity.id,
  });
}

export async function confirmEmailVerification(user: AuthPrincipal, code: string): Promise<void> {
  const identity = await resolveIdentity(user);
  await consumeEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
    code,
  });
  await prisma.identity.update({
    where: { id: identity.id },
    data: { emailVerifiedAt: new Date() },
  });
}

export async function requestEmailChange(
  user: AuthPrincipal,
  input: RequestEmailChangeRequest,
): Promise<void> {
  const nextEmail = normalizeEmail(input.newEmail);
  if (!nextEmail) {
    throw ApiError.validation("To'g'ri email kiriting", [
      { field: 'newEmail', message: "To'g'ri email kiriting" },
    ]);
  }
  if (nextEmail === user.email) {
    throw ApiError.badRequest('Yangi email joriy email bilan bir xil');
  }

  const identity = await resolveIdentity(user);
  await assertEmailAvailableForChange(nextEmail, {
    identityId: identity.id,
    userId: isPersonalAuth(user) ? undefined : user.id,
  });

  await issueEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_CHANGE,
    identityId: identity.id,
    newEmail: nextEmail,
  });
}

export async function confirmEmailChange(
  user: AuthPrincipal,
  input: ConfirmEmailChangeRequest,
): Promise<AuthPrincipal> {
  const identity = await resolveIdentity(user);
  const row = await consumeEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_CHANGE,
    code: input.code,
  });
  const nextEmail = normalizeEmail(row.newEmail ?? '');
  if (!nextEmail) {
    throw ApiError.badRequest('Invalid or expired code');
  }

  await assertEmailAvailableForChange(nextEmail, {
    identityId: identity.id,
    userId: isPersonalAuth(user) ? undefined : user.id,
  });

  const verifiedAt = new Date();
  await prisma.identity.update({
    where: { id: identity.id },
    data: { email: nextEmail, emailVerifiedAt: verifiedAt },
  });

  if (!isPersonalAuth(user)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: nextEmail },
    });
  }

  return {
    ...user,
    email: nextEmail,
    emailVerified: true,
  };
}

/** Logged-in password reset via email code (same codes as public forgot-password). */
export async function requestInAppPasswordReset(user: AuthPrincipal): Promise<void> {
  await issueEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.PASSWORD_RESET,
    identityId: isPersonalAuth(user) ? user.identityId : (await resolveIdentity(user)).id,
  });
}

export async function confirmInAppPasswordReset(
  user: AuthPrincipal,
  input: { code: string; newPassword: string; newPasswordConfirmation: string },
): Promise<void> {
  await resetPasswordWithCode({
    email: user.email,
    code: input.code,
    newPassword: input.newPassword,
    newPasswordConfirmation: input.newPasswordConfirmation,
  });
}
