import { describe, expect, it } from 'vitest';

import { PersonalWalletKind } from '../constants/enums.js';

import {
  DEFAULT_PERSONAL_CATEGORIES,
  DEFAULT_PERSONAL_SUBCATEGORIES,
  isDefaultPersonalCategoryName,
  PERSONAL_WALLET_KIND_ORDER,
} from './catalog.js';

describe('isDefaultPersonalCategoryName', () => {
  it('matches food regardless of case or apostrophes', () => {
    expect(isDefaultPersonalCategoryName('Oziq-ovqat')).toBe(true);
    expect(isDefaultPersonalCategoryName('oziq-ovqat')).toBe(true);
    expect(isDefaultPersonalCategoryName("Qo'shimcha")).toBe(true);
  });

  it('does not treat wallet names as categories', () => {
    expect(isDefaultPersonalCategoryName('Naqd')).toBe(false);
    expect(isDefaultPersonalCategoryName('Uzcard')).toBe(false);
  });

  it('lists every default category as a warning match', () => {
    for (const category of DEFAULT_PERSONAL_CATEGORIES) {
      expect(isDefaultPersonalCategoryName(category.name)).toBe(true);
    }
  });
});

describe('DEFAULT_PERSONAL_SUBCATEGORIES', () => {
  it('nests suggestions under existing parent keys only', () => {
    const parentKeys = new Set(DEFAULT_PERSONAL_CATEGORIES.map((item) => item.key));
    expect(DEFAULT_PERSONAL_SUBCATEGORIES.length).toBeGreaterThan(0);
    for (const child of DEFAULT_PERSONAL_SUBCATEGORIES) {
      expect(parentKeys.has(child.parentKey)).toBe(true);
      expect(child.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('PERSONAL_WALLET_KIND_ORDER', () => {
  it('covers every wallet kind once', () => {
    expect(new Set(PERSONAL_WALLET_KIND_ORDER).size).toBe(PERSONAL_WALLET_KIND_ORDER.length);
    expect(PERSONAL_WALLET_KIND_ORDER).toEqual(
      expect.arrayContaining(Object.values(PersonalWalletKind)),
    );
  });
});
