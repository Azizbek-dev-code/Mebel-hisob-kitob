import { isNormalizedUzMobile, normalizeUzPhone } from '../utils/phone.js';
import { isUzbekistanRegion } from '../constants/regions.js';
import { isBusinessType } from '../constants/enums.js';

/** Matches the worker-account password policy already used by the API. */
export const STORE_CREATION_PASSWORD_MIN = 8;
export const STORE_CREATION_PASSWORD_MAX = 128;

export const STORE_CREATION_USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export interface StoreCreationFieldError {
  field: string;
  message: string;
}

export interface StoreCreationDraft {
  applicantFirstName: string;
  applicantLastName: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  passwordConfirmation: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
}

export interface AuthenticatedBusinessRequestDraft {
  phone: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
  businessType: string;
}

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function applicantFullName(firstName: string, lastName: string): string {
  return `${normalizePersonName(firstName)} ${normalizePersonName(lastName)}`.trim();
}

export function normalizeStoreName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Field-level checks shared by the public form and the API.
 *
 * Password confirmation is validated here so a mismatch never reaches hashing.
 * Duplicate pending-request rules live on the server — they need the database.
 */
export function validateStoreCreationDraft(input: StoreCreationDraft): StoreCreationFieldError[] {
  const errors: StoreCreationFieldError[] = [];

  const firstName = normalizePersonName(input.applicantFirstName);
  if (!firstName) {
    errors.push({ field: 'applicantFirstName', message: 'Ismni kiriting' });
  } else if (firstName.length > 80) {
    errors.push({ field: 'applicantFirstName', message: "Ism juda uzun" });
  }

  const lastName = normalizePersonName(input.applicantLastName);
  if (!lastName) {
    errors.push({ field: 'applicantLastName', message: 'Familiyani kiriting' });
  } else if (lastName.length > 80) {
    errors.push({ field: 'applicantLastName', message: "Familiya juda uzun" });
  }

  const phone = normalizeUzPhone(input.phone);
  if (!input.phone.trim()) {
    errors.push({ field: 'phone', message: 'Telefon raqamini kiriting' });
  } else if (!isNormalizedUzMobile(phone)) {
    errors.push({
      field: 'phone',
      message: "O'zbekiston mobil raqamini kiriting (+998 XX XXX XX XX)",
    });
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    errors.push({ field: 'email', message: 'Emailni kiriting' });
  } else if (!EMAIL_PATTERN.test(email) || email.length > 160) {
    errors.push({ field: 'email', message: "To'g'ri email kiriting" });
  }

  const username = normalizeUsername(input.username);
  if (!username) {
    errors.push({ field: 'username', message: 'Loginni kiriting' });
  } else if (username.length < 3 || username.length > 40) {
    errors.push({ field: 'username', message: "Login 3–40 belgidan iborat bo'lishi kerak" });
  } else if (!STORE_CREATION_USERNAME_PATTERN.test(username)) {
    errors.push({
      field: 'username',
      message: "Login faqat harf, raqam, nuqta, pastki chiziq va chiziqcha bo'lishi mumkin",
    });
  }

  if (!input.password) {
    errors.push({ field: 'password', message: 'Parolni kiriting' });
  } else if (
    input.password.length < STORE_CREATION_PASSWORD_MIN ||
    input.password.length > STORE_CREATION_PASSWORD_MAX
  ) {
    errors.push({
      field: 'password',
      message: `Parol kamida ${STORE_CREATION_PASSWORD_MIN} belgidan iborat bo'lishi kerak`,
    });
  }

  if (!input.passwordConfirmation) {
    errors.push({ field: 'passwordConfirmation', message: 'Parolni tasdiqlang' });
  } else if (input.password !== input.passwordConfirmation) {
    errors.push({ field: 'passwordConfirmation', message: 'Parollar mos kelmadi' });
  }

  errors.push(...validateStoreLocationFields(input));

  return errors;
}

function validateStoreLocationFields(input: {
  storeName: string;
  region: string;
  district: string;
  address: string;
}): StoreCreationFieldError[] {
  const errors: StoreCreationFieldError[] = [];

  const storeName = normalizeStoreName(input.storeName);
  if (!storeName) {
    errors.push({ field: 'storeName', message: "Do'kon nomini kiriting" });
  } else if (storeName.length > 120) {
    errors.push({ field: 'storeName', message: "Do'kon nomi juda uzun" });
  }

  const region = input.region.trim();
  if (!region) {
    errors.push({ field: 'region', message: 'Viloyatni tanlang' });
  } else if (!isUzbekistanRegion(region)) {
    errors.push({ field: 'region', message: "Ro'yxatdagi viloyatni tanlang" });
  }

  const district = input.district.trim();
  if (!district) {
    errors.push({ field: 'district', message: 'Tuman yoki shaharni kiriting' });
  } else if (district.length > 80) {
    errors.push({ field: 'district', message: 'Tuman/shahar nomi juda uzun' });
  }

  const address = input.address.trim();
  if (!address) {
    errors.push({ field: 'address', message: 'Manzilni kiriting' });
  } else if (address.length > 240) {
    errors.push({ field: 'address', message: 'Manzil juda uzun' });
  }

  return errors;
}

function validatePhoneField(phoneRaw: string): StoreCreationFieldError[] {
  const errors: StoreCreationFieldError[] = [];
  const phone = normalizeUzPhone(phoneRaw);
  if (!phoneRaw.trim()) {
    errors.push({ field: 'phone', message: 'Telefon raqamini kiriting' });
  } else if (!isNormalizedUzMobile(phone)) {
    errors.push({
      field: 'phone',
      message: "O'zbekiston mobil raqamini kiriting (+998 XX XXX XX XX)",
    });
  }
  return errors;
}

/**
 * Store fields for a signed-in Identity. Name, email and password are taken from
 * the existing person record — they must not be collected again.
 */
export function validateAuthenticatedBusinessRequestDraft(
  input: AuthenticatedBusinessRequestDraft,
): StoreCreationFieldError[] {
  const errors: StoreCreationFieldError[] = [
    ...validatePhoneField(input.phone),
    ...validateStoreLocationFields(input),
  ];
  if (!isBusinessType(input.businessType)) {
    errors.push({ field: 'businessType', message: 'Biznes turini tanlang' });
  }
  return errors;
}

export function formatStoreCreationDate(iso: string, timeZone = 'Asia/Tashkent'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${day}.${month}.${year}`;
}
