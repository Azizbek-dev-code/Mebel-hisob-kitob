import { PersonalCategoryKind, PersonalWalletKind } from '../constants/enums.js';

import { PERSONAL_CATEGORY_ICON_BY_KEY } from './icons.js';

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
  readonly icon: string;
}

export const DEFAULT_PERSONAL_WALLETS: readonly DefaultPersonalWallet[] = [
  { key: 'CASH', name: 'Naqd', kind: PersonalWalletKind.CASH },
];

export const DEFAULT_PERSONAL_CATEGORIES: readonly DefaultPersonalCategory[] = [
  { key: 'SALARY', kind: PersonalCategoryKind.INCOME, name: 'Ish haqi', color: 'indigo', icon: PERSONAL_CATEGORY_ICON_BY_KEY.SALARY },
  { key: 'FREELANCE', kind: PersonalCategoryKind.INCOME, name: 'Freelance', color: 'teal', icon: PERSONAL_CATEGORY_ICON_BY_KEY.FREELANCE },
  { key: 'BUSINESS', kind: PersonalCategoryKind.INCOME, name: 'Biznes', color: 'violet', icon: PERSONAL_CATEGORY_ICON_BY_KEY.BUSINESS },
  { key: 'BONUS', kind: PersonalCategoryKind.INCOME, name: 'Bonus', color: 'amber', icon: PERSONAL_CATEGORY_ICON_BY_KEY.BONUS },
  { key: 'INVESTMENT', kind: PersonalCategoryKind.INCOME, name: 'Investitsiya', color: 'green', icon: PERSONAL_CATEGORY_ICON_BY_KEY.INVESTMENT },
  { key: 'EXTRA', kind: PersonalCategoryKind.INCOME, name: 'Qo‘shimcha', color: 'teal', icon: PERSONAL_CATEGORY_ICON_BY_KEY.EXTRA },
  { key: 'INCOME_OTHER', kind: PersonalCategoryKind.INCOME, name: 'Boshqa daromad', color: 'slate', icon: PERSONAL_CATEGORY_ICON_BY_KEY.INCOME_OTHER },
  { key: 'FOOD', kind: PersonalCategoryKind.EXPENSE, name: 'Oziq-ovqat', color: 'teal', icon: PERSONAL_CATEGORY_ICON_BY_KEY.FOOD },
  { key: 'TRANSPORT', kind: PersonalCategoryKind.EXPENSE, name: 'Transport', color: 'cyan', icon: PERSONAL_CATEGORY_ICON_BY_KEY.TRANSPORT },
  { key: 'HOME', kind: PersonalCategoryKind.EXPENSE, name: 'Uy', color: 'violet', icon: PERSONAL_CATEGORY_ICON_BY_KEY.HOME },
  { key: 'COMMUNICATION', kind: PersonalCategoryKind.EXPENSE, name: 'Aloqa', color: 'sky', icon: PERSONAL_CATEGORY_ICON_BY_KEY.COMMUNICATION },
  { key: 'SHOPPING', kind: PersonalCategoryKind.EXPENSE, name: 'Xarid', color: 'orange', icon: PERSONAL_CATEGORY_ICON_BY_KEY.SHOPPING },
  { key: 'HEALTH', kind: PersonalCategoryKind.EXPENSE, name: 'Salomatlik', color: 'rose', icon: PERSONAL_CATEGORY_ICON_BY_KEY.HEALTH },
  { key: 'EDUCATION', kind: PersonalCategoryKind.EXPENSE, name: 'Ta’lim', color: 'blue', icon: PERSONAL_CATEGORY_ICON_BY_KEY.EDUCATION },
  { key: 'FUN', kind: PersonalCategoryKind.EXPENSE, name: 'Ko‘ngilochar', color: 'pink', icon: PERSONAL_CATEGORY_ICON_BY_KEY.FUN },
  { key: 'EXPENSE_OTHER', kind: PersonalCategoryKind.EXPENSE, name: 'Boshqa xarajat', color: 'slate', icon: PERSONAL_CATEGORY_ICON_BY_KEY.EXPENSE_OTHER },
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

export interface DefaultPersonalSubcategory {
  readonly parentKey: string;
  readonly name: string;
}

/** Suggested children for the category form — not auto-inserted into existing workspaces. */
export const DEFAULT_PERSONAL_SUBCATEGORIES: readonly DefaultPersonalSubcategory[] = [
  { parentKey: 'FOOD', name: 'Kafe' },
  { parentKey: 'FOOD', name: 'Restoran' },
  { parentKey: 'FOOD', name: 'Market' },
  { parentKey: 'FOOD', name: 'Ovqatlanish (tashqarida)' },
  { parentKey: 'TRANSPORT', name: 'Taksi' },
  { parentKey: 'TRANSPORT', name: 'Jamoat transporti' },
  { parentKey: 'TRANSPORT', name: 'Yoqilg‘i' },
  { parentKey: 'TRANSPORT', name: 'Avto xizmat' },
  { parentKey: 'HOME', name: 'Kommunal' },
  { parentKey: 'HOME', name: 'Ijara' },
  { parentKey: 'HOME', name: 'Ta’mirlash' },
  { parentKey: 'SHOPPING', name: 'Kiyim' },
  { parentKey: 'SHOPPING', name: 'Elektronika' },
  { parentKey: 'HEALTH', name: 'Dorixona' },
  { parentKey: 'HEALTH', name: 'Shifokor' },
  { parentKey: 'FUN', name: 'Kino' },
  { parentKey: 'FUN', name: 'O‘yin' },
];
