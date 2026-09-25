import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/lib/api-client';

import {
  composerError,
  validateTelegramComposerFields,
  type TelegramComposerValue,
} from './TelegramComposer';

const empty: TelegramComposerValue = {
  text: '',
  imageUrl: '',
  buttonText: '',
  buttonUrl: '',
};

describe('validateTelegramComposerFields', () => {
  it('allows text-only content with empty optional fields', () => {
    expect(validateTelegramComposerFields({ ...empty, text: 'Salom' })).toBeNull();
  });

  it('requires button URL when button text is set', () => {
    expect(
      validateTelegramComposerFields({ ...empty, text: 'Salom', buttonText: 'Kirish' }),
    ).toMatch(/Tugma URL/i);
  });

  it('rejects an invalid button URL format', () => {
    expect(
      validateTelegramComposerFields({
        ...empty,
        text: 'Salom',
        buttonText: 'Kirish',
        buttonUrl: 'bad',
      }),
    ).toMatch(/https:\/\/balancy\.space/);
  });
});

describe('composerError', () => {
  it('surfaces field-level validation details instead of the generic message', () => {
    const error = new ApiClientError(422, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'imageUrl', message: 'Expected string, received null' },
      { field: 'buttonUrl', message: 'Tugma URL noto‘g‘ri' },
    ]);
    expect(composerError(error, 'fallback')).toBe(
      'Expected string, received null; Tugma URL noto‘g‘ri',
    );
  });
});
