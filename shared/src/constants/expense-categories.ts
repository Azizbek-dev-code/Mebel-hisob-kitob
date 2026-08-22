/**
 * Expense categories are database rows (stores may add their own), but every new
 * store is seeded with this set so reports have meaningful groupings on day one.
 */
export interface DefaultExpenseCategory {
  /** Stable key used by the seed script; never shown to the user. */
  readonly key: string;
  readonly name: string;
  /** Tailwind-safe token resolved by the UI badge palette. */
  readonly color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultExpenseCategory[] = [
  { key: 'ELECTRICITY', name: 'Elektr', color: 'amber' },
  { key: 'GAS', name: 'Gaz', color: 'orange' },
  { key: 'RENT', name: 'Ijara', color: 'violet' },
  { key: 'TRANSPORT', name: 'Transport', color: 'cyan' },
  { key: 'DELIVERY', name: 'Yetkazib berish', color: 'blue' },
  { key: 'INSTALLER', name: "O'rnatish", color: 'teal' },
  { key: 'MASTER', name: 'Usta', color: 'emerald' },
  { key: 'EMPLOYEE', name: 'Ishchi', color: 'indigo' },
  { key: 'ADVERTISING', name: 'Reklama', color: 'pink' },
  { key: 'PHONE_INTERNET', name: 'Telefon / Internet', color: 'sky' },
  { key: 'MATERIAL', name: 'Material', color: 'stone' },
  { key: 'REPAIR', name: "Ta'mirlash", color: 'rose' },
  { key: 'OTHER', name: 'Boshqa', color: 'slate' },
] as const;
