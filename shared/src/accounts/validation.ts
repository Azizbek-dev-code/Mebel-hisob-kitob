import { applicantFullName, normalizeEmail, normalizePersonName } from '../store-creation/validation.js';

export const PERSONAL_PASSWORD_MIN = 8;
export const PERSONAL_PASSWORD_MAX = 128;
export const PERSONAL_NAME_MAX = 120;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PersonalFieldError {
  field: string;
  message: string;
}

export interface RegisterPersonalAccountDraft {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  name?: string;
}

export interface CreatePersonalAccountDraft {
  name?: string;
}

export function defaultPersonalWorkspaceName(fullName: string): string {
  const trimmed = normalizePersonName(fullName);
  if (!trimmed) return 'Shaxsiy moliya';
  return `${trimmed}ning shaxsiy moliyasi`;
}

export function validatePersonalWorkspaceName(name: string | undefined): PersonalFieldError[] {
  if (name == null) return [];
  const trimmed = name.trim();
  if (!trimmed) return [];
  if (trimmed.length > PERSONAL_NAME_MAX) {
    return [{ field: 'name', message: 'Hisob nomi juda uzun' }];
  }
  return [];
}

export function validateRegisterPersonalAccountDraft(
  input: RegisterPersonalAccountDraft,
): PersonalFieldError[] {
  const errors: PersonalFieldError[] = [];

  const firstName = normalizePersonName(input.firstName);
  if (!firstName) {
    errors.push({ field: 'firstName', message: 'Ismni kiriting' });
  } else if (firstName.length > 80) {
    errors.push({ field: 'firstName', message: 'Ism juda uzun' });
  }

  const lastName = normalizePersonName(input.lastName);
  if (!lastName) {
    errors.push({ field: 'lastName', message: 'Familiyani kiriting' });
  } else if (lastName.length > 80) {
    errors.push({ field: 'lastName', message: 'Familiya juda uzun' });
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    errors.push({ field: 'email', message: 'Emailni kiriting' });
  } else if (!EMAIL_PATTERN.test(email) || email.length > 160) {
    errors.push({ field: 'email', message: "To'g'ri email kiriting" });
  }

  if (!input.password) {
    errors.push({ field: 'password', message: 'Parolni kiriting' });
  } else if (
    input.password.length < PERSONAL_PASSWORD_MIN ||
    input.password.length > PERSONAL_PASSWORD_MAX
  ) {
    errors.push({
      field: 'password',
      message: `Parol kamida ${PERSONAL_PASSWORD_MIN} belgidan iborat bo'lishi kerak`,
    });
  }

  if (!input.passwordConfirmation) {
    errors.push({ field: 'passwordConfirmation', message: 'Parolni tasdiqlang' });
  } else if (input.password !== input.passwordConfirmation) {
    errors.push({ field: 'passwordConfirmation', message: 'Parollar mos kelmadi' });
  }

  errors.push(...validatePersonalWorkspaceName(input.name));

  return errors;
}

export function validateCreatePersonalAccountDraft(
  input: CreatePersonalAccountDraft,
): PersonalFieldError[] {
  return validatePersonalWorkspaceName(input.name);
}

export { applicantFullName, normalizeEmail, normalizePersonName };
