import {
  AuthEmailCodePurpose,
  PERSONAL_PASSWORD_MAX,
  PERSONAL_PASSWORD_MIN,
  applicantFullName,
  isPersonalAuth,
  normalizeEmail,
  normalizePersonName,
  type AuthPrincipal,
  type ChangePasswordRequest,
  type ResetPasswordRequest,
  type UpdateAccountProfileRequest,
} from '@furniture-erp/shared';

import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { findPersonalSignInCandidate } from '../modules/personal-finance/billing/personal-subscription.service.js';
import { findSignInCandidate } from '../repositories/user.repository.js';
import { ApiError } from '../utils/api-error.js';

import { consumeEmailCode, issueEmailCode } from './auth-email-code.service.js';

function assertNewPassword(password: string, confirmation: string): void {
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
}

export async function changePasswordWithCurrent(
  user: AuthPrincipal,
  input: ChangePasswordRequest,
): Promise<void> {
  assertNewPassword(input.newPassword, input.newPasswordConfirmation);

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
    await prisma.identity.update({
      where: { id: identity.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
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
  await prisma.user.update({
    where: { id: record.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}

/**
 * Always succeeds with the same message. Whether the email exists is not disclosed.
 */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) {
    throw ApiError.validation('Emailni kiriting', [{ field: 'email', message: 'Emailni kiriting' }]);
  }

  const storeUser = await findSignInCandidate(email);
  const personal = storeUser ? null : await findPersonalSignInCandidate(email);

  await issueEmailCode({
    email,
    purpose: AuthEmailCodePurpose.PASSWORD_RESET,
    identityId: personal?.id ?? null,
    subject: 'Parolni tiklash kodi',
    body: (code) => `Parolni tiklash kodi: ${code}. 15 daqiqa amal qiladi. Hech kimga bermang.`,
  });
}

export async function resetPasswordWithCode(input: ResetPasswordRequest): Promise<void> {
  assertNewPassword(input.newPassword, input.newPasswordConfirmation);
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
    return;
  }

  const personal = await findPersonalSignInCandidate(email);
  if (personal) {
    await prisma.identity.update({
      where: { id: personal.id },
      data: { passwordHash: digest },
    });
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

  if (isPersonalAuth(user)) {
    const fullName = resolveFullName(input, user.fullName);
    await prisma.identity.update({
      where: { id: user.identityId },
      data: {
        fullName,
        ...(nextEmail && nextEmail !== user.email
          ? { email: nextEmail, emailVerifiedAt: null }
          : {}),
      },
    });
    return {
      ...user,
      fullName,
      email: nextEmail && nextEmail !== user.email ? nextEmail : user.email,
      emailVerified: nextEmail && nextEmail !== user.email ? false : user.emailVerified,
    };
  }

  const fullName = resolveFullName(input, user.fullName);
  const phone =
    input.phone === undefined ? undefined : input.phone?.trim() ? input.phone.trim() : null;

  if (nextEmail && nextEmail !== user.email) {
    const clash = await prisma.user.findFirst({
      where: { storeId: user.storeId, email: nextEmail, NOT: { id: user.id } },
      select: { id: true },
    });
    if (clash) {
      throw ApiError.conflict('Bu email allaqachon band');
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName,
      ...(phone !== undefined ? { phone } : {}),
      ...(nextEmail && nextEmail !== user.email ? { email: nextEmail } : {}),
    },
  });

  return {
    ...user,
    fullName,
    phone: phone === undefined ? user.phone : phone,
    email: nextEmail && nextEmail !== user.email ? nextEmail : user.email,
  };
}

export async function requestEmailVerification(user: AuthPrincipal): Promise<void> {
  if (!isPersonalAuth(user)) {
    throw ApiError.badRequest('Email tasdiqlash shaxsiy hisob uchun');
  }
  if (user.emailVerified) {
    throw ApiError.badRequest('Email allaqachon tasdiqlangan');
  }
  await issueEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
    identityId: user.identityId,
    subject: 'Email tasdiqlash kodi',
    body: (code) => `Email tasdiqlash kodi: ${code}. 15 daqiqa amal qiladi.`,
  });
}

export async function confirmEmailVerification(user: AuthPrincipal, code: string): Promise<void> {
  if (!isPersonalAuth(user)) {
    throw ApiError.badRequest('Email tasdiqlash shaxsiy hisob uchun');
  }
  await consumeEmailCode({
    email: user.email,
    purpose: AuthEmailCodePurpose.EMAIL_VERIFY,
    code,
  });
  await prisma.identity.update({
    where: { id: user.identityId },
    data: { emailVerifiedAt: new Date() },
  });
}

/** Logged-in password reset via email code (same codes as public forgot-password). */
export async function requestInAppPasswordReset(user: AuthPrincipal): Promise<void> {
  await requestPasswordReset(user.email);
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