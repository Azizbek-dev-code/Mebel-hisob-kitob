import { PersonalCategoryKind, PersonalWalletKind } from '../constants/enums.js';

/** Seeded once per PERSONAL workspace. Never reuse store expense categories. */
export interface DefaultPersonalWallet {
  readonly key: string;
  readonly name: string;
  readonly kind: PersonalWalletKind;
}

export interface DefaultPersonalCategory {
  readonly key: string;
  readonly kind: PersonalCategoryKind;
  readonly name: string;
  readonly color: string;
}

export const DEFAULT_PERSONAL_WALLETS: readonly DefaultPersonalWallet[] = [
  { key: 'CASH', name: 'Naqd', kind: PersonalWalletKind.CASH },
];

export const DEFAULT_PERSONAL_CATEGORIES: readonly DefaultPersonalCategory[] = [
  { key: 'SALARY', kind: PersonalCategoryKind.INCOME, name: 'Ish haqi', color: 'indigo' },
  { key: 'EXTRA', kind: PersonalCategoryKind.INCOME, name: 'Qo‘shimcha', color: 'teal' },
  { key: 'INCOME_OTHER', kind: PersonalCategoryKind.INCOME, name: 'Boshqa daromad', color: 'slate' },
  { key: 'FOOD', kind: PersonalCategoryKind.EXPENSE, name: 'Oziq-ovqat', color: 'teal' },
  { key: 'TRANSPORT', kind: PersonalCategoryKind.EXPENSE, name: 'Transport', color: 'cyan' },
  { key: 'HOME', kind: PersonalCategoryKind.EXPENSE, name: 'Uy', color: 'violet' },
  { key: 'COMMUNICATION', kind: PersonalCategoryKind.EXPENSE, name: 'Aloqa', color: 'sky' },
  { key: 'HEALTH', kind: PersonalCategoryKind.EXPENSE, name: 'Salomatlik', color: 'rose' },
  { key: 'EXPENSE_OTHER', kind: PersonalCategoryKind.EXPENSE, name: 'Boshqa xarajat', color: 'slate' },
];

/** Display order for kind chips. Does not change the Prisma enum order. */
export const PERSONAL_WALLET_KIND_ORDER: readonly PersonalWalletKind[] = [
  PersonalWalletKind.CASH,
  PersonalWalletKind.CARD,
  PersonalWalletKind.UZCARD,
  PersonalWalletKind.HUMO,
  PersonalWalletKind.PAYME,
  PersonalWalletKind.CLICK,
  PersonalWalletKind.BANK,
  PersonalWalletKind.SAVINGS,
  PersonalWalletKind.OTHER,
];

function foldPersonalName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''`‘’ʻʼ]/g, '');
}

/** True when a wallet name matches a default category (e.g. "Oziq-ovqat"). Warn, do not delete. */
export function isDefaultPersonalCategoryName(name: string): boolean {
  const folded = foldPersonalName(name);
  if (!folded) return false;
  return DEFAULT_PERSONAL_CATEGORIES.some((category) => foldPersonalName(category.name) === folded);
}
