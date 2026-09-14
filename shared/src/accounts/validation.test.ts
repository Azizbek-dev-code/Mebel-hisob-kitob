import { describe, expect, it } from 'vitest';

import {
  defaultPersonalWorkspaceName,
  validateCreatePersonalAccountDraft,
  validateRegisterPersonalAccountDraft,
} from './validation.js';

describe('defaultPersonalWorkspaceName', () => {
  it('builds the Uzbek personal-finance label from the full name', () => {
    expect(defaultPersonalWorkspaceName('Azizbek')).toBe("Azizbekning shaxsiy moliyasi");
  });

  it('falls back when the name is blank', () => {
    expect(defaultPersonalWorkspaceName('   ')).toBe('Shaxsiy moliya');
  });
});

describe('validateRegisterPersonalAccountDraft', () => {
  const valid = {
    firstName: 'Azizbek',
    lastName: 'Karimov',
    email: 'azizbek@example.com',
    password: 'Secret123',
    passwordConfirmation: 'Secret123',
  };

  it('accepts a complete draft', () => {
    expect(validateRegisterPersonalAccountDraft(valid)).toEqual([]);
  });

  it('rejects a password confirmation mismatch', () => {
    const errors = validateRegisterPersonalAccountDraft({
      ...valid,
      passwordConfirmation: 'other',
    });
    expect(errors).toContainEqual({
      field: 'passwordConfirmation',
      message: 'Parollar mos kelmadi',
    });
  });

  it('rejects a short password', () => {
    const errors = validateRegisterPersonalAccountDraft({
      ...valid,
      password: 'short',
      passwordConfirmation: 'short',
    });
    expect(errors.some((error) => error.field === 'password')).toBe(true);
  });
});

describe('validateCreatePersonalAccountDraft', () => {
  it('allows an omitted name', () => {
    expect(validateCreatePersonalAccountDraft({})).toEqual([]);
  });

  it('rejects an oversized name', () => {
    const errors = validateCreatePersonalAccountDraft({ name: 'x'.repeat(121) });
    expect(errors).toEqual([{ field: 'name', message: 'Hisob nomi juda uzun' }]);
  });
});
