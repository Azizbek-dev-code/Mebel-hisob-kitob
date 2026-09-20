import { PERSONAL_PASSWORD_MAX, PERSONAL_PASSWORD_MIN } from '@furniture-erp/shared';
import { z } from 'zod';

/**
 * Login checks presence only. Applying the password policy here would reject a
 * legitimate password chosen before the rules changed, and would tell an
 * attacker what the rules are.
 */
export const loginBodySchema = z.object({
  identifier: z
    .string({ required_error: 'Enter your username or email' })
    .trim()
    .min(1, 'Enter your username or email')
    .max(255, 'Username or email is too long'),
  password: z
    .string({ required_error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(128, 'Password is too long'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

const newPasswordSchema = z
  .string()
  .min(PERSONAL_PASSWORD_MIN, `Parol kamida ${PERSONAL_PASSWORD_MIN} belgidan iborat bo'lishi kerak`)
  .max(PERSONAL_PASSWORD_MAX, 'Parol juda uzun');

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z.string().min(1).max(PERSONAL_PASSWORD_MAX),
  })
  .refine((body) => body.newPassword === body.newPasswordConfirmation, {
    message: 'Parollar mos kelmadi',
    path: ['newPasswordConfirmation'],
  });

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().email("To'g'ri email kiriting").max(160),
});

export const resetPasswordBodySchema = z
  .object({
    email: z.string().trim().email("To'g'ri email kiriting").max(160),
    code: z.string().trim().regex(/^\d{6}$/, 'Kod 6 raqamdan iborat'),
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z.string().min(1).max(PERSONAL_PASSWORD_MAX),
  })
  .refine((body) => body.newPassword === body.newPasswordConfirmation, {
    message: 'Parollar mos kelmadi',
    path: ['newPasswordConfirmation'],
  });

export const verifyEmailCodeBodySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Kod 6 raqamdan iborat'),
});

export const inAppResetPasswordBodySchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, 'Kod 6 raqamdan iborat'),
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z.string().min(1).max(PERSONAL_PASSWORD_MAX),
  })
  .refine((body) => body.newPassword === body.newPasswordConfirmation, {
    message: 'Parollar mos kelmadi',
    path: ['newPasswordConfirmation'],
  });

export const updateAccountProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    fullName: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email("To'g'ri email kiriting").max(160).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .refine(
    (body) =>
      body.firstName !== undefined ||
      body.lastName !== undefined ||
      body.fullName !== undefined ||
      body.email !== undefined ||
      body.phone !== undefined,
    { message: 'At least one field is required' },
  );
